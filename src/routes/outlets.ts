import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    let allowedOutlets = new Set<string>();
    let hasOutletRestrictions = false;

    if (req.staffId && req.staffId !== "admin") {
      const waiterRes = await pool.request()
        .input("waiterId", sql.Int, parseInt(req.staffId, 10))
        .query(`SELECT allowoutlets FROM Waiters WHERE WaiterID = @waiterId`);
      
      if (waiterRes.recordset.length > 0) {
        const allowoutlets = waiterRes.recordset[0].allowoutlets;
        if (allowoutlets && allowoutlets.trim().length > 0) {
          hasOutletRestrictions = true;
          allowoutlets.split(',').forEach((o: string) => allowedOutlets.add(o.trim().toLowerCase()));
        }
      }
    }

    const result = await pool.request().query`
      SELECT OutletID, OutletName 
      FROM Outlets
      ORDER BY OutletName ASC
    `;

    let outlets = result.recordset.map((row) => ({
      id: row.OutletID.toString(),
      name: row.OutletName,
      restaurantId: "1",
    }));

    if (hasOutletRestrictions) {
      outlets = outlets.filter(o => allowedOutlets.has(o.name.toLowerCase()) || allowedOutlets.has(o.id));
    }

    res.json(outlets);
  } catch (err) {
    console.error("Failed to fetch outlets:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
