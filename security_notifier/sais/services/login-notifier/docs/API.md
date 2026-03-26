# Notification + Security API

This document describes the HTTP endpoints added by `routes/notifications.js`.

## Auth assumption

These routes assume your authentication middleware populates:

- `req.user.id` (UUID)

If your system uses a different shape, update the route code accordingly.

## List notifications

**Endpoint**

- `GET /api/notifications`

**Response**

- `200 OK` JSON array of notification rows.

## Mark notification as read

**Endpoint**

- `PATCH /api/notifications/:id/read`

**Behavior**

- Only updates if the notification belongs to `req.user.id`.

**Response**

- `200 OK` `{ "success": true }`

