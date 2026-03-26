/**
 * routes/scan.js
 * ---------------
 * POST /scan/file
 *
 * Ultra-final polish:
 *   ✅ Task 3 — Uses ok() / fail() response helper throughout
 *   ✅ Task 5 — [INFO] / [WARN] / [ERROR] log-level tags on all console calls
 */

"use strict";

const express       = require("express");
const multer        = require("multer");
const fs            = require("fs");
const { scanFile }  = require("../services/scanner");
const { ok, fail }  = require("../utils/response");

const router = express.Router();

// ─── Multer: memory storage, 10 MB cap ───────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

// ─── Helper: silent temp-file cleanup ────────────────────────────────────────
function safeDelete(filePath) {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); } catch (_) { /* already gone or memory-only */ }
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * POST /scan/file
 *
 * Body   : multipart/form-data — field name "file"
 *
 * HTTP codes:
 *   200 — clean
 *   408 — scan timed out
 *   413 — file too large
 *   422 — infected / suspicious
 *   500 — internal scanner error
 */
router.post("/file", upload.single("file"), async (req, res) => {
  // ── No file ───────────────────────────────────────────────────────────────
  if (!req.file) {
    return fail(res, "No file uploaded. Use field name 'file' in a multipart/form-data request.", 400);
  }

  // Task 5: [INFO] level tag
  console.log(
    `[${req.id}] [INFO]  [SAIS SCAN] File: ${req.file.originalname} ` +
    `(${(req.file.size / 1024).toFixed(1)} KB, ${req.file.mimetype})`
  );

  const diskPath = req.file.path || null;

  try {
    const result = await scanFile(req.file);

    // Task 5: [INFO] tag
    console.log(`[${req.id}] [INFO]  [SAIS SCAN] Result: ${result.status.toUpperCase()}`);

    safeDelete(diskPath);

    // Task 3: use ok() / fail() helper
    // infected → HTTP 422 (unprocessable), all others → 200
    if (result.status === "infected") {
      return fail(res, "File rejected: malware or suspicious content detected.", 422, {
        status:    result.status,
        filename:  req.file.originalname,
        details:   result.details,
        scannedAt: result.details?.scannedAt || new Date().toISOString(),
      });
    }

    return ok(res, {
      status:    result.status,
      filename:  req.file.originalname,
      sizeBytes: req.file.size,
      mimetype:  req.file.mimetype,
      details:   result.details,
      scannedAt: result.details?.scannedAt || new Date().toISOString(),
    });

  } catch (err) {
    safeDelete(diskPath);

    if (err.code === "SCAN_TIMEOUT") {
      console.warn(`[${req.id}] [WARN]  [SAIS SCAN] TIMEOUT: "${req.file.originalname}"`);
      return fail(res, "Scan timed out. The scanner may be unavailable.", 408, { status: "timeout" });
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      return fail(res, "File too large. Maximum allowed size is 10 MB.", 413);
    }

    // Task 5: [ERROR] tag
    console.error(`[${req.id}] [ERROR] [SAIS SCAN] ${err.message}`);
    return fail(res, "Scan failed due to an internal error.", 500, { reason: err.message });
  }
});

// ─── Multer error middleware ───────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    console.warn(`[${req.id}] [WARN]  [SAIS SCAN] File too large — rejected`);
    return fail(res, "File too large. Maximum allowed size is 10 MB.", 413);
  }
  next(err);
});

module.exports = router;
