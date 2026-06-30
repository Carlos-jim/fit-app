import crypto from "node:crypto";
import { type PrismaClient, type User } from "@prisma/client";

import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { hashToken } from "../lib/jwt.js";
import {
  type EmailMessage,
  type EmailTransport,
  createEmailTransport,
  renderEmailShell,
} from "./email.service.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface RequestPasswordResetInput {
  email: string;
}

export interface RequestPasswordResetResult {
  delivered: boolean;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResendVerificationInput {
  email: string;
}

/**
 * Auth-email service.
 *
 * SOLID notes
 * ───────────
 * • SRP — owns password-reset & email-verification flows. Does not
 *   know about HTTP routing; callers translate {@link AppError} into
 *   responses.
 * • LSP — every public method throws {@link AppError} for failures, so
 *   callers can catch by type instead of string-matching error messages.
 *   Subclasses (test fakes) honour the same contract.
 * • DIP — {@link EmailTransport} is injected, allowing a console
 *   transport for dev/tests and a Resend transport for prod without
 *   touching this file.
 */
export class AuthEmailService {
  private transport: EmailTransport;
  private bcryptHash: (password: string) => Promise<string>;

  constructor(
    private prisma: PrismaClient,
    opts?: {
      transport?: EmailTransport;
      bcryptHash?: (password: string) => Promise<string>;
    },
  ) {
    this.transport = opts?.transport ?? createEmailTransport();
    this.bcryptHash =
      opts?.bcryptHash ??
      (async (password: string) => {
        const bcrypt = await import("bcrypt");
        return bcrypt.hash(password, 10);
      });
  }

  async requestPasswordReset(
    input: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      // Don't leak which accounts exist.
      return { delivered: false };
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.emailToken.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET",
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const shell = renderEmailShell({
      title: "Restablece tu contraseña",
      body: `Recibimos una solicitud para cambiar la contraseña de tu cuenta en Bioma. Si fuiste tú, usa el botón para definir una nueva. El enlace caduca en 1 hora.`,
      ctaUrl: resetUrl,
      ctaLabel: "Crear nueva contraseña",
    });

    await this.transport.send({
      to: user.email,
      subject: "Restablece tu contraseña de Bioma",
      text: shell.text,
      html: shell.html,
    });
    return { delivered: true };
  }

  async resetPassword(input: ResetPasswordInput): Promise<User> {
    const tokenHash = hashToken(input.token);
    const record = await this.prisma.emailToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.type !== "PASSWORD_RESET" ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new AppError("Reset link is invalid or has expired.", {
        statusCode: 400,
        code: "INVALID_RESET_TOKEN",
      });
    }

    const passwordHash = await this.bcryptHash(input.newPassword);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      await tx.emailToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      await tx.refreshToken.deleteMany({ where: { userId: record.userId } });
      return user;
    });
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await this.prisma.emailToken.create({
      data: {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        tokenHash,
        expiresAt,
      },
    });

    const verifyUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(rawToken)}`;

    const shell = renderEmailShell({
      title: "Confirma tu correo en Bioma",
      body: `Hola${user.fullName ? ` ${user.fullName.split(" ")[0]}` : ""}, confirma tu correo para activar tu cuenta. El enlace caduca en 24 horas.`,
      ctaUrl: verifyUrl,
      ctaLabel: "Confirmar mi correo",
    });

    await this.transport.send({
      to: user.email,
      subject: "Confirma tu correo en Bioma",
      text: shell.text,
      html: shell.html,
    });
  }

  async verifyEmail(input: VerifyEmailInput): Promise<User> {
    const tokenHash = hashToken(input.token);
    const record = await this.prisma.emailToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.type !== "EMAIL_VERIFICATION" ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      throw new AppError("Verification link is invalid or has expired.", {
        statusCode: 400,
        code: "INVALID_VERIFICATION_TOKEN",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
      await tx.emailToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return user;
    });
  }

  async resendVerification(
    input: ResendVerificationInput,
  ): Promise<{ delivered: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || user.emailVerified) {
      return { delivered: false };
    }
    await this.sendVerificationEmail(user);
    return { delivered: true };
  }
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}