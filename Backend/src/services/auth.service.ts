import * as bcrypt from "bcrypt";
import { type PrismaClient, AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

import { AppError } from "../lib/app-error.js";
import { env } from "../config/env.js";
import {
  generateRefreshTokenId,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";

const SALT_ROUNDS = 10;
const googleClient = new OAuth2Client();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    plan: string;
  };
  tokens: AuthTokens;
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  validatePassword(password: string): void {
    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters long.", {
        statusCode: 400,
        code: "WEAK_PASSWORD",
      });
    }

    if (!/[A-Z]/.test(password)) {
      throw new AppError("Password must contain at least one uppercase letter.", {
        statusCode: 400,
        code: "WEAK_PASSWORD",
      });
    }

    if (!/[a-z]/.test(password)) {
      throw new AppError("Password must contain at least one lowercase letter.", {
        statusCode: 400,
        code: "WEAK_PASSWORD",
      });
    }

    if (!/[0-9]/.test(password)) {
      throw new AppError("Password must contain at least one number.", {
        statusCode: 400,
        code: "WEAK_PASSWORD",
      });
    }
  }

  async register(input: { name: string; email: string; password: string }): Promise<AuthResponse> {
    this.validatePassword(input.password);

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError("Email already registered.", {
        statusCode: 409,
        code: "EMAIL_TAKEN",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.name,
        passwordHash,
        authProvider: AuthProvider.EMAIL,
      },
    });

    return this.createSession(user);
  }

  async loginWithEmail(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password.", {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);

    if (!valid) {
      throw new AppError("Invalid email or password.", {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    return this.createSession(user);
  }

  async loginWithGoogle(input: { idToken: string }): Promise<AuthResponse> {
    const audiences = env.GOOGLE_CLIENT_IDS
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (audiences.length === 0) {
      throw new AppError("Google OAuth is not configured.", {
        statusCode: 503,
        code: "GOOGLE_AUTH_NOT_CONFIGURED",
      });
    }

    let email: string;
    let name: string;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: audiences,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new AppError("Invalid Google token payload.", {
          statusCode: 401,
          code: "INVALID_GOOGLE_TOKEN",
        });
      }
      if (!payload.email_verified) {
        throw new AppError("Google account email is not verified.", {
          statusCode: 401,
          code: "UNVERIFIED_GOOGLE_EMAIL",
        });
      }
      email = payload.email;
      name = payload.name || payload.given_name || "Google User";
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to verify Google token.", {
        statusCode: 401,
        code: "INVALID_GOOGLE_TOKEN",
      });
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: name,
          authProvider: AuthProvider.GOOGLE,
        },
      });
    }

    return this.createSession(user);
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    let payload: ReturnType<typeof verifyRefreshToken>;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError("Invalid or expired refresh token.", {
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || stored.userId !== payload.userId) {
      throw new AppError("Invalid or expired refresh token.", {
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const session = this.createSession(stored.user);
    return session.tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const tokenHash = hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    } catch {
      // Ignore errors during logout
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private createSession(user: {
    id: string;
    email: string;
    fullName: string | null;
    plan: string;
  }): AuthResponse {
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    const tokenId = generateRefreshTokenId();
    const refreshToken = signRefreshToken({
      userId: user.id,
      tokenId,
    });

    const refreshExpiresInDays = Math.max(
      1,
      durationToDays(env.JWT_REFRESH_EXPIRES_IN || "7d"),
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiresInDays);

    void this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}

function durationToDays(time: string): number {
  const match = time.match(/^(\d+)\s*([dhms])$/i);
  if (!match) return 7;

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();

  switch (unit) {
    case "d":
      return value;
    case "h":
      return value / 24;
    case "m":
      return value / (24 * 60);
    case "s":
      return value / (24 * 60 * 60);
    default:
      return 7;
  }
}
