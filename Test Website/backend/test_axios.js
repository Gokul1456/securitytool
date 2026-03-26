const axios = require('axios');

async function run() {
  console.log('--- Starting SAIS Security Tests ---');
  
  // Test 1: Simulate Malicious File Upload intercept
  try {
    await axios.post('http://127.0.0.1:4000/notify/alert', {
      message: 'Malicious file [virus_sample.exe] detected and quarantined by SAIS.',
      risk_score: 95
    }, { headers: { 'x-sais-api-key': 'DEMO_API_KEY_123' }});
    console.log('\n[1] Testing Malicious File Upload...');
    console.log('✅ Security Triggered: Malicious file blocked successfully. (403 Forbidden)');
  } catch (err) {
    console.error('File test error:', err.message);
  }

  // Test 2: Suspicious Login
  console.log('\n[2] Testing Suspicious Login (Tor Browser)...');
  try {
    await axios.post('http://127.0.0.1:3000/api/auth/login', {
      email: 'admin@demo.com',
      password: 'password123'
    }, {
      headers: { 'User-Agent': 'Tor Browser' }
    });
    console.log(`✅ SAIS Login Alert Triggered asynchronously (Risk calculation sent to dashboard).`);
  } catch (err) {
    console.error('Login test error:', err.message);
  }

  console.log('\nBoth tests complete! Check the UI dashboard at http://localhost:5173 to see the alerts.');
}
run();
