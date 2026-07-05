/**
 * GET /me — returns the logged-in staff member's profile + restaurant name.
 * Protected by requireAuth middleware (applied in index.ts).
 */

import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const staff = await prisma.staff.findUnique({
    where: { id: req.staffId },
    select: {
      id: true,
      name: true,
      role: true,
      restaurantId: true,
      restaurant: {
        select: { name: true },
      },
    },
  });

  if (!staff) {
    res.status(404).json({ error: "Staff member not found" });
    return;
  }

  res.json({
    id: staff.id,
    name: staff.name,
    role: staff.role,
    restaurantId: staff.restaurantId,
    restaurantName: staff.restaurant.name,
  });
});

export default router;
