const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const FormData = require('form-data');

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         SAIS Full Security Demo                      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── TEST 1: VIRUS FILE UPLOAD ──
  console.log('► [1/2] Uploading malware file...');
  try {
<<<<<<< HEAD
    const virusFile = 'c:\\security toolkit\\Test Website\\test_virus_unique.txt';
=======
    const virusFile = 'c:\\combined toolkit\\Test Website\\test_virus_unique.txt';
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
    const form = new FormData();
    form.append('file', fs.createReadStream(virusFile), {
      filename: 'test_virus_unique.txt',
      contentType: 'text/plain'
    });

    const res = await axios.post('http://localhost:3000/api/upload', form, {
      headers: form.getHeaders(),
      validateStatus: () => true   // don't throw on 403
    });

    if (res.status === 403) {
      console.log('   ✅ BLOCKED  HTTP 403 – Malicious file detected and quarantined by SAIS!');
      console.log('   📋 Server:', res.data.error);
    } else {
      console.log('   ⚠️  Unexpected status:', res.status, res.data);
    }
  } catch (e) {
    console.error('   ❌ Upload test error:', e.message);
  }

  console.log();

  // ── TEST 2: SUSPICIOUS LOGIN (Tor User-Agent) ──
  console.log('► [2/2] Simulating suspicious login (Tor browser)...');
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login',
      { email: 'admin@demo.com', password: 'password123' },
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0 (Tor Browser)' } }
    );
    console.log('   ✅ Login succeeded (HTTP 200) – SAIS risk analysis triggered in background.');
    console.log('   📋 SAIS will compute risk score and fire alert if score > 50.');
  } catch (e) {
    console.error('   ❌ Login test error:', e.message);
  }

  // Give background tasks a moment to settle
  await new Promise(r => setTimeout(r, 1500));

  // ── PRINT CURRENT ALERTS ──
  console.log('\n► Fetching current Security Alerts...');
  try {
    const res = await axios.get('http://localhost:3000/api/alerts');
    const alerts = res.data.alerts || [];
    if (alerts.length === 0) {
      console.log('   (no alerts yet)');
    } else {
      alerts.slice(0, 5).forEach((a, i) => {
        const ts = new Date(a.created_at).toLocaleTimeString();
        console.log(`   [${i+1}] ⚠️  [Risk ${a.risk_score}] ${a.message} — ${ts}`);
      });
    }
  } catch (e) {
    console.error('   ❌ Alerts fetch error:', e.message);
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  View dashboard: http://localhost:5173/dashboard     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

run();
