import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

// GET /items
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    
    const categoryId = req.query.categoryId as string;

    let query = `
      SELECT 
        i.ItemID, 
        i.ItemName, 
        i.Rate, 
        i.CategoryID,
        c.CategoryName
      FROM Items i
      LEFT JOIN Categories c ON i.CategoryID = c.CategoryID
    `;

    if (categoryId && categoryId !== "0" && categoryId !== "all") {
      query += ` WHERE i.CategoryID = @categoryId`;
    }
    
    query += ` ORDER BY c.CategoryName ASC, i.ItemName ASC`;

    const request = pool.request();
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
      price: row.Rate || 0,
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
