/**
 * Express application entry point.
 *
 * Mounts:
 *   /auth       — onboard + login  (public)
 *   /me         — staff profile     (protected)
 *   /categories — menu categories   (protected)
 *   /items      — menu items        (protected)
 *   /tables     — dining tables     (protected)
 *   /orders     — order lifecycle   (protected)
 *   /kot        — kitchen tickets   (protected)
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import categoryRoutes from "./routes/categories";
import itemRoutes from "./routes/items";
import tableRoutes from "./routes/tables";
import orderRoutes from "./routes/orders";
import kotRoutes from "./routes/kot";
import { requireAuth } from "./middleware/auth";

const app = express();

// ── Global middleware ───────────────────────────────────────────────
app.use(cors());
app.use(helmet());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/me", requireAuth, meRoutes);
app.use("/categories", requireAuth, categoryRoutes);
app.use("/items", requireAuth, itemRoutes);
app.use("/tables", requireAuth, tableRoutes);
app.use("/orders", requireAuth, orderRoutes);
app.use("/kot", requireAuth, kotRoutes);

// ── Health check ────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Start server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
