const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/stats — Dashboard summary
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clientFilter = req.user.role === 'admin' ? '' : 'WHERE client_id = $1';
    const clientParam = req.user.role === 'admin' ? [] : [req.user.client_id];

    const [devicesRes, mediasRes, playlistsRes, schedulesRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) AS online FROM devices ${clientFilter}`, clientParam),
      pool.query(`SELECT COUNT(*) AS total FROM medias ${clientFilter}`, clientParam),
      pool.query(`SELECT COUNT(*) AS total FROM playlists ${clientFilter}`, clientParam),
      pool.query(`SELECT COUNT(*) AS total FROM schedules WHERE active = true ${req.user.role !== 'admin' ? 'AND client_id = $1' : ''}`, clientParam),
    ]);

    res.json({
      total_devices: parseInt(devicesRes.rows[0].total) || 0,
      online_devices: parseInt(devicesRes.rows[0].online) || 0,
      total_medias: parseInt(mediasRes.rows[0].total) || 0,
      total_playlists: parseInt(playlistsRes.rows[0].total) || 0,
      active_schedules: parseInt(schedulesRes.rows[0].total) || 0,
    });
  } catch (err) {
    console.error('[Stats] Error:', err.message);
    res.status(500).json({ message: 'Erro ao obter estatísticas.' });
  }
});

module.exports = router;
