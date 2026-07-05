/**
 * requireAuth middleware — verifies JWT from "Authorization: Bearer <token>".
 *
 * On success, attaches staffId, restaurantId, and role to the request
 * object so downstream handlers can use them without re-querying the DB.
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to carry auth payload
declare global {
  namespace Express {
    interface Request {
      staffId?: string;
      restaurantId?: string;
      role?: string;
    }
  }
}

interface JwtPayload {
  staffId: string;
  restaurantId: string;
  role: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice(7); // strip "Bearer "

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.staffId = payload.staffId;
    req.restaurantId = payload.restaurantId;
    req.role = payload.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}
