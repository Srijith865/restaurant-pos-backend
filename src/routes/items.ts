import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

// GET /items
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    
    const categoryId = req.query.categoryId as string;
    const tableId = req.query.tableId as string;

    // Fetch the OutletID for the given table
    let outletId = 1; // Default fallback
    if (tableId) {
      const tableResult = await pool.request()
        .input("tableId", sql.Int, parseInt(tableId, 10))
        .query(`SELECT OutletID FROM RestaurantTables WHERE TableID = @tableId`);
      
      if (tableResult.recordset.length > 0 && tableResult.recordset[0].OutletID) {
        outletId = tableResult.recordset[0].OutletID;
      }
    }

    let query = `
      SELECT 
        m.ItemID, 
        m.ItemName, 
        COALESCE(r.Rate, m.Price) AS ActivePrice,
        m.CategoryID,
        c.CategoryName
      FROM MenuItems m
      LEFT JOIN Categories c ON m.CategoryID = c.CategoryID
      LEFT JOIN ItemRates r ON m.ItemID = r.ItemID AND r.OutletID = @OutletID
    `;

    if (categoryId && categoryId !== "0" && categoryId !== "all") {
      query += ` WHERE m.CategoryID = @categoryId`;
    }
    
    query += ` ORDER BY c.CategoryName ASC, m.ItemName ASC`;

    const request = pool.request();
    request.input("OutletID", sql.Int, outletId);
    if (categoryId && categoryId !== "0" && categoryId !== "all") {
      request.input("categoryId", sql.Int, parseInt(categoryId, 10));
    }
    
    // Fetch items with category names
    const itemsResult = await request.query(query);

    // Fetch outlet-specific rates
    const ratesResult = await pool.request().query`
      SELECT ItemID, OutletID, Rate FROM ItemRates
    `;

    // Group rates by ItemID
    const ratesByItem = new Map<number, any[]>();
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
