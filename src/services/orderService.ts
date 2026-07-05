/**
 * Order service — core transaction logic for the order lifecycle.
 *
 * Every public function takes restaurantId as the first argument to
 * enforce multi-tenant isolation. All mutations that touch multiple
 * rows happen inside a Prisma $transaction so nothing is half-saved.
 */

import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/prisma";

// ── Types ───────────────────────────────────────────────────────────

export interface AddItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

// Re-usable include shape for returning a full order
const orderWithItems = {
  items: {
    include: {
      menuItem: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  table: { select: { id: true, label: true } },
} satisfies Prisma.OrderInclude;

// ── Helpers ─────────────────────────────────────────────────────────

/** Sum priceEach * quantity across all items in an order (inside a tx). */
async function recalcTotal(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<Prisma.Decimal> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { priceEach: true, quantity: true },
  });

  let total = new Prisma.Decimal(0);
  for (const item of items) {
    total = total.add(new Prisma.Decimal(item.priceEach).mul(item.quantity));
  }
  return total;
}

// ── getOrCreateOpenOrder ────────────────────────────────────────────
// Race-safe: if two requests arrive simultaneously for the same table,
// the partial unique index "one_open_order_per_table" ensures only one
// INSERT succeeds. The loser catches the unique violation (23505) and
// re-queries instead of crashing.

export async function getOrCreateOpenOrder(
  restaurantId: string,
  tableId: string,
  staffId: string
) {
  // Validate table belongs to this restaurant
  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, restaurantId },
  });
  if (!table) {
    throw { status: 404, message: "Table not found" };
  }

  // Check for an existing open order on this table
  const existing = await prisma.order.findFirst({
    where: { restaurantId, tableId, status: "open" },
    include: orderWithItems,
  });

  if (existing) return existing;

  // No open order — create one in a transaction
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId,
          tableId,
          staffId,
          status: "open",
          total: 0,
        },
        include: orderWithItems,
      });

      // Mark the table as occupied
      await tx.diningTable.update({
        where: { id: tableId },
        data: { isOccupied: true },
      });

      return order;
    }, { timeout: 20000 });
  } catch (err: unknown) {
    // If another concurrent request just created the open order,
    // the partial unique index will reject this INSERT with 23505.
    // In that case, just return the order the other request created.
    const isPrismaUnique =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002";

    const isRawPgUnique =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "23505";

    if (isPrismaUnique || isRawPgUnique) {
      const raced = await prisma.order.findFirst({
        where: { restaurantId, tableId, status: "open" },
        include: orderWithItems,
      });
      if (raced) return raced;
    }

    // Not a race — re-throw the original error
    throw err;
  }
}

// ── addItemsToOrder ─────────────────────────────────────────────────

export async function addItemsToOrder(
  restaurantId: string,
  orderId: string,
  items: AddItemInput[]
) {
  return prisma.$transaction(async (tx) => {
    // Validate the order belongs to this restaurant and is open
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId, status: "open" },
    });
    if (!order) {
      throw { status: 404, message: "Open order not found" };
    }

    // Lock the order row (SELECT ... FOR UPDATE) FIRST to avoid deadlocks.
    // Concurrent addItemsToOrder calls on the same order will serialize here.
    // If we lock *after* creating OrderItems, Postgres deadlocks because
    // inserting children acquires shared locks on the parent Order.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

    // Validate every menu item and snapshot prices
    const itemsToCreate: {
      orderId: string;
      menuItemId: string;
      quantity: number;
      priceEach: Prisma.Decimal;
      kotStatus: "pending";
      notes: string | null;
    }[] = [];

    for (const item of items) {
      const menuItem = await tx.menuItem.findFirst({
        where: {
          id: item.menuItemId,
          restaurantId,
          isAvailable: true,
        },
      });

      if (!menuItem) {
        throw {
          status: 400,
          message: `Menu item ${item.menuItemId} not found or unavailable`,
        };
      }

      itemsToCreate.push({
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        priceEach: menuItem.price as unknown as Prisma.Decimal, // snapshot
        kotStatus: "pending",
        notes: item.notes ?? null,
      });
    }

    // Bulk create order items
    await tx.orderItem.createMany({ data: itemsToCreate });

    // Recalculate total from ALL items (not just ours) after lock
    const newTotal = await recalcTotal(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { total: newTotal },
    });

    // Return the full updated order
    return tx.order.findFirstOrThrow({
      where: { id: orderId },
      include: orderWithItems,
    });
  }, { timeout: 20000 });
}

// ── updateKotStatus ─────────────────────────────────────────────────

export async function updateKotStatus(
  restaurantId: string,
  orderItemId: string,
  newStatus: "pending" | "preparing" | "ready" | "served"
) {
  // Find the order item and verify it belongs to this restaurant
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      order: { restaurantId },
    },
    include: { order: { select: { restaurantId: true } } },
  });

  if (!orderItem) {
    throw { status: 404, message: "Order item not found" };
  }

  return prisma.orderItem.update({
    where: { id: orderItemId },
    data: { kotStatus: newStatus },
    include: {
      menuItem: { select: { name: true } },
    },
  });
}

// ── generateBill ────────────────────────────────────────────────────

export async function generateBill(restaurantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: orderWithItems,
  });

  if (!order) {
    throw { status: 404, message: "Order not found" };
  }

  if (order.status !== "open") {
    throw { status: 400, message: `Cannot bill an order with status "${order.status}"` };
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "billed" },
    include: orderWithItems,
  });
}

// ── markOrderPaid ───────────────────────────────────────────────────

export async function markOrderPaid(restaurantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
  });

  if (!order) {
    throw { status: 404, message: "Order not found" };
  }

  if (order.status !== "billed") {
    throw {
      status: 400,
      message: `Cannot mark as paid — order status is "${order.status}", expected "billed"`,
    };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "paid" },
      include: orderWithItems,
    });

    // Free up the table — but only if no OTHER open orders exist on it
    const otherOpenOrders = await tx.order.count({
      where: {
        restaurantId,
        tableId: order.tableId,
        status: "open",
        id: { not: orderId },
      },
    });

    if (otherOpenOrders === 0) {
      await tx.diningTable.update({
        where: { id: order.tableId },
        data: { isOccupied: false },
      });
    }

    return updated;
  });
}

// ── cancelOrder ─────────────────────────────────────────────────────

export async function cancelOrder(restaurantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
  });

  if (!order) {
    throw { status: 404, message: "Order not found" };
  }

  if (order.status === "paid" || order.status === "cancelled") {
    throw {
      status: 400,
      message: `Cannot cancel an order with status "${order.status}"`,
    };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
      include: orderWithItems,
    });

    // Free up the table if no other open orders
    const otherOpenOrders = await tx.order.count({
      where: {
        restaurantId,
        tableId: order.tableId,
        status: "open",
        id: { not: orderId },
      },
    });

    if (otherOpenOrders === 0) {
      await tx.diningTable.update({
        where: { id: order.tableId },
        data: { isOccupied: false },
      });
    }

    return updated;
  });
}
