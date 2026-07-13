import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

// GET /categories
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request().query`
      SELECT CategoryID, CategoryName, catesort
      FROM Categories 
      ORDER BY catesort ASC
    `;

    const categories = result.recordset.map((row) => ({
      id: row.CategoryID.toString(),
      name: row.CategoryName || "Unnamed Category",
      sortOrder: row.catesort || 0,
      restaurantId: "1",
    }));

    res.json(categories);
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
