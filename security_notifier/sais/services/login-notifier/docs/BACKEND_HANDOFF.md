# Login Notifier + Security Alerts (Backend Handoff)

This is a **drop-in notification + security alert toolkit** for a Node.js (Express) + PostgreSQL backend.

## What you get

- **One-line tool** for any backend module: `await sendNotification({...})`
- **Security tools** for login anomaly alerts:
  - `handleSuccessfulLoginSecurity(...)`
  - `handleFailedLoginSecurity(...)`
- **Frontend APIs**
  - list notifications
  - mark as read
- **Workflow diagrams**
  - See `diagrams/` (included in this handoff pack)

## Requirements

- Node.js 18+ recommended
- PostgreSQL 13+
- Backend already has authentication (JWT/session). This pack assumes you can access a `userId` in the login flow and in authenticated routes.

## Step A — Database schema (PostgreSQL)

Run `docs/schema.sql` in your database.

Notes:
- Uses `gen_random_uuid()` from `pgcrypto` extension.
- If your system uses `uuid-ossp` instead, swap defaults accordingly.

## Step B — Install dependencies

```bash
npm install pg geoip-lite dotenv
```

## Step C — Add files (drop-in)

Copy these files into your backend:

- `db.js`
- `services/notifier.js`
- `services/securityNotifier.js`
- `routes/notifications.js`

If your project already has a DB client and error middleware, keep yours and just wire the services to it.

## Step D — Wire routes in Express

In `app.js` (or `server.js`):

```js
const notificationRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationRoutes);
```

## Step E — Use the tool anywhere (business events)

```js
const { sendNotification } = require("./services/notifier");

await sendNotification({
  userId: telecallerId,
  title: "New Lead Assigned",
  message: "A new student lead has been assigned to you.",
  type: "lead",
  metadata: { lead_id: leadId }
});
```

## Step F — Security alerts: hook into login flow

### After successful login

Call this **after** credentials are verified (you know the `userId`), but **before** you return the response:

```js
const { handleSuccessfulLoginSecurity } = require("./services/securityNotifier");

await handleSuccessfulLoginSecurity({
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers["user-agent"] || "unknown"
});
```

### After failed login

Call this when credentials fail. You provide `failedCountForThisUser` using your existing tracking (DB/Redis/in-memory).

```js
const { handleFailedLoginSecurity } = require("./services/securityNotifier");

await handleFailedLoginSecurity({
  userId: user?.id, // if known; otherwise null
  ip: req.ip,
  userAgent: req.headers["user-agent"] || "unknown",
  failedCountForThisUser
});
```

## APIs provided (for frontend)

### List notifications

`GET /api/notifications`

Returns notifications for the authenticated user ordered by newest first.

### Mark as read

`PATCH /api/notifications/:id/read`

Marks a notification as read (only for the authenticated user).

## Standard notification types

- `security`
- `lead`
- `admission`
- `finance`
- `system`

## Standard security event types

- `NEW_DEVICE_LOGIN`
- `NEW_IP_LOGIN`
- `NEW_LOCATION_LOGIN`
- `LOGIN_FAILED`
- `MULTIPLE_FAILED_LOGINS`
- `ACCOUNT_LOCKED`
- `LOGIN_SUCCESS`

## Files included in this pack

- `docs/schema.sql`
- `db.js`
- `services/notifier.js`
- `services/securityNotifier.js`
- `routes/notifications.js`
- `docs/API.md`
- `diagrams/*.png`

