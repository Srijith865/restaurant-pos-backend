/**
 * Dining table routes — CRUD for the requesting restaurant's tables.
 * Protected by requireAuth middleware (applied in index.ts).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────

const createTableSchema = z.object({
  label: z.string().min(1, "label is required"),
  outletId: z.string().optional(),
});

const updateTableSchema = z
  .object({
    label: z.string().min(1, "label cannot be empty").optional(),
    isOccupied: z.boolean().optional(),
    outletId: z.string().optional(),
  });

// ── GET /tables ─────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const tables = await prisma.diningTable.findMany({
    where: { restaurantId: req.restaurantId },
    include: { outlet: true },
    orderBy: { label: "asc" },
  });

  res.json(tables);
});

// ── POST /tables ────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = createTableSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const table = await prisma.diningTable.create({
    data: {
      restaurantId: req.restaurantId!,
      label: parsed.data.label,
      outletId: parsed.data.outletId,
    },
  });

  res.status(201).json(table);
});

// ── PATCH /tables/:id ───────────────────────────────────────────────

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const parsed = updateTableSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const id = req.params.id as string;

  const existing = await prisma.diningTable.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!existing) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  const table = await prisma.diningTable.update({
    where: { id },
    data: parsed.data,
  });

  res.json(table);
});

// ── DELETE /tables/:id ──────────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.diningTable.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!existing) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  // Find all orders for this table
  const orders = await prisma.order.findMany({
    where: { tableId: id },
    select: { id: true },
  });

  const orderIds = orders.map((o) => o.id);

  if (orderIds.length > 0) {
    // Delete order items first
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });

    // Delete orders
    await prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    });
  }

  await prisma.diningTable.delete({ where: { id } });

  res.status(204).send();
});

export default router;
