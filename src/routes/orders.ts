/**
 * Order routes — create orders, add items, update KOT status, bill & pay.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  getOrCreateOpenOrder,
  addItemsToOrder,
  updateKotStatus,
  generateBill,
  markOrderPaid,
  cancelOrder,
} from "../services/orderService";
import { getDb, sql } from "../lib/db";

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
      "1",
      tableId,
      req.staffId!
    );

    const updated = await addItemsToOrder("1", order.id, items);
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
      "1",
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

    const orderId = req.params.id as string;
    const itemId = req.params.itemId as string;

    try {
      const item = await updateKotStatus(
        "1",
        orderId,
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

  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("orderId", sql.Int, parseInt(id, 10))
      .query(`SELECT * FROM Orders WHERE OrderID = @orderId`);
      
    if (result.recordset.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    
    const orderRecord = result.recordset[0];
    
    const details = await pool.request()
      .input("orderId", sql.Int, parseInt(id, 10))
      .query(`
        SELECT od.*, i.ItemName 
        FROM OrderDetails od
        LEFT JOIN MenuItems i ON od.ItemID = i.ItemID
        WHERE od.OrderID = @orderId
      `);
      
    const items = details.recordset.map(od => ({
      id: od.OrderDetailID.toString(),
      orderId: orderRecord.OrderID.toString(),
      menuItemId: od.ItemID?.toString() || "",
      quantity: od.Quantity || 0,
      priceEach: od.Price || 0,
      kotStatus: "pending",
      menuItem: { name: od.ItemName || "Item" }
    }));
    
    res.json({
      id: orderRecord.OrderID.toString(),
      restaurantId: "1",
      tableId: orderRecord.TableID?.toString() || "",
      staffId: orderRecord.StewardID || "",
      status: orderRecord.IsPaid ? "paid" : "open",
      total: orderRecord.TotalAmount || 0,
      items,
    });
  } catch(err) {
    handleServiceError(res, err);
  }
});

// ── GET /orders ─────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request().query(`
      SELECT * FROM Orders WHERE IsPaid = 0 OR IsPaid IS NULL
      ORDER BY OrderDate DESC
    `);
    
    const orders = result.recordset.map(orderRecord => ({
      id: orderRecord.OrderID.toString(),
      restaurantId: "1",
      tableId: orderRecord.TableID?.toString() || "",
      staffId: orderRecord.StewardID || "",
      status: orderRecord.IsPaid ? "paid" : "open",
      total: orderRecord.TotalAmount || 0,
      items: [],
    }));
    
    res.json(orders);
  } catch(err) {
    handleServiceError(res, err);
  }
});

// ── POST /orders/:id/bill ───────────────────────────────────────────

router.post("/:id/bill", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const order = await generateBill("1", id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ── POST /orders/:id/pay ────────────────────────────────────────────

router.post("/:id/pay", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    // payment method defaults to cash for now
    const order = await markOrderPaid("1", id, "cash");
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

// ── POST /orders/:id/cancel ─────────────────────────────────────────

router.post("/:id/cancel", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const order = await cancelOrder("1", id);
    res.json(order);
  } catch (err) {
    handleServiceError(res, err);
  }
});

export default router;
