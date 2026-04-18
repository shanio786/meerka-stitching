import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export type CreateUserInput = {
  username: string;
  password: string;
  fullName: string;
  role?: "admin" | "management";
  phone?: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(input: CreateUserInput) {
  const username = input.username.trim().toLowerCase();
  if (!username || !input.password || !input.fullName?.trim()) {
    throw new Error("username, password, and fullName are required");
  }
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(usersTable)
    .values({
      username,
      fullName: input.fullName.trim(),
      passwordHash,
      role: input.role ?? "management",
      phone: input.phone?.trim() || null,
    })
    .returning();
  return row;
}

export async function findUserByUsername(username: string) {
  const u = username.trim().toLowerCase();
  const rows = await db.select().from(usersTable).where(eq(usersTable.username, u)).limit(1);
  return rows[0];
}

export async function findUserById(id: number) {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return rows[0];
}

/**
 * Seed default admin/store accounts if the users table is empty.
 * admin / admin123 (admin role)
 * store / store123 (management role)
 */
export async function seedDefaultUsersIfEmpty(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);
  if (count > 0) return;
  await createUser({
    username: "admin",
    password: "admin123",
    fullName: "Administrator",
    role: "admin",
  });
  await createUser({
    username: "store",
    password: "store123",
    fullName: "Store Manager",
    role: "management",
  });
  logger.info(
    "Seeded default users: admin/admin123 (admin) and store/store123 (management). Please change passwords after first login.",
  );
}
