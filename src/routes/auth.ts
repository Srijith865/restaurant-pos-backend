/**
 * Auth routes — GET /auth/waiters and POST /auth/login
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getDb, sql } from "../lib/db";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────

function signToken(payload: { staffId: string; role: string; name: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// ── GET /auth/waiters ───────────────────────────────────────────────

router.get("/waiters", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request().query`
      SELECT WaiterID, WaiterName FROM Waiters ORDER BY WaiterName ASC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch waiters:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ── POST /auth/login ────────────────────────────────────────────────

const loginSchema = z.object({
  waiterId: z.number(),
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { waiterId } = parsed.data;

  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("waiterId", sql.Int, waiterId)
      .query`SELECT WaiterID, WaiterName FROM Waiters WHERE WaiterID = @waiterId`;

    if (result.recordset.length === 0) {
      res.status(404).json({ error: "Waiter not found" });
      return;
    }

    const waiter = result.recordset[0];

    // Issue JWT
    const token = signToken({
      staffId: waiter.WaiterID.toString(),
      role: "waiter",
      name: waiter.WaiterName || "Unknown Waiter",
    });

    res.json({
      token,
      staffId: waiter.WaiterID.toString(),
    });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Login failed due to database error" });
  }
});

export default router;
