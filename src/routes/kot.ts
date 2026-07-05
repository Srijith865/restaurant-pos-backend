/**
 * KOT (Kitchen Order Ticket) routes — read-only view for the kitchen.
 * Protected by requireAuth middleware (applied in index.ts).
 *
 * GET /kot/pending — all pending/preparing items grouped by order/table.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";

const router = Router();

// ── GET /kot/pending ────────────────────────────────────────────────

router.get("/pending", async (req: Request, res: Response): Promise<void> => {
  // Fetch all order items that the kitchen needs to act on
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        restaurantId: req.restaurantId,
        status: "open",
      },
      kotStatus: { in: ["pending", "preparing"] },
    },
    include: {
      menuItem: { select: { name: true } },
      order: {
        select: {
          id: true,
          createdAt: true,
          table: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by order → table for kitchen-friendly output
  const grouped: Record<
    string,
    {
      orderId: string;
      tableId: string;
      tableLabel: string;
      orderTime: Date;
      items: {
        id: string;
        name: string;
        quantity: number;
        notes: string | null;
        kotStatus: string;
      }[];
    }
  > = {};

  for (const item of items) {
    const key = item.order.id;
    if (!grouped[key]) {
      grouped[key] = {
        orderId: item.order.id,
        tableId: item.order.table.id,
        tableLabel: item.order.table.label,
        orderTime: item.order.createdAt,
        items: [],
      };
    }
    grouped[key].items.push({
      id: item.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      notes: item.notes,
      kotStatus: item.kotStatus,
    });
  }

  // Return as an array sorted by oldest order first
  const tickets = Object.values(grouped).sort(
    (a, b) => a.orderTime.getTime() - b.orderTime.getTime()
  );

  res.json(tickets);
});

export default router;
