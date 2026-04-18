/**
 * CLI: create or update a user.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run user:create -- <username> <password> [role] [fullName]
 *
 * Examples:
 *   pnpm --filter @workspace/api-server run user:create -- ali secret123 management "Ali Hassan"
 *   pnpm --filter @workspace/api-server run user:create -- boss boss123 admin "Owner"
 *
 * If the username already exists, the password (and optionally role/fullName) is updated.
 */
import { createUser, findUserByUsername, hashPassword } from "../lib/auth";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const [, , username, password, roleArg, ...rest] = process.argv;
  if (!username || !password) {
    console.error("Usage: user:create -- <username> <password> [admin|management] [fullName]");
    process.exit(1);
  }
  const role = (roleArg === "admin" ? "admin" : "management") as "admin" | "management";
  const fullName = rest.join(" ").trim() || username;

  const existing = await findUserByUsername(username);
  if (existing) {
    const passwordHash = await hashPassword(password);
    await db
      .update(usersTable)
      .set({ passwordHash, role, fullName })
      .where(eq(usersTable.id, existing.id));
    console.log(`Updated user "${username}" (role=${role}).`);
  } else {
    const u = await createUser({ username, password, fullName, role });
    console.log(`Created user "${u.username}" (id=${u.id}, role=${u.role}).`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
