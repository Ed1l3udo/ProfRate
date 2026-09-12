import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

const TOKEN_LIFETIME = "7d";
const tokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["student", "moderator"]),
});

export type AuthIdentity = z.infer<typeof tokenPayloadSchema>;

export function createTokenService(secret: string) {
  if (secret.trim().length < 32) {
    throw new Error("AUTH_JWT_SECRET must contain at least 32 characters.");
  }

  const key = new TextEncoder().encode(secret);

  async function signToken(identity: AuthIdentity) {
    return new SignJWT(identity)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(TOKEN_LIFETIME)
      .sign(key);
  }

  async function verifyToken(token: string) {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return tokenPayloadSchema.parse(payload);
  }

  return { signToken, verifyToken };
}

export type TokenService = ReturnType<typeof createTokenService>;
