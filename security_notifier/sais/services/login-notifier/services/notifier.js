const db = require("../db");
const { dispatchWebhook } = require("./webhookService");

async function sendNotification({
  userId,
  title,
  message,
  type = "system",
  metadata = {},
}) {
  const result = await db.query(
    `INSERT INTO notifications
      (user_id, title, message, type, status, metadata)
     VALUES ($1, $2, $3, $4, 'unread', $5)
     RETURNING *`,
    [userId, title, message, type, metadata]
  );

  // Dispatch webhooks asynchronously without blocking
  dispatchWebhook({ title, message, type, metadata }).catch(err => console.error("Webhook dispatch failed", err));

  return result.rows[0];
}

module.exports = { sendNotification };


