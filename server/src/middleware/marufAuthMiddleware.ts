import type { Context, Next } from "hono";
import { verifyToken } from "../utils/marufJwt.js";
import type { JwtPayload } from "../types/marufUserType.js";  // ← Import your type

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization") || c.req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { errCode: 200, errMsg: "Unauthorized: Missing or invalid token" },
      401,
    );
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return c.json({ errCode: 200, errMsg: "Unauthorized: Missing token" }, 401);
  }

  try {
    const payload = verifyToken(token) as JwtPayload;
    c.set("user", payload);
    await next();
  } catch (err) {
    return c.json(
      { errCode: 201, errMsg: "Unauthorized: Invalid or expired token" },
      401,
    );
  }
};

// Role-based middleware - Admin only
export const adminMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user") as JwtPayload;
  if (!user) {
    return c.json({ errCode: 202, errMsg: "Unauthorized" }, 401);
  }
  if (user.role !== "admin") {
    return c.json(
      { errCode: 203, errMsg: "Forbidden: Admin access required" },
      403,
    );
  }
  await next();
};

// Role-based middleware - User or Admin
export const userOrAdminMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user") as JwtPayload;
  if (!user) {
    return c.json({ errCode: 202, errMsg: "Unauthorized" }, 401);
  }
  if (user.role !== "user" && user.role !== "admin") {
    return c.json(
      { errCode: 204, errMsg: "Forbidden: User or Admin access required" },
      403,
    );
  }
  await next();
};