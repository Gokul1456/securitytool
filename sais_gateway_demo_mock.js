require('dotenv').config();
const express = require('express');
const cors = require('cors');
const body = express.json();

// GATEWAY & AUTH (Port 4000)
const gateway = express();
gateway.use(cors());
gateway.use(body);

gateway.all('*', (req, res, next) => {
    console.log(`[SAIS GATEWAY] ${req.method} ${req.url} - Key: ${req.header('x-sais-api-key')}`);
    next();
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

gateway.listen(4000, () => console.log('SAIS Gateway Demo Mock at 4000'));

// Keep it running for the other ports if needed. For now the gateway handles 4000 which is what backend calls.
// Backend calls 4000/auth/analyze and 4000/scan/single
