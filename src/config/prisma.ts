/**
 * Shared PrismaClient singleton (Prisma v7 + pg driver adapter).
 *
 * Prisma v7 requires a driver adapter — there's no built-in query engine.
 * We create a pg Pool, wrap it in PrismaPg, and pass it to PrismaClient.
 *
 * The globalThis singleton prevents connection-pool exhaustion during
 * dev hot-reloads (e.g. with ts-node-dev / tsx --watch).
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
