import { Hono } from "hono";

import {
  registerDipta,
  loginDipta,
  getDiptaMe,
} from "../controllers/diptaAuthController.js";

import { diptaAuthMiddleware } from "../middleware/diptaAuthMiddleware.js";

import { diptaRoleMiddleware } from "../middleware/diptaRoleMiddleware.js";
import {
  registerLimiter,
  loginLimiter,
  authGeneralLimiter,
} from "../middleware/rateLimitMiddleware.js";
import type { DiptaJwtPayload } from "../types/diptaUserType.js";

const diptaAuthRoutes = new Hono<{
  Variables: {
    diptaUser: DiptaJwtPayload;
  };
}>();

diptaAuthRoutes.post(
  "/register",
  registerLimiter,
  registerDipta,
);

diptaAuthRoutes.post(
  "/login",
  loginLimiter,
  loginDipta,
);

diptaAuthRoutes.get(
  "/me",
  authGeneralLimiter,
  diptaAuthMiddleware,

  getDiptaMe,
);

diptaAuthRoutes.get(
  "/admin",
  authGeneralLimiter,
  diptaAuthMiddleware,
  diptaRoleMiddleware("admin"),
  (c) => {
    const user = c.get("diptaUser");

    return c.json({
      message: "Admin access granted",
      user,
    });
  },
);

export default diptaAuthRoutes;
