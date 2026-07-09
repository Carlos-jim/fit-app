import { type PrismaClient, AuthProvider, type User } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

import { AppError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import {
  generateRefreshTokenId,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { type AuthEmailService } from "./auth-email.service.js";

const SALT_ROUNDS = 10;
const googleClient = new OAuth2Client();

const log = logger.child("auth-service");

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    fullName: string | null;
    plan: string;
  };
  tokens: AuthTokens;
}

export interface AuthServiceDeps {
  hashPassword?: (password: string) => Promise<string>;
  verifyPassword?: (password: string, hash: string) => Promise<boolean>;
}

const defaultBcryptDeps: Required<AuthServiceDeps> = {
  hashPassword: async (password: string) => {
    const bcrypt = await import("bcrypt");
    return bcrypt.hash(password, SALT_ROUNDS);
  },
  verifyPassword: async (password: string, hash: string) => {
    const bcrypt = await import("bcrypt");
    return bcrypt.compare(password, hash);
  },
};

export class AuthService {
  private hashPassword: (password: string) => Promise<string>;
  private verifyPassword: (password: string, hash: string) => Promise<boolean>;

  constructor(
    private prisma: PrismaClient,
    private emailService?: AuthEmailService,
    deps: AuthServiceDeps = {},
  ) {
    this.hashPassword = deps.hashPassword ?? defaultBcryptDeps.hashPassword;
    this.verifyPassword =
      deps.verifyPassword ?? defaultBcryptDeps.verifyPassword;
  }

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

    const passwordHash = await this.hashPassword(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.name,
        passwordHash,
        authProvider: AuthProvider.EMAIL,
        emailVerified: false,
      },
    });

    if (this.emailService) {
      try {
        await this.emailService.sendVerificationEmail(user);
      } catch (error) {
        logger
          .child("auth-service")
          .error("Failed to send verification email", { userId: user.id, error });
      }
    }

    return await this.createSession(user);
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

    const valid = await this.verifyPassword(input.password, user.passwordHash);

    if (!valid) {
      throw new AppError("Invalid email or password.", {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    return await this.createSession(user);
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
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!user.emailVerified) {
      // Google has already verified the email, so backfill the flag.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
    }

    return await this.createSession(user);
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

    const session = await this.createSession(stored.user);
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

  private async createSession(user: User): Promise<AuthResponse> {
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
    });

    const tokenId = generateRefreshTokenId();
    const refreshToken = signRefreshToken({
      userId: user.id,
      tokenId,
    });

    // Compute the refresh-token expiry in seconds so sub-day durations
    // (e.g. "1h", "30m") aren't rounded up to a full day the way the
    // previous `durationToDays` helper did.
    const expiresAt = new Date(
      Date.now() + durationToSeconds(env.JWT_REFRESH_EXPIRES_IN || "7d") * 1000,
    );

    try {
      await this.prisma.refreshToken.create({
        data: {
          tokenHash: hashToken(refreshToken),
          userId: user.id,
          expiresAt,
        },
      });
    } catch (error) {
      log.error("Failed to persist refresh token; rolling back session", {
        userId: user.id,
        error,
      });
      throw new AppError("Failed to start session. Please try again.", {
        statusCode: 500,
        code: "SESSION_PERSIST_FAILED",
        cause: error,
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
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

/**
 * Parse a duration string like "15m", "1h", "7d", "30s" into seconds.
 * Falls back to 7 days for malformed input (matches the prior behaviour).
 */
function durationToSeconds(time: string): number {
  const match = /^(\d+)\s*([dhms])$/i.exec(time.trim());
  if (!match) return 7 * 24 * 60 * 60;

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60;
    case "h":
      return value * 60 * 60;
    case "m":
      return value * 60;
    case "s":
      return value;
    default:
      return 7 * 24 * 60 * 60;
  }
}
