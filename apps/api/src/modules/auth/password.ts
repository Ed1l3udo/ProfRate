import bcrypt from "bcrypt";

const PASSWORD_COST = 12;
export const DUMMY_PASSWORD_HASH =
  "$2b$12$.EGqozv5E6cMRfuMvZbYo.Fx3YI4cBnC1tX/ru1uuCPlM1a/MXmP.";

export function createPasswordService() {
  async function hashPassword(password: string) {
    return bcrypt.hash(password, PASSWORD_COST);
  }

  async function verifyPassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }

  return { hashPassword, verifyPassword };
}

export type PasswordService = ReturnType<typeof createPasswordService>;
