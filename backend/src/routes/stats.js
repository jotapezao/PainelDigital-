const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/stats — Dashboard summary
router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const clientFilter = isAdmin ? '' : 'WHERE client_id = $1';
    const clientParam = isAdmin ? [] : [req.user.client_id];

    const queries = [
      pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) AS online FROM devices ${clientFilter}`, clientParam),
      pool.query(`SELECT COUNT(*) AS total FROM medias ${clientFilter}`, clientParam),
      pool.query(`SELECT COUNT(*) AS total FROM playlists ${clientFilter}`, clientParam),
      pool.query(`SELECT COUNT(*) AS total FROM schedules WHERE active = true ${!isAdmin ? 'AND device_id IN (SELECT id FROM devices WHERE client_id = $1)' : ''}`, clientParam),
    ];

    if (isAdmin) {
      queries.push(pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN active = true THEN 1 ELSE 0 END) AS active FROM clients`));
    }

    const results = await Promise.all(queries);
    const [devicesRes, mediasRes, playlistsRes, schedulesRes, clientsRes] = results;

    res.json({
      total_devices:    parseInt(devicesRes.rows[0].total)    || 0,
      online_devices:   parseInt(devicesRes.rows[0].online)   || 0,
      total_medias:     parseInt(mediasRes.rows[0].total)     || 0,
      total_playlists:  parseInt(playlistsRes.rows[0].total)  || 0,
      active_schedules: parseInt(schedulesRes.rows[0].total)  || 0,
      ...(isAdmin && clientsRes ? {
        total_clients:  parseInt(clientsRes.rows[0].total)  || 0,
        active_clients: parseInt(clientsRes.rows[0].active) || 0,
      } : {}),
    });
  } catch (err) {
    console.error('[Stats] Error:', err.message);
    res.status(500).json({ message: 'Erro ao obter estatísticas.' });
  }
});

module.exports = router;
