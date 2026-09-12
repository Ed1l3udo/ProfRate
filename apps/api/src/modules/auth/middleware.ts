import type { RequestHandler, Response } from "express";

import type { TokenService } from "./token.js";
import type { UserRecord, UsersRepository } from "../users/repository.js";

export const authenticationRequiredError = {
  code: "AUTHENTICATION_REQUIRED",
  message: "Authentication is required.",
};

export const invalidAuthTokenError = {
  code: "INVALID_AUTH_TOKEN",
  message: "Bearer token is invalid or expired.",
};

export const userBlockedError = {
  code: "USER_BLOCKED",
  message: "User is blocked.",
};

export const studentRequiredError = {
  code: "STUDENT_REQUIRED",
  message: "A student account is required.",
};

export function authenticatedUser(response: Response): UserRecord {
  return response.locals.authUser as UserRecord;
}

export function createAuthenticationMiddleware({
  findUserById,
  verifyToken,
}: {
  findUserById: UsersRepository["findUserById"];
  verifyToken: TokenService["verifyToken"];
}) {
  function authenticate(required: boolean): RequestHandler {
    return async (request, response, next) => {
      const authorization = request.header("authorization");

      if (authorization === undefined) {
        if (required) response.status(401).json({ error: authenticationRequiredError });
        else next();
        return;
      }

      const match = /^Bearer\s+(\S+)$/i.exec(authorization);
      if (match === null) {
        response.status(401).json({ error: invalidAuthTokenError });
        return;
      }

      try {
        const identity = await verifyToken(match[1]);
        const user = await findUserById(identity.userId);

        if (user === undefined || user.role !== identity.role) {
          response.status(401).json({ error: invalidAuthTokenError });
          return;
        }

        if (!user.active) {
          response.status(403).json({ error: userBlockedError });
          return;
        }

        response.locals.authUser = user;
        next();
      } catch {
        response.status(401).json({ error: invalidAuthTokenError });
      }
    };
  }

  const optionalAuthentication = authenticate(false);
  const requireAuthentication = authenticate(true);
  const requireStudent: RequestHandler = (_request, response, next) => {
    if (authenticatedUser(response).role !== "student") {
      response.status(403).json({ error: studentRequiredError });
      return;
    }

    next();
  };

  return { optionalAuthentication, requireAuthentication, requireStudent };
}
