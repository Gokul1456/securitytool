const { Pool } = require("pg");

function createPool(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: databaseUrl });
  return pool;
}

module.exports = { createPool };

