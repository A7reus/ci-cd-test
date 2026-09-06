# MARUF AUTH - JWT Authentication & RBAC Documentation

This document describes the isolated authentication and authorization system implemented for `maruf_users`. The post CRUD API (`/api/posts`) is intentionally **not** wired to auth and remains public.

---

## User Model & Database

**Table:** `maruf_users` (`server/src/config/db.ts`)

```sql
CREATE TABLE maruf_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')
);
```

**Types:** `server/src/types/marufUserType.ts`

```ts
type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
};

type SafeUser = Omit<User, "password">;

type JwtPayload = {
  id: number;
  username: string;
  email: string;
  role: string;
};
```

**Model:** `server/src/models/marufUserModel.ts`

- `MarufUserModel.create(username, email, hashedPassword, role)` - Creates new user
- `MarufUserModel.findByEmail(email)` - Find user by email (case-sensitive)
- `MarufUserModel.findByUsername(username)` - Find user by username (case-sensitive)
- `MarufUserModel.findByEmailOrUsername(email, username)` - Check duplicates
- `MarufUserModel.findById(id)` - Get safe user (no password)
- `MarufUserModel.findByLoginIdentifier(identifier)` - Login with email OR username
- `MarufUserModel.updateRole(id, role)` - Update user role

All queries are case-sensitive (`WHERE email = $1`).

---

## JWT

`server/src/utils/marufJwt.ts` uses `jsonwebtoken@9.0.3`:

| Setting | Source | Default |
|---------|--------|---------|
| **Secret** | `process.env.JWT_SECRET` | `dev_jwt_secret_change_in_production` |
| **Expiry** | `process.env.JWT_EXPIRES_IN` | `7d` |
| **Payload** | `{ id, username, email, role }` | - |

**Functions:**
- `signToken(payload)` - Generates JWT token
- `verifyToken(token)` - Verifies and decodes token
- `getJwtSecret()` - Returns secret from environment

Tokens are returned on register/login and must be sent as `Authorization: Bearer <token>`.

---

## Middleware

**Authentication:** `server/src/middleware/marufAuthMiddleware.ts` `authMiddleware`

- Checks `Authorization` header starts with `Bearer `
- Missing/invalid → `401 {errCode:200, errMsg:"Unauthorized: Missing or invalid token"}`
- Empty token after `Bearer ` → `401 errCode 200`
- Invalid/expired via `verifyToken` → `401 {errCode:201, errMsg:"Unauthorized: Invalid or expired token"}`
- On success `c.set("user", payload)` and `await next()`

**RBAC:** `server/src/middleware/marufAuthMiddleware.ts` `adminMiddleware`

- Requires `c.get("user")` exists, else `401 errCode 202`
- If `user.role !== "admin"` → `403 {errCode:203, errMsg:"Forbidden: Admin access required"}`
- On success `await next()`

---

## Routes

All auth routes mounted at `/api/maruf/auth` (`server/src/index.ts`), isolated from `/api/posts`.

`server/src/routes/marufAuthRoutes.ts`:

```ts
marufAuthRoutes.post("/register", register);
marufAuthRoutes.post("/login", login);
marufAuthRoutes.get("/me", authMiddleware, getMe);
```

### POST /api/maruf/auth/register

Public. Controller `server/src/controllers/marufAuthController.ts` validates, checks existing email/username, hashes with `bcryptjs` (10 rounds), creates user, signs JWT.

**Request Body:**

| Field      | Type   | Required | Constraints                                                          |
| ---------- | ------ | -------- | -------------------------------------------------------------------- |
| `username` | string | Yes      | 3-100 chars, trimmed, unique                                         |
| `email`    | string | Yes      | valid format `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, trimmed, unique         |
| `password` | string | Yes      | 6-255 chars                                                          |
| `role`     | string | No       | `user` or `admin` (lowercased), defaults to `user`                   |

**Example Request:**

```json
{
  "username": "Maruf_Test",
  "email": "Maruf_Test@Example.COM",
  "password": "Password123!",
  "role": "user"
}
```

**Success 201:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "Maruf_Test",
    "email": "Maruf_Test@Example.COM",
    "role": "user",
    "created_at": "2026-09-05T12:00:00.000Z",
    "updated_at": "2026-09-05T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**

- `400 errCode 210` Invalid JSON body
- `400 errCode 211` Username is required
- `400 errCode 212` Username must be at least 3 characters
- `400 errCode 213` Username must be at most 100 characters
- `400 errCode 214` Email is required
- `400 errCode 215` Invalid email format
- `400 errCode 216` Password is required
- `400 errCode 217` Password must be at least 6 characters
- `400 errCode 218` Password must be at most 255 characters
- `409 errCode 219` Email already registered (case-sensitive)
- `409 errCode 220` Username already taken (case-sensitive)
- `500 errCode 222` Internal error

Case-sensitive: `Maruf@Example.COM` and `maruf@example.com` are distinct.

---

### POST /api/maruf/auth/login

Public. Controller `server/src/controllers/marufAuthController.ts` verifies email OR username (case-sensitive) and password, generates JWT.

**Request Body:**

| Field      | Type   | Required                         |
| ---------- | ------ | -------------------------------- |
| `email`    | string | Yes (trimmed, case-sensitive)    |
| `username` | string | Yes (trimmed, case-sensitive)    |
| `identifier` | string | Yes (email OR username)        |
| `password` | string | Yes                              |

**Example Request (with email):**

```json
{
  "email": "Maruf_Test@Example.COM",
  "password": "Password123!"
}
```

**Example Request (with username):**

```json
{
  "username": "Maruf_Test",
  "password": "Password123!"
}
```

**Success 200:**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "Maruf_Test",
    "email": "Maruf_Test@Example.COM",
    "role": "user",
    "created_at": "...",
    "updated_at": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**

- `400 errCode 230` Invalid JSON body
- `400 errCode 231` Email or username is required
- `400 errCode 232` Password is required
- `401 errCode 233` Invalid credentials (user not found or password mismatch)
- `500 errCode 234` Internal error

Wrong case (`maruf_test@example.com` vs `Maruf_Test@Example.COM`) returns 401 due to case-sensitive lookup.

---

### GET /api/maruf/auth/me

Protected (any authenticated user). Controller `server/src/controllers/marufAuthController.ts` `getMe` via `authMiddleware`.

**Headers:**

| Header          | Value            | Required |
| --------------- | ---------------- | -------- |
| `Authorization` | `Bearer <token>` | Yes      |

**Example Request:**

```
GET /api/maruf/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success 200:**

```json
{
  "user": {
    "id": 1,
    "username": "Maruf_Test",
    "email": "Maruf_Test@Example.COM",
    "role": "user",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Errors:**

- `401 errCode 200` Missing or invalid token (no header, no Bearer prefix, empty token)
- `401 errCode 201` Invalid or expired token
- `404 errCode 235` User not found
- `500 errCode 236` Failed to fetch user

---

## Postman Tests

**File:** `server/tests/postman/maruf_auth.json` (3 requests, `pm.sendRequest` for full coverage)

- **Register - POST /api/maruf/auth/register** prerequest generates `testUsername`/`testEmail` (`Maruf_<ts>_<rand>` / `Maruf_<ts>_<rand>@Example.COM`) and `adminUsername`/`adminEmail`. Tests: success 201, duplicate email 409 errCode 219, duplicate username 409 errCode 220, case-sensitive distinct email (separate `CaseEmail_*@Example.COM` pair both 201), missing/short username 400 errCode 211/212, missing/invalid email 400 errCode 214/215, missing/short password 400 errCode 216/217, admin register 201 role admin.

- **Login - POST /api/maruf/auth/login** main request login with `testEmail` success 200 (saves `authToken`), then `sendRequest` for admin login 200 (saves `adminToken`), wrong case email 401 errCode 233 (case-sensitive), wrong password 401, missing identifier 400 errCode 231, missing password 400 errCode 232, non-existent 401.

- **Protected - GET /api/maruf/auth/me** main `GET /me` with `Bearer {{authToken}}` success 200, then `sendRequest` for missing token 401 errCode 200, invalid token 401 errCode 201, malformed header (no Bearer) 401, empty Bearer 401.

Run: `pnpm dlx newman run server/tests/postman/maruf_auth.json` (also in CI `.github/workflows/ci.yml`).

Post CRUD tests (`post_*_endpoint.json`) remain untouched and are not protected, demonstrating separation.

---

## Example cURL Commands

```bash
# Register user
curl -X POST http://localhost:5000/api/maruf/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"maruf","email":"maruf@example.com","password":"Password123!","role":"user"}'

# Register admin
curl -X POST http://localhost:5000/api/maruf/auth/register \
  -H "Content-Type": "application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"AdminPass123!","role":"admin"}'

# Login with email
curl -X POST http://localhost:5000/api/maruf/auth/login \
  -H "Content-Type": "application/json" \
  -d '{"email":"maruf@example.com","password":"Password123!"}'

# Login with username
curl -X POST http://localhost:5000/api/maruf/auth/login \
  -H "Content-Type": "application/json" \
  -d '{"username":"maruf","password":"Password123!"}'

# Me (protected)
curl http://localhost:5000/api/maruf/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## Error Codes Summary

| Code | Status | Message |
|------|--------|---------|
| 200 | 401 | Unauthorized: Missing or invalid token |
| 201 | 401 | Unauthorized: Invalid or expired token |
| 202 | 401 | Unauthorized |
| 203 | 403 | Forbidden: Admin access required |
| 210 | 400 | Invalid JSON body |
| 211 | 400 | Username is required |
| 212 | 400 | Username must be at least 3 characters |
| 213 | 400 | Username must be at most 100 characters |
| 214 | 400 | Email is required |
| 215 | 400 | Invalid email format |
| 216 | 400 | Password is required |
| 217 | 400 | Password must be at least 6 characters |
| 218 | 400 | Password must be at most 255 characters |
| 219 | 409 | Email already registered |
| 220 | 409 | Username already taken |
| 222 | 500 | Failed to register user |
| 230 | 400 | Invalid JSON body |
| 231 | 400 | Email or username is required |
| 232 | 400 | Password is required |
| 233 | 401 | Invalid credentials |
| 234 | 500 | Failed to login |
| 235 | 404 | User not found |
| 236 | 500 | Failed to fetch user |