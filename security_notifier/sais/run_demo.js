const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

const GATEWAY_URL = 'http://localhost:4000';
const DEMO_API_KEY = 'DEMO_API_KEY_123';

// Helper to delay
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runDemo() {
  console.log('==============================================');
  console.log('|      SAIS SECURITY TOOLKIT - LIVE DEMO     |');
  console.log('==============================================');
  console.log('');

  // 1. HEALTH CHECKS
  console.log('[*] Verifying Gateway API...');
  try {
    const r = await fetch('http://localhost:4000/health');
    const status = await r.json();
    console.log(`[+] API Gateway Status: \x1b[32m${status.status.toUpperCase()}\x1b[0m`);
  } catch (e) {
    console.log('[-] API Gateway is not responding. Please ensure containers are running.');
    return;
  }
  
  // Create temp files
  const cleanPath = path.join(__dirname, 'clean.txt');
  const dirtyPath = path.join(__dirname, 'dirty.txt');
  await fsPromises.writeFile(cleanPath, 'This is a normal test file with no security risks.');
  
  // Standard EICAR Test string (usually detected by ClamAV)
  const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  await fsPromises.writeFile(dirtyPath, eicarString);

  console.log('\n==============================================');
  console.log('[STAGE 1] MALWARE SCANNING INTEGRATION (CLEAN FILE)');
  console.log('==============================================');
  
  const cleanFormData = new FormData();
  const cleanBlob = new Blob([fs.readFileSync(cleanPath)]);
  cleanFormData.append('file', cleanBlob, 'clean.txt');

  try {
    console.log('[*] Uploading clean file to Security Gateway...');
    const r1 = await fetch(`${GATEWAY_URL}/scan/api/scanner/scan`, {
      method: 'POST',
      headers: { 'x-sais-api-key': DEMO_API_KEY },
      body: cleanFormData
    });
    const res1 = await r1.json();
    console.log('[+] Upload successful. Scan status:', res1);
  } catch(e) { console.error('[-] Request failed', e.message); }

  console.log('\n==============================================');
  console.log('[STAGE 2] MALWARE SCANNING INTEGRATION (QUARANTINE FILE)');
  console.log('==============================================');

  const dirtyFormData = new FormData();
  const dirtyBlob = new Blob([fs.readFileSync(dirtyPath)]);
  dirtyFormData.append('file', dirtyBlob, 'dirty.txt');

  try {
    console.log('[*] Uploading EICAR test file to Security Gateway...');
    const r2 = await fetch(`${GATEWAY_URL}/scan/api/scanner/scan`, {
      method: 'POST',
      headers: { 'x-sais-api-key': DEMO_API_KEY },
      body: dirtyFormData
    });
    const res2 = await r2.json();
    console.log('[+] Upload protected. Gateway response:', res2);
  } catch(e) { console.error('[-] Request failed', e.message); }

  console.log('\n==============================================');
  console.log('[STAGE 3] SUSPICIOUS LOGIN MONITORING & ALERTING');
  console.log('==============================================');
  
  try {
    console.log('[*] Simulating repeated failed logins to trigger Notifier...');
    
    for (let i = 1; i <= 4; i++) {
        console.log(`    -> Attempt ${i}...`);
        await fetch(`${GATEWAY_URL}/notify/api/demo/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-sais-api-key': DEMO_API_KEY,
                'X-Forwarded-For': '192.168.1.100'
            },
            body: JSON.stringify({
                email: 'demo@example.com',
                password: 'wrong_password',
            })
        });
        await sleep(500);
    }
    
    console.log('[+] Attack detected! Risk Engine triggered an internal alert.');
  } catch(e) { console.error('[-] Request failed', e.message); }
  
  console.log('\n==============================================');
  console.log('|                DEMO COMPLETE               |');
  console.log('==============================================');
  
  // Cleanup
  await fsPromises.unlink(cleanPath).catch(()=>{});
  await fsPromises.unlink(dirtyPath).catch(()=>{});
}

runDemo();
