import { Hono } from "hono";
import { register, login, getMe } from "../controllers/marufAuthController.js";
import { authMiddleware, adminMiddleware } from "../middleware/marufAuthMiddleware.js";
import { pool } from "../config/db.js";
import type { JwtPayload } from "../types/marufUserType.js";

const authRoutes = new Hono<{ Variables: { user: JwtPayload } }>();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.get("/me", authMiddleware, getMe);

authRoutes.get("/admin-only", authMiddleware, adminMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    message: "Admin access granted!",
    user: { id: user.id, username: user.username, role: user.role }
  });
});

authRoutes.get("/users", authMiddleware, adminMiddleware, async (c) => {
  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM maruf_users ORDER BY id"
  );
  return c.json({ users: result.rows, count: result.rows.length });
});

export default authRoutes;