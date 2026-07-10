import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { StaffRole } from "@prisma/client";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "waiter", "kitchen"]),
});

// ── GET /staff ──────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  // Only admin should be able to view staff list
  if (req.role !== "admin") {
    res.status(403).json({ error: "Only admins can view staff" });
    return;
  }

  const staff = await prisma.staff.findMany({
    where: { restaurantId: req.restaurantId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      restaurantId: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(staff);
});

// ── POST /staff ─────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Only admins can add staff" });
    return;
  }

  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { name, phone, password, role } = parsed.data;

  // Check if phone already registered (in the whole system, as phone must be unique to login)
  const existing = await prisma.staff.findFirst({ where: { phone } });
  if (existing) {
    res.status(409).json({ error: "A staff member with this phone already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const staff = await prisma.staff.create({
    data: {
      restaurantId: req.restaurantId!,
      name,
      phone,
      passwordHash,
      role: role as StaffRole,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      restaurantId: true,
    },
  });

  res.status(201).json(staff);
});

// ── DELETE /staff/:id ───────────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Only admins can delete staff" });
    return;
  }

  const id = req.params.id;

  // Prevent admin from deleting themselves
  if (id === req.staffId) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }

  const target = await prisma.staff.findFirst({
    where: { id: id as string, restaurantId: req.restaurantId },
  });

  if (!target) {
    res.status(404).json({ error: "Staff not found" });
    return;
  }

  await prisma.staff.delete({ where: { id: id as string } });

  res.json({ success: true });
});

export default router;
