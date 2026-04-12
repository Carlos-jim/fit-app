import * as bcrypt from "bcrypt";
import { type PrismaClient, AuthProvider } from "@prisma/client";

import { AppError } from "../lib/app-error.js";

const SALT_ROUNDS = 10;

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
    };
  }

  async loginWithGoogle(input: { googleId: string; email: string; name: string; picture?: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          fullName: input.name,
          authProvider: AuthProvider.GOOGLE,
        },
      });
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  }
}
