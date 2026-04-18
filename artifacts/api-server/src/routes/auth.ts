import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  findUserById,
  findUserByUsername,
  hashPassword,
  verifyPassword,
} from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }
  const user = await findUserByUsername(String(username));
  if (!user || user.isActive !== "true") {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const ok = await verifyPassword(String(password), user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.fullName = user.fullName;
  req.session.save((err) => {
    if (err) {
      req.log?.error({ err }, "session save failed");
      res.status(500).json({ error: "Login failed" });
      return;
    }
    res.json({
      signedIn: true,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
  });
});

router.post("/auth/logout", (req, res) => {
  req.session?.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.userId) {
    res.json({ signedIn: false });
    return;
  }
  res.json({
    signedIn: true,
    userId: req.userId,
    username: req.userName,
    fullName: req.userFullName,
    role: req.userRole || "management",
  });
});

router.patch("/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }
  const user = await findUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const ok = await verifyPassword(String(currentPassword), user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await hashPassword(String(newPassword));
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});

router.patch("/me/profile", requireAuth, async (req, res) => {
  const { username, fullName, phone } = req.body || {};
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (typeof fullName === "string" && fullName.trim()) updates.fullName = fullName.trim();
  if (typeof phone === "string") updates.phone = phone.trim() || null;
  if (typeof username === "string" && username.trim()) {
    const newUsername = username.trim().toLowerCase();
    if (newUsername !== req.userName) {
      const existing = await findUserByUsername(newUsername);
      if (existing && existing.id !== req.userId) {
        res.status(409).json({ error: "This username is already taken" });
        return;
      }
      updates.username = newUsername;
    }
  }
  if (Object.keys(updates).length === 0) {
    res.json({ ok: true });
    return;
  }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!));
  if (updates.username) req.session.username = updates.username;
  if (updates.fullName) req.session.fullName = updates.fullName;
  req.session.save(() => {
    res.json({ ok: true });
  });
});

export default router;
