import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;
export const PASSWORD_HASH_ROUNDS = 12;

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function completePasswordReset({ UserModel, token, password, now = new Date() }) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  return UserModel.findOneAndUpdate(
    {
      passwordResetTokenHash: hashPasswordResetToken(token),
      passwordResetExpiresAt: { $gt: now },
    },
    { $set: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null } },
    { new: true, runValidators: true },
  );
}
