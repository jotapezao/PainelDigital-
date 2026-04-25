require('dotenv').config();
const { Pool } = require('pg');

console.log('📋 Available env vars:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('KEY')));

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not defined in environment variables');
} else {
  console.log('📡 DATABASE_URL detected');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client', err);
  process.exit(-1);
});

module.exports = { pool };
