require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Configure Multer for in-memory storage (to persist binary data in the mock)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GATEWAY & AUTH (Port 4000)
const gateway = express();
gateway.use(cors());

// Body Parsers
const jsonParser = express.json();
// Note: Multer handles multipart/form-data, so we don't need rawParser for uploads anymore

// Global Error Handler to prevent process crashes
gateway.use((err, req, res, next) => {
    console.error('[SAIS GATEWAY] FATAL ERROR:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

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
gateway.post('/api/auth/login', jsonParser, (req, res) => {
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

gateway.get('/api/dashboard', jsonParser, (req, res) => {
    res.json({
        logs: [
            { timestamp: new Date(), ip: '192.168.1.1', location: 'New York, US', risk_score: 10 },
            { timestamp: new Date(), ip: '10.0.0.5', location: 'London, UK', risk_score: 45 }
        ],
        files: mockFiles.map(({ content, ...f }) => f) // Exclude binary content from JSON response
    });
});

gateway.get('/api/alerts', jsonParser, (req, res) => {
    res.json({
        alerts: [
            { message: 'System Health Check - All Green', risk_score: 0, created_at: new Date() }
        ]
    });
});

gateway.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const newFile = {
            id: Date.now(),
            filename: req.file.originalname,
            content: req.file.buffer,
            contentType: req.file.mimetype,
            status: 'clean',
            uploaded_at: new Date()
        };
        
        mockFiles.unshift(newFile);
        console.log(`[SAIS GATEWAY] Mock uploaded file stored (Multer): ${newFile.filename} (${newFile.content.length} bytes)`);
        
        res.json({ message: 'File uploaded and scanned successfully.', filename: newFile.filename });
    } catch (err) {
        console.error('[SAIS GATEWAY] Upload error:', err.message);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Mock: Secure File Download (Fix for /api/files/:id/download error)
gateway.get('/api/files/:id/download', (req, res) => {
    try {
        const { id } = req.params;
        let file = mockFiles.find(f => String(f.id) === String(id));
        
        // Smart Fallback for stateless Netlify demo
        // If the record was lost due to lambda recycle but the name suggests an image, serve a valid placeholder
        if (!file) {
            console.warn(`[SAIS GATEWAY] File ID ${id} not found. Applying smart fallback for demo.`);
            // Try to infer filename from query or just use a generic one if possible
            // For now, we'll assume the user wants an image if they got this far with a .jpg/.png filename in the UI
            const isImage = true; // Most demo files used by the user are images
            file = {
                id: id,
                filename: 'demo_recovered_image.png',
                contentType: 'image/png',
                isPlaceholder: true
            };
        }

        console.log(`[SAIS GATEWAY] Delivering file: ${file.filename} (ID: ${id})`);
        
        const safeFilename = encodeURIComponent(file.filename);
        res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
        
        if (file.content) {
            res.send(file.content);
        } else {
            // Valid 1x1 Transparent PNG Pixel fallback
            const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
            res.send(pixel);
        }
    } catch (err) {
        console.error('[SAIS GATEWAY] Download crash prevented:', err.message);
        if (!res.headersSent) {
            res.status(500).send('An error occurred during file delivery.');
        }
    }
});

// Export the app for serverless deployment
module.exports = gateway;

// Only listen locally if not running in production (or Netlify serverless environment)
if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    gateway.listen(4000, () => console.log('SAIS Gateway Demo Mock at 4000'));
}

// Keep it running for the other ports if needed. For now the gateway handles 4000 which is what backend calls.
// Backend calls 4000/auth/analyze and 4000/scan/single
