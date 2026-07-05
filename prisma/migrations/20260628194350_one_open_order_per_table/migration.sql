-- Partial unique index: enforce at most one OPEN order per table.
-- This prevents the race condition where two concurrent requests both
-- see "no open order" and each create one.
-- Prisma's schema.prisma doesn't support partial/conditional indexes
-- directly, so we use raw SQL.

CREATE UNIQUE INDEX "one_open_order_per_table"
  ON "Order" ("tableId")
  WHERE status = 'open';
