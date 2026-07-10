import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("waiterId", sql.Int, parseInt(req.staffId || "0"))
      .query`SELECT WaiterID, WaiterName FROM Waiters WHERE WaiterID = @waiterId`;

    if (result.recordset.length === 0) {
      res.status(404).json({ error: "Staff member not found" });
      return;
    }

    const waiter = result.recordset[0];

    res.json({
      id: waiter.WaiterID.toString(),
      name: waiter.WaiterName,
      role: "waiter",
      restaurantId: "1", // Hardcoded fallback for frontend
      restaurantName: "Bluefox Restaurant",
    });
  } catch (err) {
    console.error("Failed to fetch me:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
