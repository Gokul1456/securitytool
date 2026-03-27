const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function populateData() {
  console.log('🚀 POPULATING SAIS DEMO TRAFFIC...');

  // 1. CLEAN LOGINS (2 attempts)
  console.log('\n--- [1] CLEAN LOGINS ---');
  for (let i = 1; i <= 2; i++) {
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@demo.com',
        password: 'password123'
      });
      console.log(`[+] Clean Login ${i} - Success: ${res.data.message}`);
    } catch (e) { console.error(`[-] Clean Login ${i} Failed:`, e.message); }
  }

  // 2. SUSPICIOUS LOGINS (2 attempts - using Tor User-Agent)
  console.log('\n--- [2] SUSPICIOUS LOGINS ---');
  for (let i = 1; i <= 2; i++) {
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@demo.com',
        password: 'password123'
      }, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:102.0) Gecko/20100101 Firefox/102.0 TorBrowser/11.5.2' }
      });
      console.log(`[+] Suspicious Login ${i} - Triggered: ${res.data.suspicious ? 'YES' : 'NO'}`);
    } catch (e) { console.error(`[-] Suspicious Login ${i} Failed:`, e.message); }
  }

  // 3. CLEAN FILE UPLOADS (Optional, user didn't ask but good for contrast)
  // console.log('\n--- CLEAN FILES ---');
  // ...

  // 4. VIRUS FILE UPLOADS (2 files)
  console.log('\n--- [3] VIRUS FILE UPLOADS ---');
  const virusFiles = ['eicar_test_1.com', 'malware_signature_2.virus'];
  for (const filename of virusFiles) {
    try {
      const formData = new FormData();
      formData.append('file', Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'), filename);
      const res = await axios.post(`${BASE_URL}/api/upload`, formData, {
        headers: formData.getHeaders()
      });
      console.log(`[+] Virus Upload [${filename}] - Status: ${res.data.message}`);
    } catch (e) {
      if (e.response && e.response.status === 403) {
        console.log(`[+] Virus Upload [${filename}] - CORRECTLY BLOCKED (403): ${e.response.data.error}`);
      } else {
        console.error(`[-] Virus Upload [${filename}] Failed:`, e.message);
      }
    }
  }

  console.log('\n✅ TRAFFIC POPULATION COMPLETE.');
  console.log('Check the dashboard at http://localhost:5173/dashboard');
}

populateData();
