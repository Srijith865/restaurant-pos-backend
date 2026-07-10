import { Router, Request, Response } from "express";
import { getDb } from "../lib/db";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request().query`
      SELECT OutletID, OutletName 
      FROM Outlets
      ORDER BY OutletName ASC
    `;

    const outlets = result.recordset.map((row) => ({
      id: row.OutletID.toString(),
      name: row.OutletName,
      restaurantId: "1",
    }));

    res.json(outlets);
  } catch (err) {
    console.error("Failed to fetch outlets:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
