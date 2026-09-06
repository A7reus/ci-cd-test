import "dotenv/config";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types/marufUserType.js";

export const getJwtSecret = (): string =>
  process.env.JWT_SECRET || "6f90715dca464778a58e586493429a756904c5b972e8c026cbc31ce4da0b62a5";

export const getJwtExpiresIn = (): string => process.env.JWT_EXPIRES_IN || "7d";

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
};
