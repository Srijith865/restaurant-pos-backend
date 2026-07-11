import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request().query`
      SELECT TableID, TableNumber, OutletID, Status
      FROM RestaurantTables
    `;

    const tables = result.recordset.map((row) => ({
      id: row.TableID.toString(),
      restaurantId: "1",
      number: parseInt(row.TableNumber) || 0,
      label: row.TableNumber,
      status: row.Status === "Occupied" ? "occupied" : "available",
      isOccupied: row.Status === "Occupied",
      outletId: row.OutletID ? row.OutletID.toString() : null,
    }));

    res.json(tables);
  } catch (err) {
    console.error("Failed to fetch tables:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// We disable creating/updating tables through the KOT app
// The dad's .NET software will manage table creation.

export default router;
