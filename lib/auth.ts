import { randomBytes } from "node:crypto";
import { getDb, type Actor } from "./db";
import { tokenHash, verifyPassword, hashPassword } from "./password";
const dummyHash = hashPassword("UnknownAccountComparisonOnly");
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function login(email: string, password: string) {
  const db = await getDb();
  const key = tokenHash(email.toLowerCase());
  const blocked = await db.query<{ blocked: boolean }>(
    "SELECT blocked_until>CURRENT_TIMESTAMP AS blocked FROM app_login_attempts WHERE attempt_key=$1",
    [key],
  );
  if (blocked.rows[0]?.blocked)
    throw new AppError(429, "Too many attempts. Try again in 15 minutes.");
  const result = await db.query<Actor & { password_hash: string }>(
    "SELECT u.user_id,u.full_name,u.email,u.password_hash,r.role_name FROM users u JOIN roles r USING(role_id) WHERE LOWER(u.email)=$1 AND u.status='active'",
    [email.toLowerCase()],
  );
  const user = result.rows[0];
  // Dummy hash comparison avoids an immediate response for unknown accounts.
  const valid = verifyPassword(password, user?.password_hash || dummyHash);
  if (!user || !valid) {
    await db.query(
      "INSERT INTO app_login_attempts(attempt_key,failures) VALUES($1,1) ON CONFLICT(attempt_key) DO UPDATE SET failures=app_login_attempts.failures+1,blocked_until=CASE WHEN app_login_attempts.failures>=4 THEN CURRENT_TIMESTAMP+INTERVAL '15 minutes' ELSE NULL END",
      [key],
    );
    throw new AppError(401, "Invalid email or password");
  }
  await db.query("DELETE FROM app_login_attempts WHERE attempt_key=$1", [key]);
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO app_sessions VALUES($1,$2,CURRENT_TIMESTAMP+INTERVAL '8 hours')",
    [tokenHash(token), user.user_id],
  );
  const { password_hash: _, ...actor } = user;
  return { token, actor };
}
export async function authenticate(token?: string): Promise<Actor> {
  const db = await getDb();
  if (!token) throw new AppError(401, "Sign in to continue");
  const result = await db.query<Actor>(
    "SELECT u.user_id,u.full_name,u.email,r.role_name FROM app_sessions s JOIN users u USING(user_id) JOIN roles r USING(role_id) WHERE s.token_hash=$1 AND s.expires_at>CURRENT_TIMESTAMP AND u.status='active'",
    [tokenHash(token)],
  );
  if (!result.rows[0]) throw new AppError(401, "Session expired");
  return result.rows[0];
}
export async function logout(token: string) {
  const db = await getDb();
  await db.query("DELETE FROM app_sessions WHERE token_hash=$1", [
    tokenHash(token),
  ]);
}
export function requireRole(actor: Actor, ...roles: Actor["role_name"][]) {
  if (!roles.includes(actor.role_name))
    throw new AppError(403, "Your role cannot perform this action");
}
