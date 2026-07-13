import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

// GET /items
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    
    const categoryId = req.query.categoryId as string;
    const tableId = req.query.tableId as string;

    const request = pool.request();
    let query = "";

    if (tableId) {
      request.input("tableId", sql.Int, parseInt(tableId, 10));
      query = `
        SELECT 
          m.ItemID, 
          m.ItemName, 
          COALESCE(r.Rate, m.Price) AS ActivePrice,
          m.CategoryID,
          c.CategoryName
        FROM MenuItems m
        LEFT JOIN Categories c ON m.CategoryID = c.CategoryID
        LEFT JOIN RestaurantTables t ON t.TableID = @tableId
        LEFT JOIN ItemRates r ON m.ItemID = r.ItemID AND r.OutletID = ISNULL(t.OutletID, 1)
      `;
    } else {
      query = `
        SELECT 
          m.ItemID, 
          m.ItemName, 
          m.Price AS ActivePrice,
          m.CategoryID,
          c.CategoryName
        FROM MenuItems m
        LEFT JOIN Categories c ON m.CategoryID = c.CategoryID
      `;
    }

    if (categoryId && categoryId !== "0" && categoryId !== "all") {
      query += (tableId ? ` WHERE m.CategoryID = @categoryId` : ` WHERE m.CategoryID = @categoryId`);
      request.input("categoryId", sql.Int, parseInt(categoryId, 10));
    }
    
    query += ` ORDER BY c.CategoryName ASC, m.ItemName ASC`;
    
    // Fetch items with category names
    const itemsResult = await request.query(query);

    // Group rates by ItemID
    const ratesByItem = new Map<number, any[]>();
    
    // Only fetch outlet-specific rates array if it's the Admin Dashboard (tableId is missing)
    if (!tableId) {
      const ratesResult = await pool.request().query`
        SELECT ItemID, OutletID, Rate FROM ItemRates
      `;
      for (const row of ratesResult.recordset) {
        if (!ratesByItem.has(row.ItemID)) {
          ratesByItem.set(row.ItemID, []);
        }
        ratesByItem.get(row.ItemID)!.push({
          id: `${row.ItemID}-${row.OutletID}`,
          menuItemId: row.ItemID.toString(),
          outletId: row.OutletID.toString(),
          price: row.Rate || 0,
        });
      }
    }

    const items = itemsResult.recordset.map((row) => ({
      id: row.ItemID.toString(),
      restaurantId: "1",
      categoryId: row.CategoryID?.toString() || "0",
      categoryName: row.CategoryName || "Unknown Category",
      name: row.ItemName || "Unnamed Item",
      price: row.ActivePrice || 0,
      isAvailable: true, // Assuming everything is available since no boolean flag in DB
      prices: ratesByItem.get(row.ItemID) || [],
    }));

    res.json(items);
  } catch (err) {
    console.error("Failed to fetch items:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

export default router;
