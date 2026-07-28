import { Router, Request, Response } from "express";
import { getDb, sql } from "../lib/db";

const router = Router();

// Middleware to ensure user is an admin
router.use((req, res, next) => {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
});

// GET /waiters - List all waiters and their permissions
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    const result = await pool.request()
      .query(`SELECT WaiterID, WaiterName, allowtables, allowoutlets FROM Waiters`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch waiters:", err);
    res.status(500).json({ error: "Failed to fetch waiters" });
  }
});

// PUT /waiters/:id/permissions - Update a waiter's permissions
router.put("/:id/permissions", async (req: Request, res: Response): Promise<void> => {
  const { allowtables, allowoutlets } = req.body;
  try {
    const pool = await getDb();
    await pool.request()
      .input("waiterId", sql.Int, parseInt(req.params.id as string, 10))
      .input("allowtables", sql.VarChar, allowtables || "")
      .input("allowoutlets", sql.VarChar, allowoutlets || "")
      .query(`
        UPDATE Waiters 
        SET allowtables = @allowtables, allowoutlets = @allowoutlets 
        WHERE WaiterID = @waiterId
      `);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update permissions:", err);
    res.status(500).json({ error: "Failed to update permissions" });
  }
});

export default router;
