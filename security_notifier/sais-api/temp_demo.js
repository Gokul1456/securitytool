const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE = 'http://localhost:5000';

async function demo() {
  console.log('🚀 DEMO STARTING...\n');

  try {
    // 1. Health Check
    const h = await axios.get(BASE + '/health');
    console.log('Health:', JSON.stringify(h.data, null, 2));

    // 2. Login Risk
    const login = await axios.post(BASE + '/auth/analyze', {
      newDevice: true,
      newLocation: true,
      failedAttempts: 3,
      oddTime: true
    });
    console.log('Login:', JSON.stringify(login.data, null, 2));

    // 3. Clean File
    const cleanForm = new FormData();
    cleanForm.append('file', fs.createReadStream('demo-assets/clean.txt'));
    const clean = await axios.post(BASE + '/scan/file', cleanForm, {
      headers: cleanForm.getHeaders()
    });
    console.log('Clean File:', JSON.stringify(clean.data, null, 2));

    // 4. Virus File
    const virusForm = new FormData();
    virusForm.append('file', fs.createReadStream('demo-assets/virus.txt'));
    const virus = await axios.post(BASE + '/scan/file', virusForm, {
      headers: virusForm.getHeaders(),
      validateStatus: () => true
    });
    console.log('Virus File:', JSON.stringify(virus.data, null, 2));

    console.log('\n✅ DEMO COMPLETE');
  } catch (err) {
    console.error('❌ Demo Failed:', err.message);
  }
  process.exit(0);
}

demo();
