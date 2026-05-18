const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:adminpassword@localhost:5432/digital_signage' });

async function run() {
  try {
    const res = await pool.query(`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conname = 'schedules_group_id_fkey';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
