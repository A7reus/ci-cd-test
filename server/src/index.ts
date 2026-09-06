import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import postRoutes from "./routes/postRoutes.js";
import marufAuthRoutes from "./routes/marufAuthRoutes.js";
import anindyaAuthRoutes from "./routes/authRoutes.js";
import { initDb } from "./config/db.js";
import twahaAuthRoutes from "./routes/twahaAuthRoutes.js";
import diptaAuthRoutes from "./routes/diptaAuthRoutes.js";

const app = new Hono();

// Initialize database
initDb();

// Middleware
app.use(logger());

// Healthcheck
app.get("/", (c) => c.text("Forum API server running..."));

// Routes
app.route("/api/posts", postRoutes);

app.route("/api/anindya/auth", anindyaAuthRoutes);
app.route("/api/twaha/auth", twahaAuthRoutes);
app.route("/api/dipta/auth",diptaAuthRoutes);
app.route("/api/maruf/auth", marufAuthRoutes);

const port = Number(process.env.PORT) || 5000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});