import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";

export type Role = "admin" | "management";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      userEmail?: string;
    }
  }
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    if (!userId) return next();
    req.userId = userId;
    const user = await clerkClient.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    req.userEmail = email;
    const admins = adminEmails();
    const metaRole = (user.publicMetadata as { role?: string } | null)?.role;
    if (metaRole === "admin" || metaRole === "management") {
      req.userRole = metaRole;
    } else if (admins.length === 0 || (email && admins.includes(email))) {
      req.userRole = "admin";
    } else {
      req.userRole = "management";
    }
  } catch (err) {
    req.log?.error({ err }, "attachUser failed");
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
