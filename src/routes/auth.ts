/**
 * Auth routes — POST /auth/onboard and POST /auth/login
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────

const onboardSchema = z.object({
  restaurantName: z.string().min(1, "restaurantName is required"),
  address: z.string().optional(),
  adminName: z.string().min(1, "adminName is required"),
  adminPhone: z.string().min(1, "adminPhone is required"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

const loginSchema = z.object({
  phone: z.string().min(1, "phone is required"),
  password: z.string().min(1, "password is required"),
});

// ── Helpers ─────────────────────────────────────────────────────────

function signToken(payload: { staffId: string; restaurantId: string; role: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

// ── POST /auth/onboard ─────────────────────────────────────────────

router.post("/onboard", async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const parsed = onboardSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { restaurantName, address, adminName, adminPhone, password } = parsed.data;

  // Check if phone already registered
  const existing = await prisma.staff.findFirst({ where: { phone: adminPhone } });
  if (existing) {
    res.status(409).json({ error: "A staff member with this phone already exists" });
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create restaurant + admin staff in a transaction
  const { restaurant, staff } = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: restaurantName,
        address: address ?? null,
      },
    });

    const staff = await tx.staff.create({
      data: {
        restaurantId: restaurant.id,
        name: adminName,
        phone: adminPhone,
        passwordHash,
        role: "admin",
      },
    });

    return { restaurant, staff };
  });

  // Issue JWT
  const token = signToken({
    staffId: staff.id,
    restaurantId: restaurant.id,
    role: staff.role,
  });

  res.status(201).json({
    token,
    restaurantId: restaurant.id,
    staffId: staff.id,
  });
});

// ── POST /auth/login ────────────────────────────────────────────────

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { phone, password } = parsed.data;

  // Find staff by phone — don't reveal which field is wrong
  const staff = await prisma.staff.findFirst({ where: { phone } });
  if (!staff) {
    res.status(401).json({ error: "Invalid phone or password" });
    return;
  }

  // Check if account is active
  if (!staff.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
    return;
  }

  // Compare password
  const valid = await bcrypt.compare(password, staff.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid phone or password" });
    return;
  }

  // Issue JWT
  const token = signToken({
    staffId: staff.id,
    restaurantId: staff.restaurantId,
    role: staff.role,
  });

  res.json({
    token,
    restaurantId: staff.restaurantId,
    staffId: staff.id,
  });
});

export default router;
