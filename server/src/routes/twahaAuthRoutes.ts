import { Hono } from "hono";
import { register, login, getAccountInfo, updateAccountRole } from "../controllers/twahaAuthController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  registerLimiter,
  loginLimiter,
  authGeneralLimiter,
} from "../middleware/rateLimitMiddleware.js";

const twahaAuthRoutes = new Hono();

// public routes (strict rate limits)
twahaAuthRoutes.post("/register", registerLimiter, register);
twahaAuthRoutes.post("/login", loginLimiter, login);

// protected routes (loose rate limits)
twahaAuthRoutes.get(
  "/account-info",
  authGeneralLimiter,
  authMiddleware,
  getAccountInfo,
);
twahaAuthRoutes.put(
  "/update-account-role",
  authGeneralLimiter,
  authMiddleware,
  updateAccountRole,
);

export default twahaAuthRoutes;
