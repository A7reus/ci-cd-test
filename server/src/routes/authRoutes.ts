import { Hono } from "hono";
import {
  register,
  login,
  getMe,
  getAdminData,
  getAllUsers,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  registerLimiter,
  loginLimiter,
  authGeneralLimiter,
} from "../middleware/rateLimitMiddleware.js";

const authRoutes = new Hono();

// public routes (strict rate limits)
authRoutes.post("/register", registerLimiter, register);
authRoutes.post("/login", loginLimiter, login);

// protected routes - authentication required (loose rate limits)
authRoutes.get("/me", authGeneralLimiter, authMiddleware, getMe);
authRoutes.get("/profile", authGeneralLimiter, authMiddleware, getMe);

// RBAC - admin only (loose rate limits)
authRoutes.get(
  "/admin",
  authGeneralLimiter,
  authMiddleware,
  authorize("admin"),
  getAdminData,
);
authRoutes.get(
  "/users",
  authGeneralLimiter,
  authMiddleware,
  authorize("admin"),
  getAllUsers,
);

export default authRoutes;
