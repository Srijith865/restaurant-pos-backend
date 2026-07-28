import { Router, Request, Response } from "express";
import { z } from "zod";
import { getAllDevices, setDeviceApproval } from "../lib/securityStore";
import { getDb, sql } from "../lib/db";

const router = Router();

// Middleware to ensure user is an admin
router.use((req, res, next) => {
  // @ts-ignore
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
});

// 🍔 GET /admin/devices
router.get("/devices", async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = await getAllDevices();
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

// 🍔 POST /admin/devices/:id/approve
router.post("/devices/:id/approve", async (req: Request, res: Response): Promise<void> => {
  try {
    await setDeviceApproval(req.params.id as string, true);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve device" });
  }
});

// 🍔 POST /admin/devices/:id/revoke
router.post("/devices/:id/revoke", async (req: Request, res: Response): Promise<void> => {
  try {
    await setDeviceApproval(req.params.id as string, false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to revoke device" });
  }
});

// 🍔 DELETE /admin/devices/:id
router.delete("/devices/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = await getDb();
    await pool.request()
      .input("deviceId", sql.VarChar, req.params.id as string)
      .query(`DELETE FROM AuthorizedDevices WHERE DeviceId = @deviceId`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete device" });
  }
});

export default router;
