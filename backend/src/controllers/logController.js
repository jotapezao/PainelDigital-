const { pool } = require('../database/db');

// GET /api/logs
async function list(req, res) {
  try {
    const { device_id, limit = 100 } = req.query;
    const isAdmin = req.user.role === 'admin';
    let conditions = [];
    let params = [];
    let idx = 1;

    if (device_id) { conditions.push(`l.device_id = $${idx++}`); params.push(device_id); }
    if (!isAdmin) {
      conditions.push(`d.client_id = $${idx++}`);
      params.push(req.user.client_id);
    }
    params.push(parseInt(limit));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT l.*, d.name as device_name, m.name as media_name, p.name as playlist_name
       FROM device_logs l
       LEFT JOIN devices d ON l.device_id = d.id
       LEFT JOIN medias m ON l.media_id = m.id
       LEFT JOIN playlists p ON l.playlist_id = p.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${idx}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/logs (TV posts log events)
async function create(req, res) {
  const { device_id, media_id, playlist_id, event, message } = req.body;
  if (!device_id || !event) return res.status(400).json({ error: 'device_id e event são obrigatórios' });
  try {
    await pool.query(
      `INSERT INTO device_logs (device_id, media_id, playlist_id, event, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [device_id, media_id || null, playlist_id || null, event, message || null]
    );
    res.status(201).json({ message: 'Log registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/logs/stats
async function stats(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const clientFilter = isAdmin ? '' : `AND d.client_id = '${req.user.client_id}'`;

    const [totalDevices, onlineDevices, totalMedias, totalPlaylists] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM devices d WHERE 1=1 ${isAdmin ? '' : `AND d.client_id = '${req.user.client_id}'`}`),
      pool.query(`SELECT COUNT(*) FROM devices d WHERE status = 'online' ${isAdmin ? '' : `AND d.client_id = '${req.user.client_id}'`}`),
      pool.query(`SELECT COUNT(*) FROM medias m WHERE 1=1 ${isAdmin ? '' : `AND m.client_id = '${req.user.client_id}'`}`),
      pool.query(`SELECT COUNT(*) FROM playlists p WHERE 1=1 ${isAdmin ? '' : `AND p.client_id = '${req.user.client_id}'`}`),
    ]);

    res.json({
      total_devices: parseInt(totalDevices.rows[0].count),
      online_devices: parseInt(onlineDevices.rows[0].count),
      total_medias: parseInt(totalMedias.rows[0].count),
      total_playlists: parseInt(totalPlaylists.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, create, stats };
