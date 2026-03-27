require('dotenv').config();
const express = require('express');
const cors = require('cors');
const body = express.json();

// GATEWAY & AUTH (Port 4000)
const gateway = express();
gateway.use(cors());
gateway.use(body);

// Stateful Mock Storage (Persists as long as the Lambda/Process is alive)
const mockFiles = [
    { id: 1, filename: 'report.pdf', status: 'clean', uploaded_at: new Date('2026-03-27T10:00:00Z') }
];

gateway.all('*', (req, res, next) => {
    console.log(`[SAIS GATEWAY] ${req.method} ${req.url} - Key: ${req.header('x-sais-api-key')}`);
    next();
});

gateway.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>SAIS Security Gateway</title>
                <style>
                    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f4f8; color: #334; }
                    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
                    h1 { color: #2563eb; }
                    .status { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #15803d; border-radius: 100px; font-weight: bold; font-size: 14px; }
                    a { color: #2563eb; text-decoration: none; font-weight: bold; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>SAIS Gateway Mock</h1>
                    <div class="status">● All Systems Operational</div>
                    <p>The security monitoring backend is active.</p>
                    <p><a href="/api/dashboard">View Dashboard JSON</a> | <a href="/api/files/1/download">Test Download</a></p>
                </div>
            </body>
        </html>
    `);
});

gateway.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway-mock' }));

gateway.post('/auth/telemetry/login', (req, res) => {
    console.log('[SAIS ANALYZER] Telemetry Received:', req.body);
    res.json({ success: true });
});

gateway.post('/auth/analyze', (req, res) => {
    const { deviceInfo } = req.body;
    let risk = Math.floor(Math.random() * 20);
    if (deviceInfo && deviceInfo.includes('Tor')) risk += 60;
    console.log(`[SAIS ANALYZER] Risk Calculated: ${risk}`);
    res.json({ riskScore: risk });
});

gateway.post('/scan/single', (req, res) => {
    const { filename } = req.body;
    console.log(`[SAIS SCANNER] Scanning: ${filename}`);
    let result = 'clean';
    if (filename.includes('eicar')) result = 'infected';
    res.json({ ok: true, output: result });
});

// Mock: App APIs (Required by Frontend)
gateway.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@demo.com' && password === 'password123') {
        res.json({
            message: 'Login successful',
            user: { id: 1, email: 'admin@demo.com' },
            suspicious: false
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

gateway.get('/api/dashboard', (req, res) => {
    res.json({
        logs: [
            { timestamp: new Date(), ip: '192.168.1.1', location: 'New York, US', risk_score: 10 },
            { timestamp: new Date(), ip: '10.0.0.5', location: 'London, UK', risk_score: 45 }
        ],
        files: mockFiles
    });
});

gateway.get('/api/alerts', (req, res) => {
    res.json({
        alerts: [
            { message: 'System Health Check - All Green', risk_score: 0, created_at: new Date() }
        ]
    });
});

gateway.post('/api/upload', (req, res) => {
    // Basic multipart parsing simulation for mock
    // In a real Netlify function without Multer, body might be a Buffer or string
    let filename = 'uploaded_file.bin';
    
    // Attempt to find a filename in the raw body if it's a string (multipart/form-data)
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        const bodyStr = req.body.toString();
        const match = bodyStr.match(/filename="(.+?)"/);
        if (match) filename = match[1];
    }
    
    const newFile = {
        id: Date.now(),
        filename: filename,
        status: 'clean',
        uploaded_at: new Date()
    };
    
    mockFiles.unshift(newFile); // Add to the top of the list
    console.log(`[SAIS GATEWAY] Mock uploaded file staged: ${filename}`);
    
    res.json({ message: 'File uploaded and scanned successfully.', filename });
});

// Mock: Secure File Download (Fix for /api/files/:id/download error)
gateway.get('/api/files/:id/download', (req, res) => {
    const { id } = req.params;
    const file = mockFiles.find(f => String(f.id) === String(id));
    
    if (!file) {
        return res.status(404).send('File record not found in mock storage.');
    }

    console.log(`[SAIS GATEWAY] Downloading mock file: ${file.filename} (ID: ${id})`);
    
    // Serve a virtual PDF/Binary content with the correct filename
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    // For the demo, we always send a small "Safe" message content
    const content = Buffer.from(`SAIS SECURITY CLEARANCE GRANTED\nFilename: ${file.filename}\nTimestamp: ${new Date().toISOString()}\nResult: CLEAN`);
    res.send(content);
});

// Export the app for serverless deployment
module.exports = gateway;

// Only listen locally if not running in production (or Netlify serverless environment)
if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    gateway.listen(4000, () => console.log('SAIS Gateway Demo Mock at 4000'));
}

// Keep it running for the other ports if needed. For now the gateway handles 4000 which is what backend calls.
// Backend calls 4000/auth/analyze and 4000/scan/single
