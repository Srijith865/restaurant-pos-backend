/**
 * Menu item routes — CRUD for the requesting restaurant's menu items.
 * Protected by requireAuth middleware (applied in index.ts).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────

const createItemSchema = z.object({
  categoryId: z.string().min(1, "categoryId is required"),
  name: z.string().min(1, "name is required"),
  price: z.number().positive("price must be a positive number"),
  isAvailable: z.boolean().optional(),
});

const updateItemSchema = z
  .object({
    categoryId: z.string().min(1, "categoryId cannot be empty").optional(),
    name: z.string().min(1, "name cannot be empty").optional(),
    price: z.number().positive("price must be a positive number").optional(),
    isAvailable: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.categoryId !== undefined ||
      data.name !== undefined ||
      data.price !== undefined ||
      data.isAvailable !== undefined,
    { message: "At least one field is required" }
  );

// ── GET /items ──────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const categoryId = req.query.categoryId as string | undefined;

  const items = await prisma.menuItem.findMany({
    where: {
      restaurantId: req.restaurantId,
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  res.json(
    items.map((item) => ({
      id: item.id,
      restaurantId: item.restaurantId,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      name: item.name,
      price: item.price,
      isAvailable: item.isAvailable,
    }))
  );
});

// ── POST /items ─────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const { categoryId, name, price, isAvailable } = parsed.data;

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId: req.restaurantId },
  });

  if (!category) {
    res.status(400).json({ error: "Category not found" });
    return;
  }

  const item = await prisma.menuItem.create({
    data: {
      restaurantId: req.restaurantId!,
      categoryId,
      name,
      price,
      isAvailable: isAvailable ?? true,
    },
    include: {
      category: { select: { name: true } },
    },
  });

  res.status(201).json({
    id: item.id,
    restaurantId: item.restaurantId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    price: item.price,
    isAvailable: item.isAvailable,
  });
});

// ── PATCH /items/:id ────────────────────────────────────────────────

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e: { message: string }) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const id = req.params.id as string;

  const existing = await prisma.menuItem.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!existing) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (parsed.data.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: parsed.data.categoryId, restaurantId: req.restaurantId },
    });

    if (!category) {
      res.status(400).json({ error: "Category not found" });
      return;
    }
  }

  await prisma.menuItem.update({
    where: { id },
    data: parsed.data,
  });

  const item = await prisma.menuItem.findFirst({
    where: { id, restaurantId: req.restaurantId },
    include: { category: { select: { name: true } } },
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({
    id: item.id,
    restaurantId: item.restaurantId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    price: item.price,
    isAvailable: item.isAvailable,
  });
});

// ── PATCH /items/:id/toggle ─────────────────────────────────────────

router.patch("/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const existing = await prisma.menuItem.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!existing) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !existing.isAvailable },
  });

  const item = await prisma.menuItem.findFirst({
    where: { id, restaurantId: req.restaurantId },
    include: { category: { select: { name: true } } },
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({
    id: item.id,
    restaurantId: item.restaurantId,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    name: item.name,
    price: item.price,
    isAvailable: item.isAvailable,
  });
});

export default router;
