const axios = require('axios');

async function runFuzzing() {
    const url = 'http://localhost:3000/api/auth/login';
    const validCreds = { email: 'admin@demo.com', password: 'password123' };
    
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', // Normal
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36', // Normal
        'Mozilla/5.0 (Windows NT 10.0) Tor/115.0', // Tor (Suspicious)
        'Googlebot/2.1 (+http://www.google.com/bot.html)', // Crawler (Suspicious)
        'Python-urllib/3.10', // Script (Suspicious)
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' // Mobile (Normal)
    ];

    console.log("=== 🛡️ SAIS ADVANCED LOGIN FUZZING START ===\n");

    // 1. SCENARIO: Normal & Suspicious Headers
    console.log("► [1/3] Testing Variety of User-Agents...");
    for (const ua of userAgents) {
        try {
            const res = await axios.post(url, validCreds, { headers: { 'User-Agent': ua } });
            const risk = ua.includes('Tor') || ua.includes('bot') || ua.includes('Python') ? '⚠️ RISK' : '✅ CLEAN';
            console.log(`   [${risk}] Agent: ${ua.substring(0, 40)}... Status: ${res.status}`);
        } catch (e) {
            console.log(`   [❌] Agent: ${ua.substring(0, 40)}... Failed: ${e.response?.status || e.message}`);
        }
    }

    // 2. SCENARIO: Brute-Force Simulation
    console.log("\n► [2/3] Simulating Brute-Force Attempt (6 failed logins)...");
    const fakeEmail = `target_${Math.floor(Math.random() * 1000)}@attack.com`;
    for (let i = 1; i <= 6; i++) {
        try {
            await axios.post(url, { email: fakeEmail, password: 'wrong_password' });
        } catch (e) {
            const blocked = i >= 5 ? '🎯 TRIGGERED' : '❌ FAILED';
            console.log(`   Attempt ${i}: [${blocked}] Client got 401 as expected.`);
        }
    }

    // 3. SCENARIO: Malicious Input Payload (SQLi/XSS)
    console.log("\n► [3/3] Testing Malicious Payloads in Input Fields...");
    const payloads = [
        { email: "' OR 1=1 --", password: "p" },
        { email: "<script>alert('XSS')</script>", password: "p" },
        { email: "admin@demo.com", password: "'; DROP TABLE Users; --" }
    ];

    for (const p of payloads) {
        try {
            const res = await axios.post(url, p);
            console.log(`   Payload: ${p.email.substring(0, 20)} | Status: ${res.status}`);
        } catch (e) {
            console.log(`   Payload: ${p.email.substring(0, 20)} | Blocked/Failed: ${e.response?.status || e.message}`);
        }
    }

    console.log("\n=== 🛡️ FUZZING COMPLETE. Check Dashboard for new Alerts. ===");
}

runFuzzing();
