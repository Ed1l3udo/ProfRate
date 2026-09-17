import { and, eq, gt, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { loginAttempts, passwordResetTokens, users } from "../../db/schema.js";

const TEN_MINUTES = 10 * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

export function createAuthSecurityRepository(db: Database, now: () => Date = () => new Date()) {
  async function isLoginLocked(email: string) {
    const row = (await db.select({ lockedUntil: loginAttempts.lockedUntil }).from(loginAttempts).where(eq(loginAttempts.email, email)).limit(1)).at(0);
    return row?.lockedUntil !== null && row?.lockedUntil !== undefined && row.lockedUntil > now();
  }
  async function registerLoginFailure(email: string) {
    const current = now();
    await db.transaction(async (tx) => {
      const row = (await tx.select().from(loginAttempts).where(eq(loginAttempts.email, email)).for("update").limit(1)).at(0);
      if (!row || current.getTime() - row.windowStartedAt.getTime() > TEN_MINUTES) {
        await tx.insert(loginAttempts).values({ email, failedCount: 1, windowStartedAt: current, lockedUntil: null, updatedAt: current }).onConflictDoUpdate({ target: loginAttempts.email, set: { failedCount: 1, windowStartedAt: current, lockedUntil: null, updatedAt: current } });
        return;
      }
      const failedCount = row.failedCount + 1;
      await tx.update(loginAttempts).set({ failedCount, lockedUntil: failedCount >= 5 ? new Date(current.getTime() + FIFTEEN_MINUTES) : row.lockedUntil, updatedAt: current }).where(eq(loginAttempts.email, email));
    });
  }
  async function clearLoginFailures(email: string) { await db.delete(loginAttempts).where(eq(loginAttempts.email, email)); }
  async function createResetToken(userId: number, tokenHash: string) {
    const current = now();
    await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, userId), gt(passwordResetTokens.expiresAt, current)));
    await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt: new Date(current.getTime() + 60 * 60 * 1000) });
  }
  async function consumeResetToken(tokenHash: string, passwordHash: string) {
    return db.transaction(async (tx) => {
      const token = (await tx.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, now()), sql`${passwordResetTokens.usedAt} is null`)).for("update").limit(1)).at(0);
      if (!token) return false;
      await tx.update(users).set({ passwordHash, updatedAt: sql`now()` }).where(eq(users.id, token.userId));
      await tx.update(passwordResetTokens).set({ usedAt: now() }).where(eq(passwordResetTokens.id, token.id));
      return true;
    });
  }
  async function changePassword(userId: number, passwordHash: string) { await db.update(users).set({ passwordHash, updatedAt: sql`now()` }).where(eq(users.id, userId)); }
  async function deleteAccount(userId: number) {
    await db.transaction(async (tx) => {
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
      await tx.delete(loginAttempts).where(sql`lower(${loginAttempts.email}) = (select ${users.email} from ${users} where ${users.id} = ${userId})`);
      await tx.delete(users).where(eq(users.id, userId));
    });
  }
  return { isLoginLocked, registerLoginFailure, clearLoginFailures, createResetToken, consumeResetToken, changePassword, deleteAccount };
}
export type AuthSecurityRepository = ReturnType<typeof createAuthSecurityRepository>;
