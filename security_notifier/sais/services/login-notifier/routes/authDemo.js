const express = require("express");
const { z } = require("zod");
const router = express.Router();

const {
  handleSuccessfulLoginSecurity,
  handleFailedLoginSecurity,
} = require("../services/securityNotifier");
const { sendNotification } = require("../services/notifier");
const { recordFailedAttempt, resetAttempts, getClientIp } = require("../services/loginLimiter");

// Demo user; external teams will replace this with real auth.
const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@example.com",
  password: "password123",
};

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

router.post("/login", async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parseResult.error.errors
      });
    }

    const { email, password } = parseResult.data;
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";

    const isValid =
      email === DEMO_USER.email && password === DEMO_USER.password;

    if (!isValid) {
      const failedCountForThisUser = await recordFailedAttempt({
        userId: DEMO_USER.id,
        ip,
      });

      await handleFailedLoginSecurity({
        userId: DEMO_USER.id,
        ip,
        userAgent,
        failedCountForThisUser,
      });

      return res.status(401).json({
        error: "Invalid credentials",
        failedAttempts: failedCountForThisUser,
      });
    }

    await resetAttempts({ userId: DEMO_USER.id, ip });

    await handleSuccessfulLoginSecurity({
      userId: DEMO_USER.id,
      ip,
      userAgent,
    });

    await sendNotification({
      userId: DEMO_USER.id,
      title: "Login Successful",
      message: "You have successfully logged in (demo).",
      type: "system",
    });

    // In a real app, you would issue a JWT here.
    res.json({
      message: "Login successful",
      userId: DEMO_USER.id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

