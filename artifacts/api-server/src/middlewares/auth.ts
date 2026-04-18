import type { Request, Response, NextFunction } from "express";

export type Role = "admin" | "management";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: Role;
      userName?: string;
      userFullName?: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: Role;
    username?: string;
    fullName?: string;
  }
}

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const s = req.session;
  if (s?.userId) {
    req.userId = s.userId;
    req.userRole = s.role;
    req.userName = s.username;
    req.userFullName = s.fullName;
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
