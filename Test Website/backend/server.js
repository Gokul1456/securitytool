const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Global error handler to catch uncaught exceptions and prevent crashes
app.use((err, req, res, next) => {
  console.error('[BACKEND] Global error:', err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
  }
});

const saisSdk = require('../../security_notifier/sais/sdk/sais-sdk/index.js');
app.use(saisSdk('DEMO_API_KEY_123', { endpoint: 'https://meek-raindrop-4d4050.netlify.app' }));


// Set up file uploads dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Memory fallback to ensure DEMO always works if Postgres isn't running
let usePg = false;
let memDb = { users: [], loginLogs: [], files: [], alerts: [] };

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sais_demo',
  password: 'admin', // Demo default
  port: 5432,
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
    
    // Seed dummy user
    await client.query(`
      INSERT INTO Users (email, password)
      VALUES ('admin@demo.com', 'password123')
      ON CONFLICT (email) DO NOTHING;
    `);
    
    client.release();
  })
  .catch(err => {
    console.warn('⚠️ PostgreSQL connection failed. Using in-memory fallback for DEMO purposes.');
    // Seed initial dummy user in memory
    memDb.users.push({ id: 1, email: 'admin@demo.com', password: 'password123' });
  });

/* =========================================
   SAIS CORE MOCK APIs (Integration Targets)
========================================= */

// Mock: SAIS Analyzer
app.post('/sais/auth/analyze', (req, res) => {
  const { ip, device } = req.body;
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
  const { filename, size } = req.body;
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
  const { message, risk_score } = req.body;
  
  if (usePg) {
    await pool.query('INSERT INTO Alerts (message, risk_score) VALUES ($1, $2)', [message, risk_score]);
  } else {
    memDb.alerts.push({ id: Date.now(), message, risk_score, created_at: new Date() });
  }
  
  res.json({ success: true, received: true });
});

/* =========================================
   APPLICATION SERVER ENDPOINTS
========================================= */

// Memory tracker for failed login attempts
const failedAttempts = new Map();

// APP: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const device = req.headers['user-agent'] || 'Unknown Device';
  
  let user = null;
  if (usePg) {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    user = result.rows[0];
  } else {
    user = memDb.users.find(u => u.email === email);
  }

  if (!user || user.password !== password) {
    // Brute-force tracking
    const count = (failedAttempts.get(email) || 0) + 1;
    failedAttempts.set(email, count);

    if (count >= 5) {
      console.warn(`[SAIS BRUTEFORCE] User ${email} exceeded 5 failed attempts from ${ip}`);
      // Send security alert for brute-force attempt (direct to notifier on 4002)
      fetch(`http://127.0.0.1:4002/internal/alerts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-sais-internal-key': 'internal-secret-123-very-long-key'
        },
        body: JSON.stringify({ 
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
          email, 
          title: 'Possible Brute-Force Attack Detected', 
          message: `More than 5 failed login attempts detected for account ${email} from IP ${ip}.`,
          eventType: 'MULTIPLE_FAILED_LOGINS',
          riskScore: 85,
          metadata: { ipAddress: ip, deviceKey: device, location: 'Unknown', anomalies: { bruteForce: true } }
        })
      }).catch(e => console.warn('[BG] Bruteforce notify failed:', e.message));
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Reset failed attempts on success
  failedAttempts.delete(email);

  // Respond IMMEDIATELY — SAIS analysis runs in the background (non-blocking)
  res.json({
    message: 'Login successful',
    user: { id: user.id, email: user.email },
    suspicious: false // will be updated in background; for UI, default to false
  });

  // --- BACKGROUND: SAIS analysis, logging, alerting ---
  (async () => {
    let riskScore = 0;
    let isSuspicious = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const saisReq = await fetch(`https://meek-raindrop-4d4050.netlify.app/auth/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-sais-api-key': 'DEMO_API_KEY_123' },
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
      fetch(`http://127.0.0.1:4002/internal/alerts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-sais-internal-key': 'internal-secret-123-very-long-key'
        },
        body: JSON.stringify({ 
          userId: user.id, 
          email: user.email, 
          title: 'Suspicious Login Detected', 
          message: alertMsg,
          riskScore: riskScore,
          metadata: { ipAddress: ip, deviceKey: device, location: 'Unknown', anomalies: { riskScore } }
        })
      }).catch(e => console.warn('[BG] Notify alert failed:', e.message));
    }
  })();
});

// APP: Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    if (usePg) {
      // Check if exists
      const exists = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
      if (exists.rowCount > 0) return res.status(409).json({ error: 'User already exists' });
      
      const result = await pool.query('INSERT INTO Users (email, password) VALUES ($1, $2) RETURNING id, email', [email, password]);
      return res.json({ message: 'User created successfully', user: result.rows[0] });
    } else {
      const exists = memDb.users.find(u => u.email === email);
      if (exists) return res.status(409).json({ error: 'User already exists' });

      const newUser = { id: memDb.users.length + 1, email, password };
      memDb.users.push(newUser);
      return res.json({ message: 'User created successfully', user: { id: newUser.id, email: newUser.email } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});


// Configure Multer for File Upload Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadParams = multer({ storage });

// APP: File Upload
app.post('/api/upload', uploadParams.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = req.body.userId || 1; // Default to admin for demo
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  // 1. Scan file using real SAIS
  let scanResult = 'clean';
  try {
    // Forward the file details to the actual SAIS scan endpoint via the gateway
    // Gateway /scan/single maps to security-tools /single
    // Wait, security tools has /single if I removed /scan prefix!
    const scanReq = await fetch(`https://meek-raindrop-4d4050.netlify.app/scan/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sais-api-key': 'DEMO_API_KEY_123' },
      body: JSON.stringify({ filename: req.file.originalname, size: req.file.size })
    });
    if (scanReq.ok) {
       const scanRes = await scanReq.json();
       const text = scanRes.output || "";
        if (text.toLowerCase().includes("malicious") || text.toLowerCase().includes("infected") || text.toLowerCase().includes("threat")) {
            scanResult = 'infected';
        }
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
    status: scanResult, 
    uploaded_at: new Date() 
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
    await fetch(`https://meek-raindrop-4d4050.netlify.app/notify/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sais-api-key': 'DEMO_API_KEY_123' },
      body: JSON.stringify({ message: alertMsg, risk_score: 95 })
    }).catch(console.error);

    // Delete the potentially malicious file immediately from disk
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Malicious file detected. Upload blocked by SAIS.' });
  }

  res.json({ message: 'File uploaded securely.', filename: req.file.originalname });
});

// APP: Dashboard Stats
app.get('/api/dashboard', async (req, res) => {
  let logs, files;
  if (usePg) {
    const logRes = await pool.query('SELECT * FROM LoginLogs ORDER BY timestamp DESC LIMIT 10');
    logs = logRes.rows;
    
    const fileRes = await pool.query('SELECT * FROM Files ORDER BY uploaded_at DESC LIMIT 10');
    files = fileRes.rows;
  } else {
    logs = memDb.loginLogs.slice(-10).reverse();
    files = memDb.files.slice(-10).reverse();
  }
  res.json({ logs, files });
});

// APP: Alerts GET
app.get('/api/alerts', async (req, res) => {
  let alerts;
  if (usePg) {
    const resAlerts = await pool.query('SELECT * FROM Alerts ORDER BY created_at DESC LIMIT 20');
    alerts = resAlerts.rows;
  } else {
    alerts = memDb.alerts.slice(-20).reverse();
  }
  res.json({ alerts });
});

// APP: Secure File Download
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    let fileInfo = null;
    if (usePg) {
      const result = await pool.query('SELECT * FROM Files WHERE id = $1', [id]);
      fileInfo = result.rows[0];
    } else {
      // Demo memory fallback: Search both as number and string
      fileInfo = memDb.files.find(f => String(f.id) === String(id) || f.id == id);
    }

    if (!fileInfo || !fileInfo.filename) {
      return res.status(404).json({ error: 'Record or filename not found for ID: ' + id });
    }

    // Security Check: Only allow download if SAIS marked it as clean
    if (fileInfo.status !== 'clean') {
      return res.status(403).json({ 
        error: 'Access Denied: File security integrity check failed. File is flagged as untrusted.',
        status: fileInfo.status 
      });
    }

    const filePath = path.join(uploadDir, fileInfo.filename);
    
    if (fs.existsSync(filePath)) {
      // Extract original filename safely
      const originalName = fileInfo.filename.replace(/^\d+-/, '');
      
      // Serve file with correct metadata
      res.download(filePath, originalName, (err) => {
        if (err) {
          console.error("[BACKEND] Error during file delivery:", err.message);
          if (!res.headersSent) {
            res.status(500).json({ error: "Could not deliver file." });
          }
        }
      });
    } else {
      res.status(410).json({ error: 'File gone on disk (demo environment cleanup)', id });
    }
  } catch (err) {
    console.error('[BACKEND] Download crash caught:', err.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'A server error occurred during download.' });
    }
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`SAIS Demo Server running on http://localhost:${port}`);
});
