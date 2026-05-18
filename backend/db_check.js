const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:adminpassword@localhost:5432/digital_signage' });

async function run() {
  try {
    console.log('--- DEVICE GROUPS ---');
    const dg = await pool.query('SELECT * FROM device_groups');
    console.log(dg.rows.map(r => ({ id: r.id, name: r.name, client_id: r.client_id })));

    console.log('--- CLIENT GROUPS ---');
    const cg = await pool.query('SELECT * FROM client_groups');
    console.log(cg.rows.map(r => ({ id: r.id, name: r.name })));

    console.log('--- SCHEDULES ---');
    const sch = await pool.query('SELECT id, name, device_id, group_id, playlist_id FROM schedules LIMIT 5');
    console.log(sch.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
