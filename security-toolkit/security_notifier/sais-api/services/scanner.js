/**
 * services/scanner.js
 * -------------------
 * Wraps the existing malware_scanner.py without rewriting it.
 * Saves the uploaded file buffer to a temp path, calls the Python scanner,
 * parses its JSON stdout and returns a normalised result.
 *
 * Improvements:
 *   ✅ Task 1 — 30s timeout on the Python process (kills + rejects cleanly)
 *   ✅ Task 6 — Returns a proper Promise (async-safe)
 */

"use strict";

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

// Absolute path to the existing Python scanner script
const SCANNER_PY = fs.existsSync(path.join(__dirname, "../external-core/malware_scanner.py"))
  ? path.join(__dirname, "../external-core/malware_scanner.py")
  : path.join(__dirname, "../../sais/services/security-tools/malware_scanner.py");

// Python executable (default to python3 for Linux/Docker compatibility)
const PYTHON = process.env.PYTHON || "python3";
const SCAN_TIMEOUT_MS = parseInt(process.env.SCAN_TIMEOUT_MS || "30000", 10); // 30s default

/**
 * scanFile(file)
 *
 * @param {object} file – multer file object { originalname, buffer, mimetype, size }
 * @returns {Promise<{ status: "clean"|"infected"|"error"|"timeout", details: object }>}
 */
async function scanFile(file) {
  // Write buffer to a temp file so the Python scanner can read it
  const tmpDir = os.tmpdir();
  const tmpName = `sais_${crypto.randomUUID()}_${file.originalname}`;
  const tmpPath = path.join(tmpDir, tmpName);

  fs.writeFileSync(tmpPath, file.buffer);

  try {
    const raw = await _runPythonScanner(tmpPath);
    return _interpretResult(raw);
  } finally {
    // Always clean up the temp file used by the scanner
    try { fs.unlinkSync(tmpPath); } catch (_) { /* already gone */ }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Spawns malware_scanner.py --file <tmpPath> with a hard timeout.
 * Resolves with the parsed JSON result dict or a fallback status object.
 * Rejects with an Error whose .code === "SCAN_TIMEOUT" on timeout.
 */
function _runPythonScanner(filePath) {
  return new Promise((resolve, reject) => {
    const args = [SCANNER_PY, "--file", filePath];

    const proc = spawn(PYTHON, args, {
      cwd: path.dirname(SCANNER_PY),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    // ── Timeout guard ──────────────────────────────────────────────────────
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
      const err = new Error(`Scanner timed out after ${SCAN_TIMEOUT_MS}ms`);
      err.code = "SCAN_TIMEOUT";
      reject(err);
    }, SCAN_TIMEOUT_MS);

    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return; // already rejected

      // Try to parse JSON from stdout (scanner outputs JSON when --file is used)
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (_) {
        // Non-JSON fallback
        if (code === 0) {
          resolve({ status: "CLEAN", raw: stdout });
        } else {
          resolve({ status: "SCAN_ERROR", raw: stderr || stdout });
        }
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Map Python scanner status → SAIS API contract status.
 *
 *  CLEAN                    → "clean"
 *  INFECTED                 → "infected"
 *  SUSPICIOUS_MISMATCH      → "infected"
 *  SUSPICIOUS_HIGH_ENTROPY  → "infected"
 *  anything else            → "error"
 */
function _interpretResult(raw) {
  const pyStatus = (raw?.status || "").toUpperCase();

  let status;
  if (pyStatus === "CLEAN") {
    status = "clean";
  } else if (
    pyStatus === "INFECTED" ||
    pyStatus === "SUSPICIOUS_MISMATCH" ||
    pyStatus === "SUSPICIOUS_HIGH_ENTROPY"
  ) {
    status = "infected";
  } else {
    status = "error";
  }

  return {
    status,
    details: {
      originalStatus: raw?.status || null,
      sha256: raw?.sha256 || null,
      fileType: raw?.file_type || null,
      sizeMb: raw?.size_mb || null,
      entropy: raw?.entropy || null,
      vtInfo: raw?.vt_info || null,
      quarantinedTo: raw?.quarantined_to || null,
      scannerOutput: raw?.clamscan_output || raw?.raw || null,
      scannedAt: raw?.timestamp || new Date().toISOString(),
    },
  };
}

module.exports = { scanFile };
