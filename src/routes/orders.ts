/**
 * Order routes — create orders, add items, update KOT status, bill & pay.
 * Protected by requireAuth middleware (applied in index.ts).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import {
  getOrCreateOpenOrder,
  addItemsToOrder,
  updateKotStatus,
  generateBill,
  markOrderPaid,
  cancelOrder,
} from "../services/orderService";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────

const orderItemSchema = z.object({
  menuItemId: z.string().min(1, "menuItemId is required"),
  quantity: z.number().int().positive("quantity must be a positive integer"),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  tableId: z.string().min(1, "tableId is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

const addItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

const kotStatusSchema = z.object({
  status: z.enum(["pending", "preparing", "ready", "served"], {
    message: "status must be one of: pending, preparing, ready, served",
  }),
});

// ── Helper: catch service errors and send JSON ──────────────────────

function handleServiceError(res: Response, err: unknown): void {
  if (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "message" in err
  ) {
    const svcErr = err as { status: number; message: string };
    res.status(svcErr.status).json({ error: svcErr.message });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── POST /orders ────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((e: { message: string }) => e.message)
      .join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { tableId, items } = parsed.data;

  try {
    const order = await getOrCreateOpenOrder(
      req.restaurantId!,
      tableId,
      req.staffId!
    );

    const updated = await addItemsToOrder(req.restaurantId!, order.id, items);
    res.status(201).json(updated);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ── POST /orders/:id/items ──────────────────────────────────────────

router.post("/:id/items", async (req: Request, res: Response): Promise<void> => {
  const parsed = addItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((e: { message: string }) => e.message)
      .join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const orderId = req.params.id as string;

  try {
    const updated = await addItemsToOrder(
      req.restaurantId!,
      orderId,
      parsed.data.items
    );
    res.json(updated);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ── PATCH /orders/:id/items/:itemId/kot-status ──────────────────────

router.patch(
  "/:id/items/:itemId/kot-status",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = kotStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const messages = parsed.error.issues
        .map((e: { message: string }) => e.message)
        .join("; ");
      res.status(400).json({ error: messages });
      return;
    }

    const itemId = req.params.itemId as string;

    try {
      const item = await updateKotStatus(
        req.restaurantId!,
        itemId,
        parsed.data.status
      );
      res.json(item);
    } catch (err) {
      handleServiceError(res, err);
    }
  }
);

// ── GET /orders/:id ─────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const order = await prisma.order.findFirst({
    where: { id, restaurantId: req.restaurantId },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      table: { select: { id: true, label: true } },
    },
  });

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

// ── GET /orders ─────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: req.restaurantId,
      ...(statusFilter ? { status: statusFilter as "open" | "billed" | "paid" | "cancelled" } : {}),
    },
    include: {
      items: {
        include: { menuItem: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      table: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(orders);
});

// ── POST /orders/:id/bill ───────────────────────────────────────────

router.post("/:id/bill", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const order = await generateBill(req.restaurantId!, id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ── POST /orders/:id/pay ────────────────────────────────────────────

router.post("/:id/pay", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const order = await markOrderPaid(req.restaurantId!, id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ── POST /orders/:id/cancel ─────────────────────────────────────────

router.post("/:id/cancel", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const order = await cancelOrder(req.restaurantId!, id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

export default router;
