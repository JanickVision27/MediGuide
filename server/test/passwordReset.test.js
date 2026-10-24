import assert from "node:assert/strict";
import test from "node:test";

import {
  completePasswordReset,
  createPasswordResetToken,
  hashPasswordResetToken,
} from "../src/services/passwordResetService.js";

function fakeUserModel({ tokenHash, expiresAt }) {
  const state = { tokenHash, expiresAt, passwordHash: "old-hash" };
  return {
    state,
    async findOneAndUpdate(filter, update) {
      const tokenMatches = state.tokenHash === filter.passwordResetTokenHash;
      const expiryMatches = state.expiresAt > filter.passwordResetExpiresAt.$gt;
      if (!tokenMatches || !expiryMatches) return null;
      Object.assign(state, update.$set);
      state.tokenHash = state.passwordResetTokenHash;
      state.expiresAt = state.passwordResetExpiresAt;
      return state;
    },
  };
}

test("reset tokens are random, URL-safe and stored as a one-way hash", () => {
  const first = createPasswordResetToken();
  const second = createPasswordResetToken();
  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashPasswordResetToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
});

test("invalid, expired, and previously used tokens cannot reset a password", async () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const token = createPasswordResetToken();
  const invalid = fakeUserModel({ tokenHash: "another-hash", expiresAt: new Date(now.getTime() + 1000) });
  assert.equal(await completePasswordReset({ UserModel: invalid, token: token.token, password: "new-password-123", now }), null);

  const expired = fakeUserModel({ tokenHash: token.tokenHash, expiresAt: new Date(now.getTime() - 1) });
  assert.equal(await completePasswordReset({ UserModel: expired, token: token.token, password: "new-password-123", now }), null);

  const reusable = fakeUserModel({ tokenHash: token.tokenHash, expiresAt: new Date(now.getTime() + 1000) });
  const firstUse = await completePasswordReset({ UserModel: reusable, token: token.token, password: "new-password-123", now });
  assert.ok(firstUse);
  assert.equal(reusable.state.passwordResetTokenHash, null);
  assert.equal(await completePasswordReset({ UserModel: reusable, token: token.token, password: "another-password-123", now }), null);
});
