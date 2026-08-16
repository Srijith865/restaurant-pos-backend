import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    let allowedTables = new Set<string>();
    let hasTableRestrictions = false;

    if (req.staffId && req.staffId !== "admin") {
      const waiterRes = await pool.request()
        .input("waiterId", sql.Int, parseInt(req.staffId, 10))
        .query(`SELECT allowtables FROM Waiters WHERE WaiterID = @waiterId`);
      
      if (waiterRes.recordset.length > 0) {
        const allowtables = waiterRes.recordset[0].allowtables;
        if (allowtables && allowtables.trim().length > 0) {
          hasTableRestrictions = true;
          allowtables.split(',').forEach((t: string) => allowedTables.add(t.trim().toLowerCase()));
        }
      }
    }

    const result = await pool.request().query`
      SELECT 
        t.TableID, 
        t.TableNumber, 
        t.OutletID, 
        (SELECT TOP 1 o.OrderDate FROM Orders o WHERE o.TableID = t.TableID AND (o.IsPaid = 0 OR o.IsPaid IS NULL) ORDER BY o.OrderDate DESC) as OrderStartTime,
        (SELECT TOP 1 o.TotalAmount FROM Orders o WHERE o.TableID = t.TableID AND (o.IsPaid = 0 OR o.IsPaid IS NULL) ORDER BY o.OrderDate DESC) as CurrentAmount,
        CASE 
          WHEN EXISTS (SELECT 1 FROM Orders o WHERE o.TableID = t.TableID AND (o.IsPaid = 0 OR o.IsPaid IS NULL)) 
          THEN 'Occupied' 
          ELSE 'Available' 
        END as Status
      FROM RestaurantTables t
    `;

    let tables = result.recordset.map((row) => ({
      id: row.TableID.toString(),
      restaurantId: "1",
      number: parseInt(row.TableNumber) || 0,
      label: row.TableNumber,
      status: row.Status === "Occupied" ? "occupied" : "available",
      isOccupied: row.Status === "Occupied",
      outletId: row.OutletID ? row.OutletID.toString() : null,
      orderStartTime: row.OrderStartTime ? new Date(row.OrderStartTime).toISOString() : null,
      currentAmount: row.CurrentAmount != null ? parseFloat(row.CurrentAmount) : null,
    }));

    if (hasTableRestrictions) {
      tables = tables.filter(t => allowedTables.has(t.label.toLowerCase()) || allowedTables.has(t.id));
    }

    res.json(tables);
  } catch (err) {
    console.error("Failed to fetch tables:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// We disable creating/updating tables through the KOT app
// The dad's .NET software will manage table creation.

export default router;
