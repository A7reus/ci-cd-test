import type { Context, Next } from "hono";

type Bucket = {
  count: number;
  resetTime: number;
};

const getEnvInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const isRateLimitEnabled = (): boolean => {
  const raw = process.env.RATE_LIMIT_ENABLED;
  if (raw === undefined || raw === "") return true;
  const normalized = raw.toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "disabled";
};

const getClientIp = (c: Context): string => {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = c.req.header("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "anonymous";
};

// Separate bucket maps per tier so register spam doesn't eat login budget.
const registerStore = new Map<string, Bucket>();
const loginStore = new Map<string, Bucket>();
const generalStore = new Map<string, Bucket>();

const checkLimit = async (
  c: Context,
  next: Next,
  store: Map<string, Bucket>,
  envKey: string,
  fallbackMax: number,
  errMsg: string,
) => {
  if (!isRateLimitEnabled()) {
    await next();
    return;
  }
  const windowMs = getEnvInt("RATE_LIMIT_WINDOW_MS", 60_000);
  const max = getEnvInt(envKey, fallbackMax);
  const now = Date.now();
  const key = getClientIp(c);
  let bucket = store.get(key);
  if (!bucket || bucket.resetTime <= now) {
    bucket = { count: 0, resetTime: now + windowMs };
    store.set(key, bucket);
  }
  // Lazy prune occasionally to bound memory
  if (store.size > 10000 && Math.random() < 0.01) {
    for (const [k, b] of store) {
      if (b.resetTime <= now) store.delete(k);
    }
  }
  bucket.count += 1;
  const remaining = Math.max(0, max - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000));
  c.header("RateLimit-Limit", String(max));
  c.header("RateLimit-Remaining", String(remaining));
  c.header("RateLimit-Reset", String(Math.ceil(bucket.resetTime / 1000)));
  if (bucket.count > max) {
    c.header("Retry-After", String(retryAfterSec));
    return c.json(
      {
        errCode: 429,
        errMsg: `${errMsg}. Retry after ${retryAfterSec}s`,
        retryAfter: retryAfterSec,
      },
      429,
    );
  }
  await next();
};

// Strict: 5 register / 60s per IP
export const registerLimiter = async (c: Context, next: Next) =>
  checkLimit(
    c,
    next,
    registerStore,
    "RATE_LIMIT_REGISTER_MAX",
    5,
    "Too Many Requests: register rate limit exceeded",
  );

// Medium-strict: 10 login / 60s per IP
export const loginLimiter = async (c: Context, next: Next) =>
  checkLimit(
    c,
    next,
    loginStore,
    "RATE_LIMIT_LOGIN_MAX",
    10,
    "Too Many Requests: login rate limit exceeded",
  );

// Loose: 60 authed requests / 60s per IP
export const authGeneralLimiter = async (c: Context, next: Next) =>
  checkLimit(
    c,
    next,
    generalStore,
    "RATE_LIMIT_GENERAL_MAX",
    60,
    "Too Many Requests: rate limit exceeded",
  );
