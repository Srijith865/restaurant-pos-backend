import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

router.get("/pending", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    
    // Simplistic KOT implementation
    const result = await pool.request().query(`
      SELECT 
        o.OrderID,
        o.TableID,
        o.OrderDate,
        rt.TableNumber,
        od.OrderDetailID,
        od.Quantity,
        i.ItemName
      FROM Orders o
      JOIN OrderDetails od ON o.OrderID = od.OrderID
      JOIN RestaurantTables rt ON o.TableID = rt.TableID
      LEFT JOIN MenuItems i ON od.ItemID = i.ItemID
      WHERE o.IsKOTRaised = 0 AND (o.IsPaid = 0 OR o.IsPaid IS NULL)
      ORDER BY o.OrderDate ASC
    `);
    
    const grouped: Record<string, any> = {};
    for (const row of result.recordset) {
      const key = row.OrderID.toString();
      if (!grouped[key]) {
        grouped[key] = {
          orderId: key,
          tableId: row.TableID.toString(),
          tableLabel: row.TableNumber,
          orderTime: row.OrderDate,
          items: [],
        };
      }
      grouped[key].items.push({
        id: row.OrderDetailID.toString(),
        name: row.ItemName,
        quantity: row.Quantity,
        notes: null,
        kotStatus: "pending"
      });
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
