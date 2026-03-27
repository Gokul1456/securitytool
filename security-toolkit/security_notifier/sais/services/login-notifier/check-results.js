const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('--- SECURITY EVENTS ---');
  const events = await pool.query('SELECT event_type, ip_address, created_at FROM security_events ORDER BY created_at DESC LIMIT 5');
  events.rows.forEach(r => console.log(`${r.created_at} | ${r.event_type} | ${r.ip_address}`));

  console.log('\n--- NOTIFICATIONS ---');
  const notifications = await pool.query('SELECT title, message, created_at FROM notifications ORDER BY created_at DESC LIMIT 5');
  notifications.rows.forEach(r => console.log(`${r.created_at} | ${r.title} | ${r.message}`));

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
