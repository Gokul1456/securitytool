const axios = require('axios');

async function testLogins() {
    const url = 'http://localhost:3000/api/auth/login';
    const credentials = { email: 'admin@demo.com', password: 'password123' };
    
    console.log("--- Executing 2 Clean Logins ---");
    for (let i = 1; i <= 2; i++) {
        try {
            const res = await axios.post(url, credentials, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
            });
            console.log(`[Clean ${i}] Status: ${res.status} | Msg: ${res.data.message}`);
        } catch (e) {
            console.error(`[Clean ${i}] FAILED:`, e.response?.data || e.message);
        }
    }

    console.log("\n--- Executing 2 Suspicious Logins (Tor) ---");
    for (let i = 1; i <= 2; i++) {
        try {
            const res = await axios.post(url, credentials, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Tor/115.0' }
            });
            console.log(`[Suspicious ${i}] Status: ${res.status} | Msg: ${res.data.message} (Risk Analysis Triggered)`);
        } catch (e) {
            console.error(`[Suspicious ${i}] FAILED:`, e.response?.data || e.message);
        }
    }
    
    console.log("\n✅ Test sequence complete. Check your dashboard for the results.");
}

testLogins();
