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
       LEFT JOIN devices d ON s.device_id = d.id
       LEFT JOIN playlists p ON s.playlist_id = p.id
       ${where} ORDER BY s.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[Schedule list]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/schedules/:id
async function getById(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, d.name as device_name, p.name as playlist_name
       FROM schedules s
       LEFT JOIN devices d ON s.device_id = d.id
       LEFT JOIN playlists p ON s.playlist_id = p.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[Schedule getById]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/schedules
async function create(req, res) {
  const { device_id, playlist_id, name, start_datetime, end_datetime, days_of_week, start_time, end_time } = req.body;
  if (!playlist_id) return res.status(400).json({ error: 'playlist_id é obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO schedules (device_id, playlist_id, name, start_datetime, end_datetime, days_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [device_id || null, playlist_id, name || null, start_datetime || null, end_datetime || null,
        days_of_week || [0,1,2,3,4,5,6], start_time || null, end_time || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[Schedule create]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/schedules/:id
async function update(req, res) {
  const { name, device_id, playlist_id, start_datetime, end_datetime, days_of_week, start_time, end_time, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE schedules SET name=$1, device_id=$2, playlist_id=$3, start_datetime=$4, end_datetime=$5,
       days_of_week=$6, start_time=$7, end_time=$8, active=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name || null, device_id || null, playlist_id, start_datetime || null, end_datetime || null,
       days_of_week || [0,1,2,3,4,5,6], start_time || null, end_time || null,
       active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[Schedule update]', err.message);
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

module.exports = { list, getById, create, update, remove };
