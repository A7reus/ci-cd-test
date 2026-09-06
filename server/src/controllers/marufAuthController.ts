import type { Context } from "hono";
import bcrypt from "bcryptjs";
import { MarufUserModel } from "../models/marufUserModel.js";
import { signToken } from "../utils/marufJwt.js";

// POST /api/maruf/auth/register
export const register = async (c: Context) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ errCode: 210, errMsg: "Invalid JSON body" }, 400);
    }

    const { username, email, password, role } = body;
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanPassword = typeof password === "string" ? password : "";
    const cleanRole = typeof role === "string" ? role.trim().toLowerCase() : "user";

    // Validation
    if (!cleanUsername) {
      return c.json({ errCode: 211, errMsg: "Username is required" }, 400);
    }
    if (cleanUsername.length < 3) {
      return c.json(
        { errCode: 212, errMsg: "Username must be at least 3 characters" },
        400,
      );
    }
    if (cleanUsername.length > 100) {
      return c.json(
        { errCode: 213, errMsg: "Username must be at most 100 characters" },
        400,
      );
    }

    if (!cleanEmail) {
      return c.json({ errCode: 214, errMsg: "Email is required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return c.json({ errCode: 215, errMsg: "Invalid email format" }, 400);
    }

    if (!cleanPassword) {
      return c.json({ errCode: 216, errMsg: "Password is required" }, 400);
    }
    if (cleanPassword.length < 6) {
      return c.json(
        { errCode: 217, errMsg: "Password must be at least 6 characters" },
        400,
      );
    }
    if (cleanPassword.length > 255) {
      return c.json(
        { errCode: 218, errMsg: "Password must be at most 255 characters" },
        400,
      );
    }

    // Check existing user
    const existing = await MarufUserModel.findByEmailOrUsername(cleanEmail, cleanUsername);
    if (existing) {
      if (existing.email === cleanEmail) {
        return c.json(
          { errCode: 219, errMsg: "Email already registered" },
          409,
        );
      }
      if (existing.username === cleanUsername) {
        return c.json({ errCode: 220, errMsg: "Username already taken" }, 409);
      }
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const newUser = await MarufUserModel.create(
      cleanUsername,
      cleanEmail,
      hashedPassword,
      cleanRole,
    );

    const token = signToken({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    });

    return c.json(
      {
        message: "User registered successfully",
        user: newUser,
        token,
      },
      201,
    );
  } catch (error) {
    console.error("Register error:", error);
    return c.json(
      {
        errCode: 222,
        errMsg: "Failed to register user due to internal server error",
      },
      500,
    );
  }
};

// POST /api/maruf/auth/login
export const login = async (c: Context) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ errCode: 230, errMsg: "Invalid JSON body" }, 400);
    }

    const identifierRaw = body.email ?? body.username ?? body.identifier ?? "";
    const passwordRaw = body.password ?? "";
    const identifier = typeof identifierRaw === "string" ? identifierRaw.trim() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    if (!identifier) {
      return c.json(
        { errCode: 231, errMsg: "Email or username is required" },
        400,
      );
    }
    if (!password) {
      return c.json({ errCode: 232, errMsg: "Password is required" }, 400);
    }

    const user = await MarufUserModel.findByLoginIdentifier(identifier);
    if (!user) {
      return c.json({ errCode: 233, errMsg: "Invalid credentials" }, 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return c.json({ errCode: 233, errMsg: "Invalid credentials" }, 401);
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return c.json(
      {
        message: "Login successful",
        user: safeUser,
        token,
      },
      200,
    );
  } catch (error) {
    console.error("Login error:", error);
    return c.json(
      { errCode: 234, errMsg: "Failed to login due to internal server error" },
      500,
    );
  }
};

// GET /api/maruf/auth/me - protected
export const getMe = async (c: Context) => {
  try {
    const payload = c.get("user");
    if (!payload) {
      return c.json({ errCode: 200, errMsg: "Unauthorized" }, 401);
    }

    const user = await MarufUserModel.findById(payload.id);
    if (!user) {
      return c.json({ errCode: 235, errMsg: "User not found" }, 404);
    }

    return c.json({ user }, 200);
  } catch (error) {
    console.error("GetMe error:", error);
    return c.json({ errCode: 236, errMsg: "Failed to fetch user" }, 500);
  }
};
