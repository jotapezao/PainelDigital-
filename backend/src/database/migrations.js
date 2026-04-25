const { pool } = require('./db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        plan VARCHAR(50) DEFAULT 'basic',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client', 'viewer')),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        pairing_code VARCHAR(10) UNIQUE,
        paired BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
        last_seen TIMESTAMPTZ,
        orientation VARCHAR(20) DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
        resolution VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS medias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('video', 'image')),
        filename VARCHAR(500) NOT NULL,
        original_name VARCHAR(500),
        mime_type VARCHAR(100),
        size_bytes BIGINT,
        duration_seconds INTEGER,
        width INTEGER,
        height INTEGER,
        thumbnail VARCHAR(500),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS playlist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        media_id UUID REFERENCES medias(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        duration_seconds INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_playlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        active BOOLEAN DEFAULT true,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(device_id, playlist_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        name VARCHAR(255),
        start_datetime TIMESTAMPTZ,
        end_datetime TIMESTAMPTZ,
        days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
        start_time TIME,
        end_time TIME,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        media_id UUID REFERENCES medias(id) ON DELETE SET NULL,
        playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
        event VARCHAR(50) NOT NULL,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- NEW MIGRATIONS FOR ADVANCED FEATURES ---

    // 1. Update medias type constraint to allow widgets
    await client.query(`
      ALTER TABLE medias DROP CONSTRAINT IF EXISTS medias_type_check;
      ALTER TABLE medias ADD CONSTRAINT medias_type_check CHECK (type IN ('video', 'image', 'widget'));
    `);

    // 2. Add validity columns to playlist_items
    try { await client.query(`ALTER TABLE playlist_items ADD COLUMN valid_from TIMESTAMPTZ;`); } catch(e) {}
    try { await client.query(`ALTER TABLE playlist_items ADD COLUMN valid_until TIMESTAMPTZ;`); } catch(e) {}

    // 3. Create device_groups
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Create device_group_members
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_group_members (
        group_id UUID REFERENCES device_groups(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        PRIMARY KEY (group_id, device_id)
      );
    `);
    
    // 5. Create group_playlists table (so a whole group can play a playlist)
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_playlists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID REFERENCES device_groups(id) ON DELETE CASCADE,
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        active BOOLEAN DEFAULT true,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(group_id, playlist_id)
      );
    `);
    // --- END NEW MIGRATIONS ---

    // Create default admin if not exists
    const { rows } = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);

      // Create system client first
      const clientResult = await client.query(`
        INSERT INTO clients (name, email) VALUES ('Sistema', 'admin@sistema.com')
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `);

      await client.query(`
        INSERT INTO users (client_id, name, email, password_hash, role)
        VALUES ($1, 'Administrador', 'admin@sistema.com', $2, 'admin')
        ON CONFLICT (email) DO NOTHING
      `, [clientResult.rows[0].id, hash]);

      console.log('✅ Default admin created: admin@sistema.com / admin123');
    }

    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
