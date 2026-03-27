const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const APP_PORT = parseInt(process.env.PORT || '3000', 10);
const SAIS_GATEWAY_URL = process.env.SAIS_GATEWAY_URL || 'http://127.0.0.1:4000';
const SAIS_API_KEY = process.env.SAIS_API_KEY || 'DEMO_API_KEY_123';
const SAIS_NOTIFIER_URL = process.env.SAIS_NOTIFIER_URL || 'http://127.0.0.1:4002';
const SAIS_INTERNAL_KEY = process.env.SAIS_INTERNAL_KEY || 'internal-secret-123-very-long-key';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret-change-me';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json());

const saisSdk = require('../../security_notifier/sais/sdk/sais-sdk/index.js');
app.use(saisSdk(SAIS_API_KEY, { endpoint: SAIS_GATEWAY_URL }));

function fail(res, status, message, code) {
  return res.status(status).json({ error: message, code });
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function inferScanStatusFromOutput(outputText) {
  const text = String(outputText || '').toLowerCase();
  return ['malicious', 'infected', 'threat'].some(k => text.includes(k)) ? 'infected' : 'clean';
}

function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2');
}

function signAuthToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return fail(res, 401, 'Missing or invalid authorization token', 'UNAUTHORIZED');
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.sub) {
      return fail(res, 401, 'Invalid token payload', 'UNAUTHORIZED');
    }
    req.user = { id: String(payload.sub), email: payload.email };
    return next();
  } catch (_err) {
    return fail(res, 401, 'Invalid or expired token', 'UNAUTHORIZED');
  }
}

async function notifyInternalAlert(payload) {
  return fetch(`${SAIS_NOTIFIER_URL}/internal/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sais-internal-key': SAIS_INTERNAL_KEY
    },
    body: JSON.stringify(payload)
  });
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait and try again.', code: 'RATE_LIMITED' }
});


// Set up file uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Memory fallback to ensure DEMO always works if Postgres isn't running
let usePg = false;
let memDb = { users: [], loginLogs: [], files: [], alerts: [] };

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'login_notifier',
  password: process.env.DB_PASSWORD || 'Samson@123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.connect()
  .then(async (client) => {
    console.log('Connected to PostgreSQL successfully.');
    usePg = true;
    
    // Auto-migrate tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS LoginLogs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        ip VARCHAR(45),
        device TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        risk_score INTEGER
      );
      CREATE TABLE IF NOT EXISTS Files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        filename VARCHAR(255),
        status VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS Alerts (
        id SERIAL PRIMARY KEY,
        message TEXT,
        risk_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed demo user with hashed password.
    const demoEmail = 'admin@demo.com';
    const demoPasswordHash = await bcrypt.hash('password123', 10);
    const existing = await client.query('SELECT id, password FROM Users WHERE email = $1', [demoEmail]);
    if (existing.rowCount === 0) {
      await client.query('INSERT INTO Users (email, password) VALUES ($1, $2)', [demoEmail, demoPasswordHash]);
    } else if (!isBcryptHash(existing.rows[0].password)) {
      await client.query('UPDATE Users SET password = $1 WHERE email = $2', [demoPasswordHash, demoEmail]);
    }
    
    client.release();
  })
  .catch(err => {
    console.warn('⚠️ PostgreSQL connection failed. Using in-memory fallback for DEMO purposes.');
    // Seed initial dummy user in memory
    memDb.users.push({ id: 1, email: 'admin@demo.com', password: bcrypt.hashSync('password123', 10) });
  });

/* =========================================
   SAIS CORE MOCK APIs (Integration Targets)
========================================= */

// Mock: SAIS Analyzer
app.post('/sais/auth/analyze', (req, res) => {
  const ip = String(req.body?.ip || '');
  const device = String(req.body?.device || '');
  // Simple heuristic for demo
  let riskScore = Math.floor(Math.random() * 40); // 0-39 baseline
  if (ip.startsWith('10.') || ip.startsWith('192.')) {
     // Internal IPs maybe safer? Or suspicious if sudden.
  }
  if (device.includes('Unknown') || device.includes('Tor')) {
    riskScore += 50;
  }
  // Occasionally trigger high risk randomly
  if (Math.random() > 0.7) riskScore += 60; 
  
  riskScore = Math.min(riskScore, 100);
  res.json({ risk_score: riskScore });
});

// Mock: SAIS Security Scanner
app.post('/sais/scan/file', (req, res) => {
  const filename = String(req.body?.filename || '');
  const size = Number(req.body?.size || 0);
  const lowerName = filename.toLowerCase();
  
  let isMalicious = false;
  if (lowerName.includes('virus') || lowerName.endsWith('.exe') || lowerName.endsWith('.bat')) {
    isMalicious = true;
  }
  
  if (size > 50 * 1024 * 1024) { // over 50MB
    isMalicious = true;
  }
  
  res.json({
    status: isMalicious ? 'infected' : 'clean',
    details: isMalicious ? 'Malware signature matched.' : 'No threats detected.'
  });
});

// Mock: SAIS Notifier
app.post('/sais/notify/alert', async (req, res) => {
  const { message, risk_score } = req.body || {};
  if (!message) return fail(res, 400, 'message is required', 'VALIDATION_ERROR');
  
  if (usePg) {
    await pool.query('INSERT INTO Alerts (message, risk_score) VALUES ($1, $2)', [message, risk_score]);
  } else {
    memDb.alerts.push({ id: Date.now(), message, risk_score, created_at: new Date() });
  }
  
  return res.json({ success: true, received: true });
});

/* =========================================
   APPLICATION SERVER ENDPOINTS
========================================= */

// Memory tracker for failed login attempts
const failedAttempts = new Map();

// APP: Login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email) || typeof password !== 'string' || password.length < 3) {
    return fail(res, 400, 'Valid email and password are required', 'VALIDATION_ERROR');
  }
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const device = req.headers['user-agent'] || 'Unknown Device';
  
  let user = null;
  if (usePg) {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    user = result.rows[0];
  } else {
    user = memDb.users.find(u => u.email === email);
  }

  let passwordOk = false;
  if (user) {
    if (isBcryptHash(user.password)) {
      passwordOk = await bcrypt.compare(password, user.password);
    } else {
      passwordOk = user.password === password;
      // Lazy-migrate legacy plain-text credentials to bcrypt hash.
      if (passwordOk) {
        const upgradedHash = await bcrypt.hash(password, 10);
        if (usePg) {
          await pool.query('UPDATE Users SET password = $1 WHERE id = $2', [upgradedHash, user.id]).catch(() => {});
        } else {
          user.password = upgradedHash;
        }
      }
    }
  }

  if (!user || !passwordOk) {
    // Brute-force tracking
    const count = (failedAttempts.get(email) || 0) + 1;
    failedAttempts.set(email, count);

    if (count >= 5) {
      console.warn(`[SAIS BRUTEFORCE] User ${email} exceeded 5 failed attempts from ${ip}`);
      // Send security alert for brute-force attempt (direct to notifier on 4002)
      notifyInternalAlert({
        userId: user?.id || '00000000-0000-0000-0000-000000000000',
        email,
        title: 'Possible Brute-Force Attack Detected',
        message: `More than 5 failed login attempts detected for account ${email} from IP ${ip}.`,
        eventType: 'MULTIPLE_FAILED_LOGINS',
        riskScore: 85,
        metadata: { ipAddress: ip, deviceKey: device, location: 'Unknown', anomalies: { bruteForce: true } }
      }).catch(e => console.warn('[BG] Bruteforce notify failed:', e.message));
    }

    return fail(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Reset failed attempts on success
  failedAttempts.delete(email);

  // Respond IMMEDIATELY — SAIS analysis runs in the background (non-blocking)
  res.json({
    message: 'Login successful',
    user: { id: user.id, email: user.email },
    token: signAuthToken(user),
    suspicious: false // will be updated in background; for UI, default to false
  });

  // --- BACKGROUND: SAIS analysis, logging, alerting ---
  (async () => {
    let riskScore = 0;
    let isSuspicious = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const saisReq = await fetch(`${SAIS_GATEWAY_URL}/auth/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sais-api-key': SAIS_API_KEY },
        body: JSON.stringify({ ipAddress: ip, deviceInfo: device, timestamp: new Date(), userId: user.id, email: user.email }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (saisReq.ok) {
        const saisRes = await saisReq.json();
        riskScore = saisRes.riskScore || 0;
      }
    } catch(e) {
      console.warn('[BG] SAIS analyze skipped:', e.message);
      if (device.toLowerCase().includes('tor')) riskScore = 85;
    }
    isSuspicious = riskScore > 50;

    // Log activity
    if (usePg) {
      await pool.query(
        'INSERT INTO LoginLogs (user_id, ip, device, risk_score) VALUES ($1, $2, $3, $4)',
        [user.id, ip, device, riskScore]
      ).catch(e => console.error('[BG] LoginLog insert failed:', e.message));
    } else {
      memDb.loginLogs.push({ id: Date.now(), user_id: user.id, ip, device, timestamp: new Date(), risk_score: riskScore });
    }

    // Trigger alert if suspicious
    if (isSuspicious) {
      const alertMsg = `Suspicious login from ${email} on ${ip} [Risk: ${riskScore}]`;
      if (usePg) {
        await pool.query('INSERT INTO Alerts (message, risk_score) VALUES ($1, $2)', [alertMsg, riskScore])
          .catch(e => console.error('[BG] Alert insert failed:', e.message));
      } else {
        memDb.alerts.push({ id: Date.now(), message: alertMsg, risk_score: riskScore, created_at: new Date() });
      }

      // Notify the Notifier Service (Directly)
      notifyInternalAlert({
        userId: user.id,
        email: user.email,
        title: 'Suspicious Login Detected',
        message: alertMsg,
        riskScore,
        metadata: { ipAddress: ip, deviceKey: device, location: 'Unknown', anomalies: { riskScore } }
      }).catch(e => console.warn('[BG] Notify alert failed:', e.message));
    }
  })();
});

// APP: Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email) || typeof password !== 'string' || password.length < 6) {
    return fail(res, 400, 'Email and password (min 6 chars) required', 'VALIDATION_ERROR');
  }

  try {
    if (usePg) {
      // Check if exists
      const exists = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
      if (exists.rowCount > 0) return fail(res, 409, 'User already exists', 'CONFLICT');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query('INSERT INTO Users (email, password) VALUES ($1, $2) RETURNING id, email', [email, hashedPassword]);
      return res.json({ message: 'User created successfully', user: result.rows[0] });
    } else {
      const exists = memDb.users.find(u => u.email === email);
      if (exists) return fail(res, 409, 'User already exists', 'CONFLICT');

      const newUser = { id: memDb.users.length + 1, email, password: await bcrypt.hash(password, 10) };
      memDb.users.push(newUser);
      return res.json({ message: 'User created successfully', user: { id: newUser.id, email: newUser.email } });
    }
  } catch (err) {
    console.error(err);
    return fail(res, 500, 'Server error during registration', 'SERVER_ERROR');
  }
});


// Configure Multer for local disk storage so uploaded files can be downloaded later.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const uploadParams = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// APP: File Upload
app.post('/api/upload', requireAuth, uploadParams.single('file'), async (req, res) => {
  if (!req.file) return fail(res, 400, 'No file uploaded', 'VALIDATION_ERROR');

  const userId = req.user.id;
  
  // 1. Scan file using real SAIS
  let scanResult = 'clean';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 sec timeout
    
    // Forward the file details to the actual SAIS scan endpoint via the gateway
    // Gateway /scan/single maps to security-tools /single
    // Wait, security tools has /single if I removed /scan prefix!
    const scanReq = await fetch(`${SAIS_GATEWAY_URL}/scan/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sais-api-key': SAIS_API_KEY },
      body: JSON.stringify({ filename: req.file.originalname, size: req.file.size }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (scanReq.ok) {
       const scanRes = await scanReq.json();
       scanResult = inferScanStatusFromOutput(scanRes.output);
    } else {
       console.warn("SAIS Scanner unreachable. Falling back to internal simulation for demo.");
       const lname = req.file.originalname.toLowerCase();
       if (lname.includes('eicar') || lname.includes('virus')) {
           scanResult = 'infected';
       }
    }
  } catch(e) {
     console.error("SAIS Scanner error", e.message);
     const lname = req.file.originalname.toLowerCase();
     if (lname.includes('eicar') || lname.includes('virus')) {
         scanResult = 'infected';
     }
  }

  // 3. Store metadata (clean or infected) for dashboard audit trail
  const fileRecord = { 
    id: String(Date.now()), // Record as string for reliable matching
    user_id: userId, 
    filename: req.file.filename, // Store actual disk filename with unique prefix
    original_name: req.file.originalname,
    status: scanResult, 
    uploaded_at: safeDate()
  };
  
  if (usePg) {
    await pool.query(
      'INSERT INTO Files (user_id, filename, status) VALUES ($1, $2, $3)',
      [userId, req.file.filename, scanResult]
    );
  } else {
    memDb.files.push(fileRecord);
  }

  // 4. Handle scan response (block if infected)
  if (scanResult === 'infected') {
    const alertMsg = `Malicious file [${req.file.originalname}] detected and quarantined by SAIS.`;
    console.log(`[SAIS ALERT] ${alertMsg}`);
    
    // Create Alert record for demo dashboard
    const alertRecord = { id: Date.now(), message: alertMsg, risk_score: 95, created_at: new Date() };
    if (usePg) {
      await pool.query('INSERT INTO Alerts (message, risk_score) VALUES ($1, $2)', [alertMsg, 95]);
    } else {
      memDb.alerts.push(alertRecord);
    }

    // Trigger SAIS Security Alert (Network Call)
    await notifyInternalAlert({
      userId: String(userId),
      email: 'admin@demo.com',
      title: 'Malicious File Blocked',
      message: alertMsg,
      eventType: 'MALICIOUS_FILE_UPLOAD',
      riskScore: 95,
      metadata: { filename: req.file.originalname }
    }).catch((e) => console.warn('[BG] Upload alert notify failed:', e.message));

    // Delete the potentially malicious file immediately from disk
    if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return fail(res, 403, 'Malicious file detected. Upload blocked by SAIS.', 'MALICIOUS_FILE');
  }

  res.json({ message: 'File uploaded securely.', filename: req.file.originalname });
});

// APP: Dashboard Stats
app.get('/api/dashboard', requireAuth, async (req, res) => {
  let logs, files;
  const userId = req.user.id;
  if (usePg) {
    const logRes = await pool.query('SELECT * FROM LoginLogs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10', [userId]);
    logs = logRes.rows;
    
    const fileRes = await pool.query('SELECT * FROM Files WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 10', [userId]);
    files = fileRes.rows;
  } else {
    logs = memDb.loginLogs.filter(l => String(l.user_id) === String(userId)).slice(-10).reverse();
    files = memDb.files.filter(f => String(f.user_id) === String(userId)).slice(-10).reverse();
  }
  return res.json({ logs, files });
});

// APP: Alerts GET
app.get('/api/alerts', requireAuth, async (req, res) => {
  let alerts;
  if (usePg) {
    const resAlerts = await pool.query('SELECT * FROM Alerts ORDER BY created_at DESC LIMIT 20');
    alerts = resAlerts.rows;
  } else {
    alerts = memDb.alerts.slice(-20).reverse();
  }
  return res.json({ alerts });
});

// APP: Secure File Download
app.get('/api/files/:id/download', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  let fileInfo = null;
  if (usePg) {
    const result = await pool.query('SELECT * FROM Files WHERE id = $1', [id]);
    fileInfo = result.rows[0];
  } else {
    // Demo memory fallback: Search both as number and string
    fileInfo = memDb.files.find(f => String(f.id) === String(id) || f.id == id);
    if (!fileInfo) {
      console.log(`[DEBUG] File not found. Requested ID: ${id}. Available: ${memDb.files.map(f => f.id).join(', ')}`);
    }
  }

  if (!fileInfo) return fail(res, 404, `Record not found for ID: ${id}`, 'NOT_FOUND');

  if (String(fileInfo.user_id) !== String(req.user.id)) {
    return fail(res, 403, 'You are not allowed to access this file', 'FORBIDDEN');
  }

  // Security Check: Only allow download if SAIS marked it as clean
  if (fileInfo.status !== 'clean') {
    return res.status(403).json({
      error: 'Access Denied: File security integrity check failed. File is flagged as untrusted.',
      code: 'FILE_UNTRUSTED',
      status: fileInfo.status
    });
  }

  if (!fileInfo.filename) {
    return fail(res, 410, 'File record has no filename (legacy/malformed record)', 'FILE_UNAVAILABLE');
  }

  const filePath = path.join(uploadDir, fileInfo.filename);
  
  if (fs.existsSync(filePath)) {
    // Extract original filename by removing the timestamp prefix (Multer demo format: <timestamp>-<originalname>)
    // This ensures the user's OS recognizes the file type correctly.
    const originalName = String(fileInfo.filename).replace(/^\d+-/, '');
    
    // Serve file with correct metadata
    res.download(filePath, originalName, (err) => {
      if (err) {
        console.error("Error during secure file delivery:", err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: "Could not deliver file." });
        }
      }
    });
  } else {
    return fail(res, 410, 'File gone on disk (demo environment cleanup)', 'FILE_GONE');
  }
});

app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 400, 'File too large. Max allowed size is 10MB.', 'FILE_TOO_LARGE');
    }
    return fail(res, 400, err.message, 'UPLOAD_ERROR');
  }

  if (err && err.message === 'Origin not allowed by CORS') {
    return fail(res, 403, err.message, 'CORS_FORBIDDEN');
  }

  console.error('Unhandled server error:', err);
  return fail(res, 500, 'Internal server error', 'SERVER_ERROR');
});

app.listen(APP_PORT, () => {
  console.log(`SAIS Demo Server running on http://localhost:${APP_PORT}`);
});
