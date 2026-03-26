const express = require('express');
const multer = require('multer');

// Plug-and-play Security Library
const sais = require('sais-sdk');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Step 1: Hook up SAIS middleware to capture requesting context
app.use(sais.middleware());

// Route 1: File Upload protection
app.post('/api/upload', upload.single('document'), async (req, res) => {
    if (!req.file) return res.status(400).send("No file provided");

    console.log(`Scanning file: ${req.file.originalname}...`);
    
    // 🔥 SAIS INTEGRATION: 1 line of code protecting uploads!
    const scanResult = await sais.scanFile(req.file.buffer, req.file.originalname);
    
    if (scanResult.ok === false || /infected/i.test(JSON.stringify(scanResult))) {
        return res.status(403).json({ 
            error: "File blocked by Security Policy", 
            details: scanResult.error || "Malware signature found." 
        });
    }

    // Everything is safe! Save file natively here.
    res.json({ message: "File uploaded successfully!", scanResult });
});

// Route 2: Login Alerting
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Simulated mock check
    const isValidPassword = password === 'superSecret123';
    
    if (!isValidPassword) {
        // 🔥 SAIS INTEGRATION: 1 line of code protecting endpoints!
        await sais.trackLogin(req, email, 'failure');
        
        return res.status(401).json({ error: "Invalid credentials" });
    }
    
    res.json({ token: "jwt_token_here_example" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Consumer App running on port ${port} | SAIS Integration: ${sais.enabled}`));
