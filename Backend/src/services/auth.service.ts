import * as bcrypt from "bcrypt";
import { type PrismaClient, AuthProvider } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

import { AppError } from "../lib/app-error.js";
import { env } from "../config/env.js";

const SALT_ROUNDS = 10;
const googleClient = new OAuth2Client();


export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(input: { name: string; email: string; password: string }) {
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

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
    };
  }

  async loginWithEmail(input: { email: string; password: string }) {
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

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
    };
  }

  async loginWithGoogle(input: {
    idToken: string;
  }) {
    let email: string;
    let name: string;
    let googleId: string;

    const audiences = env.GOOGLE_CLIENT_IDS.split(",").map((s) => s.trim()).filter(Boolean);

    if (audiences.length === 0) {
      console.warn("GOOGLE_CLIENT_IDS not configured. Using placeholder user for Google Login.");
      email = "google-user@example.com";
      name = "Google User";
      googleId = "google-placeholder";
    } else {
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
        email = payload.email;
        name = payload.name || payload.given_name || "Google User";
        googleId = payload.sub;
      } catch (error) {
        console.error("Error verifying Google token:", error);
        throw new AppError("Failed to verify Google token.", {
          statusCode: 401,
          code: "INVALID_GOOGLE_TOKEN",
        });
      }
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

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      plan: user.plan,
    };
  }
}
