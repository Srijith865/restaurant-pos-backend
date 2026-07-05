/**
 * Prisma Client singleton (Prisma v7 + pg driver adapter).
 *
 * Usage:
 *   import { prisma } from '../lib/prisma';
 *   const restaurants = await prisma.restaurant.findMany();
 *
 * In Prisma v7, a driver adapter is required — there is no built-in
 * engine anymore. We use @prisma/adapter-pg backed by the `pg` Pool.
 *
 * The singleton pattern avoids creating multiple Pool / PrismaClient
 * instances during hot-reloads in development.
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Prevent multiple instances during dev hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
