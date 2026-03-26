const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

/**
 * Middleware: Supports BOTH
 * 1. Demo mode → x-demo-user-id header
 * 2. Real mode → JWT via requireAuth
 */
router.use((req, res, next) => {
  const demoUserId = req.header("x-demo-user-id");

  // ✅ Demo mode (used for testing / external integration)
  if (demoUserId) {
    req.user = { id: demoUserId };
    return next();
  }

  // ✅ Fallback to real authentication
  return requireAuth(req, res, next);
});

/**
 * GET /api/notifications
 * Fetch all notifications for logged-in user
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await db.query(
      `SELECT *
         FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch("/:id/read", async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = req.params.id;

    await db.query(
      `UPDATE notifications
          SET status = 'read',
              read_at = NOW()
        WHERE id = $1
          AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;