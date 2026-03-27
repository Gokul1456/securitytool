const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  console.log('Running schema.sql...');
  await pool.query(schema);
  console.log('Schema imported successfully.');
  await pool.end();
}

main().catch(err => {
  console.error('Error importing schema:', err);
  process.exit(1);
});
