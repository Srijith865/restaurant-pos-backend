/**
 * Auth routes — GET /auth/waiters and POST /auth/login
 */

import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getDb, sql } from "../lib/db";

import { getDeviceStatus, registerDevice, verifyWaiterPin } from "../lib/securityStore";

const router = Router();

// 🍔 Helpers 🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔

function signToken(payload: { staffId: string; role: string; name: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// 🍔 POST /auth/register-device 🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔

const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
});

router.post("/register-device", async (req: Request, res: Response): Promise<void> => {
  const parsed = registerDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request payload" });
    return;
  }
  const { deviceId } = parsed.data;
  
  const success = await registerDevice(deviceId);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to register device" });
  }
});

// 🍔 POST /auth/verify-device 🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔

const verifyDeviceSchema = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
});

router.post("/verify-device", async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request payload" });
    return;
  }
  
  const status = await getDeviceStatus(parsed.data.deviceId);
  if (status.isApproved) {
    res.json({ authorized: true });
  } else {
    res.status(403).json({ error: "Device Not Authorized or Pending Approval" });
  }
});

// 🍔 GET /auth/waiters 🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔

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

// 🍔 POST /auth/login 🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔

const loginSchema = z.object({
  waiterId: z.number(),
  deviceId: z.string().min(1, "deviceId is required"),
  pin: z.string().min(1, "pin is required"),
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { waiterId, deviceId, pin } = parsed.data;

  // 1. Verify Device
  const status = await getDeviceStatus(deviceId);
  if (!status.isApproved) {
    res.status(403).json({ error: "Device Not Authorized" });
    return;
  }

  // 2. Verify PIN
  const pinValid = await verifyWaiterPin(waiterId.toString(), pin);
  if (!pinValid) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

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

// 🍔 POST /auth/admin-login 🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔🍔
router.post("/admin-login", async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body;
  
  if (password === (process.env.ADMIN_PASSWORD || "bluefox2026")) {
    const token = signToken({
      staffId: "admin",
      role: "admin",
      name: "Administrator",
    });
    res.json({ token, staffId: "admin" });
  } else {
    res.status(401).json({ error: "Invalid Admin Password" });
  }
});

export default router;
