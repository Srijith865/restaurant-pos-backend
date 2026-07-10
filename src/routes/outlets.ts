import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

const createOutletSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// ── GET /outlets ──────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const outlets = await prisma.outlet.findMany({
    where: { restaurantId: req.restaurantId },
    orderBy: { name: "asc" },
  });
  res.json(outlets);
});

// ── POST /outlets ─────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Only admins can add outlets" });
    return;
  }

  const parsed = createOutletSchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: messages });
    return;
  }

  const outlet = await prisma.outlet.create({
    data: {
      name: parsed.data.name,
      restaurantId: req.restaurantId!,
    },
  });

  res.status(201).json(outlet);
});

// ── DELETE /outlets/:id ───────────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Only admins can delete outlets" });
    return;
  }

  const id = req.params.id as string;

  const outlet = await prisma.outlet.findFirst({
    where: { id, restaurantId: req.restaurantId },
  });

  if (!outlet) {
    res.status(404).json({ error: "Outlet not found" });
    return;
  }

  // Ensure no tables are assigned to it before deleting
  const tables = await prisma.diningTable.count({
    where: { outletId: id },
  });

  if (tables > 0) {
    res.status(400).json({ error: "Cannot delete outlet with assigned tables" });
    return;
  }

  // Delete associated prices first
  await prisma.menuItemPrice.deleteMany({
    where: { outletId: id },
  });

  await prisma.outlet.delete({ where: { id } });

  res.json({ success: true });
});

export default router;
