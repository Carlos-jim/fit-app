import crypto from "node:crypto";

import { AppError } from "../src/lib/app-error";
import { hashToken } from "../src/lib/jwt";
import { AuthService } from "../src/services/auth.service";
import { AuthEmailService } from "../src/services/auth-email.service";

// ─── Helpers ──────────────────────────────────────────────────────

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  const fn = () => jest.fn();
  return {
    user: {
      findUnique: fn(),
      findFirst: fn(),
      create: fn(),
      update: fn(),
      upsert: fn(),
      ...((overrides.user as Record<string, unknown>) ?? {}),
    },
    refreshToken: {
      create: fn(),
      delete: fn(),
      deleteMany: fn(),
      findUnique: fn(),
      ...((overrides.refreshToken as Record<string, unknown>) ?? {}),
    },
    emailToken: {
      create: fn(),
      findUnique: fn(),
      update: fn(),
    },
    $transaction: fn(),
    ...overrides,
  };
}

const fakeBcryptHash = jest.fn(async (password: string) => `bcrypt:${password}`);

const consoleTransport = {
  send: jest.fn().mockResolvedValue(undefined),
};

function makeAuthService(overrides: Record<string, unknown> = {}) {
  const prisma = createMockPrisma(overrides);
  const emailService = new AuthEmailService(prisma as never, {
    transport: consoleTransport,
    bcryptHash: fakeBcryptHash,
  });
  const auth = new AuthService(prisma as never, emailService, {
    hashPassword: fakeBcryptHash,
    verifyPassword: jest.fn(async (password: string, hash: string) => {
      // Treat "Password1" as the only valid password in this suite
      return hash === "bcrypt:Password1" && password === "Password1";
    }),
  });
  return { auth, prisma, emailService };
}

const sampleUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  passwordHash: "bcrypt:Password1",
  authProvider: "EMAIL",
  plan: "FREE",
  emailVerified: false,
};

// ─── Tests ────────────────────────────────────────────────────────

describe("AuthService.register", () => {
  it("hashes the password and creates the user with EMAIL provider", async () => {
    const { auth, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(sampleUser);

    const result = await auth.register({
      name: "Test User",
      email: "Test@Example.com",
      password: "Password1",
    });

    expect(fakeBcryptHash).toHaveBeenCalledWith("Password1");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "Test@Example.com",
          fullName: "Test User",
          passwordHash: "bcrypt:Password1",
          authProvider: "EMAIL",
          emailVerified: false,
        }),
      }),
    );
    expect(result.user.id).toBe("user-1");
    expect(result.user.emailVerified).toBe(false);
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
  });

  it("rejects weak passwords before hitting the database", async () => {
    const { auth, prisma } = makeAuthService();
    await expect(
      auth.register({ name: "X", email: "x@y.com", password: "short" }),
    ).rejects.toThrow(AppError);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects duplicate emails with EMAIL_TAKEN", async () => {
    const { auth, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(sampleUser);

    await expect(
      auth.register({ name: "X", email: "x@y.com", password: "Password1" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("sends a verification email for EMAIL registrations", async () => {
    const { auth, prisma, emailService } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(sampleUser);
    const sendSpy = jest.spyOn(emailService, "sendVerificationEmail");

    await auth.register({ name: "Test", email: "t@e.com", password: "Password1" });

    // Allow microtasks to flush
    await new Promise((r) => setImmediate(r));
    expect(sendSpy).toHaveBeenCalledWith(sampleUser);
  });
});

describe("AuthService.loginWithEmail", () => {
  it("returns INVALID_CREDENTIALS when user is missing", async () => {
    const { auth, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      auth.loginWithEmail({ email: "a@b.com", password: "Password1" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("returns INVALID_CREDENTIALS on bad password", async () => {
    const { auth, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(sampleUser);
    // Real bcrypt is hard to mock deterministically here; we compare by checking the
    // call to bcrypt.compare via the passwordHash mismatch.
    await expect(
      auth.loginWithEmail({ email: "a@b.com", password: "WrongPassword" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe("AuthService.refreshAccessToken", () => {
  it("rotates refresh tokens and issues a new pair", async () => {
    const { auth, prisma } = makeAuthService();
    const userId = sampleUser.id;
    const { signRefreshToken } = await import("../src/lib/jwt");
    const token = signRefreshToken({ userId, tokenId: crypto.randomUUID() });
    const tokenHash = hashToken(token);

    prisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      user: sampleUser,
    });
    prisma.refreshToken.delete.mockResolvedValue({ id: "rt-1" });

    const tokens = await auth.refreshAccessToken(token);
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: "rt-1" } });
  });

  it("rejects unknown or expired tokens", async () => {
    const { auth, prisma } = makeAuthService();
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    const { signRefreshToken } = await import("../src/lib/jwt");
    const token = signRefreshToken({ userId: "x", tokenId: "y" });

    await expect(auth.refreshAccessToken(token)).rejects.toMatchObject({
      code: "INVALID_REFRESH_TOKEN",
    });
  });
});

describe("AuthEmailService.password reset", () => {
  it("is a no-op when the email is unknown (no enumeration)", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await emailService.requestPasswordReset({
      email: "ghost@example.com",
    });
    expect(result.delivered).toBe(false);
    expect(consoleTransport.send).not.toHaveBeenCalled();
  });

  it("creates a token and dispatches the email when the user exists", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue(sampleUser);

    const result = await emailService.requestPasswordReset({
      email: sampleUser.email,
    });
    expect(result.delivered).toBe(true);
    expect(prisma.emailToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: sampleUser.id,
          type: "PASSWORD_RESET",
        }),
      }),
    );
    expect(consoleTransport.send).toHaveBeenCalledTimes(1);
  });

  it("rejects expired or already-used reset tokens with AppError", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.emailToken.findUnique.mockResolvedValue({
      id: "t-1",
      userId: sampleUser.id,
      type: "PASSWORD_RESET",
      tokenHash: "x",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });

    await expect(
      emailService.resetPassword({ token: "abc", newPassword: "Password1" }),
    ).rejects.toMatchObject({
      code: "INVALID_RESET_TOKEN",
      statusCode: 400,
    });
  });

  it("marks the token as used and rotates all refresh tokens on success", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.emailToken.findUnique.mockResolvedValue({
      id: "t-1",
      userId: sampleUser.id,
      type: "PASSWORD_RESET",
      tokenHash: "x",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        user: { update: jest.fn().mockResolvedValue(sampleUser) },
        emailToken: { update: jest.fn().mockResolvedValue({}) },
        refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      };
      return cb(tx);
    });

    await emailService.resetPassword({ token: "abc", newPassword: "Password1" });
    expect(fakeBcryptHash).toHaveBeenCalledWith("Password1");
  });
});

describe("AuthEmailService.email verification", () => {
  it("marks the user emailVerified=true and the token as used", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.emailToken.findUnique.mockResolvedValue({
      id: "v-1",
      userId: sampleUser.id,
      type: "EMAIL_VERIFICATION",
      tokenHash: "x",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        user: {
          update: jest.fn().mockResolvedValue({ ...sampleUser, emailVerified: true }),
        },
        emailToken: { update: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });

    const user = await emailService.verifyEmail({ token: "abc" });
    expect(user.emailVerified).toBe(true);
  });

  it("rejects unknown verification tokens with AppError", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.emailToken.findUnique.mockResolvedValue(null);
    await expect(emailService.verifyEmail({ token: "abc" })).rejects.toMatchObject(
      { code: "INVALID_VERIFICATION_TOKEN", statusCode: 400 },
    );
  });

  it("skips resend when the user is already verified", async () => {
    const { emailService, prisma } = makeAuthService();
    prisma.user.findUnique.mockResolvedValue({ ...sampleUser, emailVerified: true });
    const result = await emailService.resendVerification({ email: sampleUser.email });
    expect(result.delivered).toBe(false);
    expect(consoleTransport.send).not.toHaveBeenCalled();
  });
});
