require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./database/migrations');

// Routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const deviceRoutes = require('./routes/devices');
const mediaRoutes = require('./routes/medias');
const playlistRoutes = require('./routes/playlists');
const scheduleRoutes = require('./routes/schedules');
const logRoutes = require('./routes/logs');
const statsRoutes = require('./routes/stats');
const deviceGroupRoutes = require('./routes/device_groups');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time device status
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible in controllers
app.set('io', io);

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded media files
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/medias', mediaRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/device-groups', deviceGroupRoutes);

// WebSocket – device connections
const connectedDevices = new Map(); // deviceId -> socketId

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // TV device identifies itself
  socket.on('device:register', async ({ deviceId, token }) => {
    try {
      connectedDevices.set(deviceId, socket.id);
      socket.deviceId = deviceId;

      // Update device status in DB
      const { pool } = require('./database/db');
      await pool.query(
        'UPDATE devices SET status = $1, last_seen = NOW() WHERE id = $2',
        ['online', deviceId]
      );

      // Notify admins
      io.emit('device:status', { deviceId, status: 'online' });
      console.log(`[WS] Device registered: ${deviceId}`);
    } catch (err) {
      console.error('[WS] Device register error:', err.message);
    }
  });

  // TV requests its current playlist
  socket.on('device:sync', async ({ deviceId }) => {
    try {
      const { pool } = require('./database/db');
      
      // Get the active playlist for this device
      const plResult = await pool.query(`
        SELECT dp.playlist_id, p.name
        FROM device_playlists dp
        JOIN playlists p ON dp.playlist_id = p.id
        WHERE dp.device_id = $1 AND dp.active = true
        LIMIT 1
      `, [deviceId]);

      let playlistData = null;
      if (plResult.rows.length > 0) {
        playlistData = plResult.rows[0];
        
        // Fetch valid items for this playlist
        const itemsResult = await pool.query(`
          SELECT pi.media_id, pi.position, pi.duration_seconds, m.type, m.filename
          FROM playlist_items pi
          JOIN medias m ON pi.media_id = m.id
          WHERE pi.playlist_id = $1
            AND (pi.valid_from IS NULL OR pi.valid_from <= NOW())
            AND (pi.valid_until IS NULL OR pi.valid_until >= NOW())
          ORDER BY pi.position ASC
        `, [playlistData.playlist_id]);
        
        playlistData.items = itemsResult.rows;
      }

      socket.emit('device:playlist', playlistData);

      // Update last_seen
      await pool.query('UPDATE devices SET last_seen = NOW() WHERE id = $1', [deviceId]);
    } catch (err) {
      console.error('[WS] Device sync error:', err.message);
    }
  });

  socket.on('disconnect', async () => {
    if (socket.deviceId) {
      connectedDevices.delete(socket.deviceId);
      try {
        const { pool } = require('./database/db');
        await pool.query(
          'UPDATE devices SET status = $1 WHERE id = $2',
          ['offline', socket.deviceId]
        );
        io.emit('device:status', { deviceId: socket.deviceId, status: 'offline' });
        console.log(`[WS] Device disconnected: ${socket.deviceId}`);
      } catch (err) {
        console.error('[WS] Disconnect update error:', err.message);
      }
    }
  });
});

// Expose connected devices map (used to push updates to devices)
app.set('connectedDevices', connectedDevices);

const PORT = process.env.PORT || 3001;

// Initialize DB then start server
runMigrations()
  .then(async () => {
    // Verify connection
    const { pool } = require('./database/db');
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connected');
    } catch (dbErr) {
      console.error('❌ Database connection failed:', dbErr.message);
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
