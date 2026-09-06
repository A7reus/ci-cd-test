import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
  database: process.env.DB_NAME || process.env.POSTGRES_DB_NAME || "myappdb_dev",
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWD || process.env.POSTGRES_PASSWORD || "devpassword123",
});

export const initDb = async () => {
  const postsQuery = `
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')
    );
  `;

  const anindyaUsersQuery = `
    CREATE TABLE IF NOT EXISTS anindya_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')
    );
  `;

  const marufUsersQuery = `
    CREATE TABLE IF NOT EXISTS maruf_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')
    );
  `;

  const hashedPassword = await bcrypt.hash("admin123", 10);
  const twahaUsersQuery = `
    DO $$
    BEGIN
        CREATE TYPE user_roles AS ENUM ('USER', 'ADMIN');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END
    $$;

    CREATE TABLE IF NOT EXISTS twaha_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role user_roles DEFAULT 'USER',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')
    );

    INSERT INTO twaha_users (username, email, password, role)
    SELECT 'admin', 'admin@jucsef.me', '${hashedPassword}', 'ADMIN'
    WHERE NOT EXISTS (
        SELECT 1 FROM twaha_users WHERE email = 'admin@jucsef.me'
    );
  `;

  const diptaUsersQuery = `
    CREATE TABLE IF NOT EXISTS dipta_users(
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

  try {
    await pool.query(postsQuery);
    await pool.query(anindyaUsersQuery);
    await pool.query(twahaUsersQuery);
    await pool.query(diptaUsersQuery);
    await pool.query(marufUsersQuery);

    console.log(
      "Database initialized successfully (posts and anindya_users , Dipta_users tables ready).",
    );
    console.log("twaha_users table created successfully");
    console.log("maruf_users table created successfully");
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
};
