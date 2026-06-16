import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      new AppError("Authentication required.", {
        statusCode: 401,
        code: "UNAUTHORIZED",
      }),
    );
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    next(
      new AppError("Invalid or expired access token.", {
        statusCode: 401,
        code: "INVALID_TOKEN",
      }),
    );
  }
}

export function authorizeResource(
  resourceUserId: string,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required.", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        }),
      );
    }
    if (req.user.id !== resourceUserId) {
      return next(
        new AppError("Forbidden.", {
          statusCode: 403,
          code: "FORBIDDEN",
        }),
      );
    }
    next();
  };
}
