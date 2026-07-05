/**
 * Menu category routes — CRUD for the requesting restaurant's categories.
 * Protected by requireAuth middleware (applied in index.ts).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────

const createCategorySchema = z.object({
  name: z.string().min(1, "name is required"),
  sortOrder: z.number().int().optional(),
});

const updateCategorySchema = z
  .object({
    name: z.string().min(1, "name cannot be empty").optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => data.name !== undefined || data.sortOrder !== undefined, {
    message: "At least one of name or sortOrder is required",
  });

// ── GET /categories ─────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: req.restaurantId },
    orderBy: { sortOrder: "asc" },
  });

  res.json(categories);
});

// ── POST /categories ────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { name, sortOrder } = parsed.data;

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId: req.restaurantId!,
      name,
      sortOrder: sortOrder ?? 0,
    },
  });

  res.status(201).json(category);
});

// ── PATCH /categories/:id ───────────────────────────────────────────

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const id = req.params.id as string;

  const existing = await prisma.menuCategory.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!existing) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const category = await prisma.menuCategory.update({
    where: { id },
    data: parsed.data,
  });

  res.json(category);
});

// ── DELETE /categories/:id ──────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.menuCategory.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!existing) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const itemCount = await prisma.menuItem.count({
    where: { categoryId: id, restaurantId: req.restaurantId },
  });

  if (itemCount > 0) {
    res.status(400).json({ error: "Cannot delete category that still has menu items" });
    return;
  }

  await prisma.menuCategory.delete({ where: { id } });

  res.status(204).send();
});

export default router;
