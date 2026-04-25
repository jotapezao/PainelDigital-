const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// List device groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clientFilter = req.user.role === 'admin' ? '' : 'WHERE client_id = $1';
    const clientParam = req.user.role === 'admin' ? [] : [req.user.client_id];

    const result = await pool.query(`SELECT * FROM device_groups ${clientFilter} ORDER BY created_at DESC`, clientParam);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar grupos de dispositivos' });
  }
});

// Create device group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, device_ids } = req.body;
    const client_id = req.user.role === 'admin' ? req.body.client_id : req.user.client_id;
    
    if (!name || !client_id) {
      return res.status(400).json({ error: 'Nome e client_id são obrigatórios' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const groupRes = await client.query(
        'INSERT INTO device_groups (client_id, name, description) VALUES ($1, $2, $3) RETURNING *',
        [client_id, name, description]
      );
      const groupId = groupRes.rows[0].id;

      if (device_ids && device_ids.length > 0) {
        for (const deviceId of device_ids) {
          await client.query(
            'INSERT INTO device_group_members (group_id, device_id) VALUES ($1, $2)',
            [groupId, deviceId]
          );
        }
      }
      await client.query('COMMIT');
      res.status(201).json(groupRes.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar grupo' });
  }
});

// Assign playlist to group
router.post('/:id/playlists', authMiddleware, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { playlist_id } = req.body;

    await pool.query(
      'INSERT INTO group_playlists (group_id, playlist_id) VALUES ($1, $2) ON CONFLICT (group_id, playlist_id) DO NOTHING',
      [groupId, playlist_id]
    );

    // Get all devices in the group and assign the playlist to them directly as well
    const devicesRes = await pool.query('SELECT device_id FROM device_group_members WHERE group_id = $1', [groupId]);
    for (const row of devicesRes.rows) {
      await pool.query(
        'INSERT INTO device_playlists (device_id, playlist_id) VALUES ($1, $2) ON CONFLICT (device_id, playlist_id) DO NOTHING',
        [row.device_id, playlist_id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao associar playlist ao grupo' });
  }
});

module.exports = router;
