const { pool } = require('../database/db');

// GET /api/schedules
async function list(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { device_id } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;
    if (device_id) { conditions.push(`s.device_id = $${idx++}`); params.push(device_id); }
    if (!isAdmin) {
      conditions.push(`d.client_id = $${idx++}`);
      params.push(req.user.client_id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT s.*, d.name as device_name, p.name as playlist_name
       FROM schedules s
       JOIN devices d ON s.device_id = d.id
       JOIN playlists p ON s.playlist_id = p.id
       ${where} ORDER BY s.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/schedules
async function create(req, res) {
  const { device_id, playlist_id, name, start_datetime, end_datetime, days_of_week, start_time, end_time } = req.body;
  if (!device_id || !playlist_id) return res.status(400).json({ error: 'device_id e playlist_id são obrigatórios' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO schedules (device_id, playlist_id, name, start_datetime, end_datetime, days_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [device_id, playlist_id, name || null, start_datetime || null, end_datetime || null,
        days_of_week || [0,1,2,3,4,5,6], start_time || null, end_time || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/schedules/:id
async function update(req, res) {
  const { name, start_datetime, end_datetime, days_of_week, start_time, end_time, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE schedules SET name=$1, start_datetime=$2, end_datetime=$3,
       days_of_week=$4, start_time=$5, end_time=$6, active=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name || null, start_datetime || null, end_datetime || null,
       days_of_week || [0,1,2,3,4,5,6], start_time || null, end_time || null,
       active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/schedules/:id
async function remove(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ message: 'Agendamento removido!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, create, update, remove };
