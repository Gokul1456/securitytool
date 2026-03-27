
const url = 'http://localhost:4002/internal/alerts';
const payload = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'security-admin@demo.com',
  title: 'Suspicious Login Detected',
  message: 'A login from a new IP was detected on your account.',
  eventType: 'NEW_IP_LOGIN',
  riskScore: 75,
  metadata: { 
    ipAddress: '82.165.12.34', 
    previousIp: '192.168.1.5',
    location: 'Berlin, Germany',
    deviceKey: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' 
  }
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-sais-internal-key': 'internal-secret-123-very-long-key'
  },
  body: JSON.stringify(payload)
})
.then(async r => {
  console.log('Status:', r.status);
  const data = await r.json();
  console.log('Response:', JSON.stringify(data, null, 2));
})
.catch(e => console.error('Error:', e.message));
