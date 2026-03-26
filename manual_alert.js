
const url = 'http://localhost:4002/internal/alerts';
const payload = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'victim@demo.com',
  title: 'Manual Brute-Force Demo',
  message: 'This is a manual alert for the demo.',
  eventType: 'MULTIPLE_FAILED_LOGINS',
  riskScore: 90,
  metadata: { ipAddress: '127.0.0.1', deviceKey: 'Manual Test' }
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
