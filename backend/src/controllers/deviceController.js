const { pool } = require('../database/db');

function generatePairingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET /api/devices
async function list(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { client_id } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`d.client_id = $${idx++}`);
      params.push(req.user.client_id);
    } else if (client_id) {
      conditions.push(`d.client_id = $${idx++}`);
      params.push(client_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT d.*, c.name as client_name,
          (SELECT p.name FROM device_playlists dp
           JOIN playlists p ON dp.playlist_id = p.id
           WHERE dp.device_id = d.id AND dp.active = true
           LIMIT 1) as playlist_name,
          (SELECT dp.playlist_id FROM device_playlists dp
           WHERE dp.device_id = d.id AND dp.active = true
           LIMIT 1) as playlist_id
       FROM devices d LEFT JOIN clients c ON d.client_id = c.id
       ${where} ORDER BY d.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/devices/:id
async function getById(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, c.name as client_name FROM devices d
       LEFT JOIN clients c ON d.client_id = c.id WHERE d.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Dispositivo não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/devices
async function create(req, res) {
  const { name, location, client_id, orientation, resolution, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const effectiveClientId = req.user.role === 'admin' ? (client_id || req.user.client_id) : req.user.client_id;
  try {
    let code;
    let unique = false;
    while (!unique) {
      code = generatePairingCode();
      const exists = await pool.query('SELECT id FROM devices WHERE pairing_code = $1', [code]);
      if (exists.rows.length === 0) unique = true;
    }
    const { rows } = await pool.query(
      `INSERT INTO devices (client_id, name, location, pairing_code, orientation, resolution, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [effectiveClientId, name, location || null, code, orientation || 'landscape', resolution || null, notes || null]
    );
    const device = rows[0];

    // Assign playlist if provided
    if (req.body.playlist_id) {
      await pool.query(
        `INSERT INTO device_playlists (device_id, playlist_id, active) VALUES ($1, $2, true)`,
        [device.id, req.body.playlist_id]
      );
    }
    res.status(201).json(device);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/devices/:id
async function update(req, res) {
  const { name, location, orientation, resolution, notes, client_id, playlist_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE devices SET name=$1, location=$2, orientation=$3, resolution=$4, notes=$5, client_id=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, location || null, orientation || 'landscape', resolution || null, notes || null, client_id || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Dispositivo não encontrado' });
    const device = rows[0];

    // Handle playlist assignment
    await pool.query('UPDATE device_playlists SET active = false WHERE device_id = $1', [device.id]);
    if (playlist_id) {
      await pool.query(
        `INSERT INTO device_playlists (device_id, playlist_id, active)
         VALUES ($1, $2, true)
         ON CONFLICT (device_id, playlist_id) DO UPDATE SET active = true, assigned_at = NOW()`,
        [device.id, playlist_id]
      );
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/devices/:id
async function remove(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM devices WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Dispositivo não encontrado' });
    res.json({ message: 'Dispositivo removido!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/devices/:id/playlist
async function assignPlaylist(req, res) {
  const { playlist_id } = req.body;
  const deviceId = req.params.id;
  try {
    // Deactivate old
    await pool.query(
      'UPDATE device_playlists SET active = false WHERE device_id = $1',
      [deviceId]
    );
    if (playlist_id) {
      await pool.query(
        `INSERT INTO device_playlists (device_id, playlist_id, active)
         VALUES ($1, $2, true)
         ON CONFLICT (device_id, playlist_id) DO UPDATE SET active = true, assigned_at = NOW()`,
        [deviceId, playlist_id]
      );
    }
    // Push update to connected device via WebSocket
    const io = req.app.get('io');
    const connectedDevices = req.app.get('connectedDevices');
    const socketId = connectedDevices?.get(deviceId);
    if (socketId && io) {
      io.to(socketId).emit('device:update', { action: 'reload_playlist' });
    }
    res.json({ message: 'Playlist associada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/devices/pair/:code  (TV uses this to register itself)
async function pairDevice(req, res) {
  const { code } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM devices WHERE pairing_code = $1',
      [code.toUpperCase()]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Código inválido' });
    const device = rows[0];
    await pool.query(
      'UPDATE devices SET paired = true, status = $1, last_seen = NOW() WHERE id = $2',
      ['online', device.id]
    );
    // Return device JWT for the TV player
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: device.id, role: 'viewer', client_id: device.client_id },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );
    res.json({ device: rows[0], token });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/devices/:id/sync  (TV polls for its playlist)
async function syncDevice(req, res) {
  const deviceId = req.params.id;
  try {
    // Update last_seen
    await pool.query('UPDATE devices SET last_seen = NOW(), status = $1 WHERE id = $2', ['online', deviceId]);

    const { rows } = await pool.query(`
      SELECT
        p.id as playlist_id,
        p.name as playlist_name,
        json_agg(
          json_build_object(
            'id', pi.id,
            'position', pi.position,
            'duration_seconds', pi.duration_seconds,
            'media_id', m.id,
            'media_name', m.name,
            'media_type', m.type,
            'media_filename', m.filename
          ) ORDER BY pi.position
        ) as items
      FROM device_playlists dp
      JOIN playlists p ON dp.playlist_id = p.id
      JOIN playlist_items pi ON pi.playlist_id = p.id
      JOIN medias m ON pi.media_id = m.id
      WHERE dp.device_id = $1 AND dp.active = true
      GROUP BY p.id, p.name
      LIMIT 1
    `, [deviceId]);

    if (rows.length === 0) return res.json({ playlist: null });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const playlist = rows[0];
    playlist.items = (playlist.items || []).map(item => ({
      ...item,
      url: `${baseUrl}/uploads/${item.media_type === 'video' ? 'videos' : 'images'}/${item.media_filename}`,
    }));

    res.json({ playlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, getById, create, update, remove, assignPlaylist, pairDevice, syncDevice };
