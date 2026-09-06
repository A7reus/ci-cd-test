import { pool } from "../config/db.js";
import type { SafeUser, User } from "../types/marufUserType.js";

export const MarufUserModel = {
  async create(
    username: string,
    email: string,
    hashedPassword: string,
    role: string = "user",
  ): Promise<SafeUser> {
    const query = `
      INSERT INTO maruf_users (username, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, role, created_at, updated_at
    `;
    const res = await pool.query(query, [username, email, hashedPassword, role]);
    return res.rows[0];
  },

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM maruf_users WHERE email = $1`;
    const res = await pool.query(query, [email]);
    return res.rows[0] || null;
  },

  async findByUsername(username: string): Promise<User | null> {
    const query = `SELECT * FROM maruf_users WHERE username = $1`;
    const res = await pool.query(query, [username]);
    return res.rows[0] || null;
  },

  async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    const query = `SELECT * FROM maruf_users WHERE email = $1 OR username = $2`;
    const res = await pool.query(query, [email, username]);
    return res.rows[0] || null;
  },

  async findById(id: number): Promise<SafeUser | null> {
    const query = `SELECT id, username, email, role, created_at, updated_at FROM maruf_users WHERE id = $1`;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  },

  async findByLoginIdentifier(identifier: string): Promise<User | null> {
    const query = `SELECT * FROM maruf_users WHERE email = $1 OR username = $1`;
    const res = await pool.query(query, [identifier]);
    return res.rows[0] || null;
  },

  async updateRole(id: number, role: string): Promise<SafeUser | null> {
    const query = `
      UPDATE maruf_users 
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, role, created_at, updated_at
    `;
    const res = await pool.query(query, [role, id]);
    return res.rows[0] || null;
  },
};
