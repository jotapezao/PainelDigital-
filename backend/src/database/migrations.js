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
        company VARCHAR(255),
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
        avatar_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create system_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        system_name VARCHAR(255) DEFAULT 'Painel Digital',
        whatsapp_number VARCHAR(50),
        support_text TEXT DEFAULT 'Precisa de ajuda? Entre em contato conosco!',
        primary_color VARCHAR(20) DEFAULT '#6366f1',
        logo_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT one_row CHECK (id = 1)
      );
    `);

    // Ensure system_settings has a row
    await client.query(`
      INSERT INTO system_settings (id, system_name)
      VALUES (1, 'Painel Digital')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ensure avatar_url column exists in users (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN 
          ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500); 
        END IF;
      END $$;
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

    // 2. Add validity columns to playlist_items safely
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlist_items' AND column_name='valid_from') THEN 
          ALTER TABLE playlist_items ADD COLUMN valid_from TIMESTAMPTZ; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlist_items' AND column_name='valid_until') THEN 
          ALTER TABLE playlist_items ADD COLUMN valid_until TIMESTAMPTZ; 
        END IF;
      END $$;
    `);

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

    // 6. Update user role constraint for 'estagiario'
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'client', 'estagiario', 'viewer'));
    `);

    // 7. Add Layout columns to playlists
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='layout') THEN 
          ALTER TABLE playlists ADD COLUMN layout VARCHAR(50) DEFAULT 'fullscreen'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='footer_text') THEN 
          ALTER TABLE playlists ADD COLUMN footer_text TEXT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='show_clock') THEN 
          ALTER TABLE playlists ADD COLUMN show_clock BOOLEAN DEFAULT false; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='show_weather') THEN 
          ALTER TABLE playlists ADD COLUMN show_weather BOOLEAN DEFAULT false; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='theme_color') THEN 
          ALTER TABLE playlists ADD COLUMN theme_color VARCHAR(20) DEFAULT '#818cf8'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='orientation') THEN 
          ALTER TABLE playlists ADD COLUMN orientation VARCHAR(20) DEFAULT 'horizontal'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='scale_mode') THEN 
          ALTER TABLE playlists ADD COLUMN scale_mode VARCHAR(20) DEFAULT 'cover'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='footer_opacity') THEN 
          ALTER TABLE playlists ADD COLUMN footer_opacity DECIMAL DEFAULT 0.8; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='footer_font_size') THEN 
          ALTER TABLE playlists ADD COLUMN footer_font_size VARCHAR(20) DEFAULT '1.5rem'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='footer_font_color') THEN 
          ALTER TABLE playlists ADD COLUMN footer_font_color VARCHAR(20) DEFAULT '#ffffff'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='footer_position') THEN 
          ALTER TABLE playlists ADD COLUMN footer_position VARCHAR(20) DEFAULT 'bottom'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='footer_font_family') THEN 
          ALTER TABLE playlists ADD COLUMN footer_font_family VARCHAR(50) DEFAULT 'Inter'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='rss_url') THEN 
          ALTER TABLE playlists ADD COLUMN rss_url TEXT; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='transition_effect') THEN 
          ALTER TABLE playlists ADD COLUMN transition_effect VARCHAR(50) DEFAULT 'fade'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='ticker_speed') THEN 
          ALTER TABLE playlists ADD COLUMN ticker_speed VARCHAR(20) DEFAULT 'medium'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='ticker_direction') THEN 
          ALTER TABLE playlists ADD COLUMN ticker_direction VARCHAR(10) DEFAULT 'ltr'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='ticker_height') THEN 
          ALTER TABLE playlists ADD COLUMN ticker_height INTEGER DEFAULT 80; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='ticker_blur') THEN 
          ALTER TABLE playlists ADD COLUMN ticker_blur BOOLEAN DEFAULT true; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='show_social') THEN 
          ALTER TABLE playlists ADD COLUMN show_social BOOLEAN DEFAULT false; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='social_handle') THEN 
          ALTER TABLE playlists ADD COLUMN social_handle VARCHAR(100); 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='social_platform') THEN 
          ALTER TABLE playlists ADD COLUMN social_platform VARCHAR(50) DEFAULT 'instagram'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='card_transparency') THEN 
          ALTER TABLE playlists ADD COLUMN card_transparency DECIMAL DEFAULT 0.4; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='ticker_label') THEN 
          ALTER TABLE playlists ADD COLUMN ticker_label VARCHAR(50) DEFAULT 'NOTÍCIAS'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='social_qrcode') THEN 
          ALTER TABLE playlists ADD COLUMN social_qrcode BOOLEAN DEFAULT false; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='widget_position') THEN 
          ALTER TABLE playlists ADD COLUMN widget_position VARCHAR(20) DEFAULT 'top-right'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='social_position') THEN 
          ALTER TABLE playlists ADD COLUMN social_position VARCHAR(20) DEFAULT 'bottom-right'; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='show_progress_bar') THEN 
          ALTER TABLE playlists ADD COLUMN show_progress_bar BOOLEAN DEFAULT true; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='social_card_style') THEN 
          ALTER TABLE playlists ADD COLUMN social_card_style VARCHAR(20) DEFAULT 'style1'; 
        END IF;

        -- Add theme_color to clients
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='theme_color') THEN 
          ALTER TABLE clients ADD COLUMN theme_color VARCHAR(20) DEFAULT '#6366f1'; 
        END IF;

        -- Add company to clients
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company') THEN 
          ALTER TABLE clients ADD COLUMN company VARCHAR(255); 
        END IF;

        -- Add notes to clients
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='notes') THEN 
          ALTER TABLE clients ADD COLUMN notes TEXT; 
        END IF;
      END $$;
    `);

    // Ensure role constraint is fully up-to-date (update any legacy 'viewer' rows first)
    await client.query(`
      UPDATE users SET role = 'estagiario' WHERE role = 'viewer';
    `);
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'client', 'estagiario'));
    `);
    // --- END NEW MIGRATIONS ---

    // ================================================
    // V2 MIGRATIONS — Advanced Features
    // ================================================

    // V2.1 — Detailed device monitoring fields
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devices' AND column_name='player_status') THEN
          ALTER TABLE devices ADD COLUMN player_status VARCHAR(50) DEFAULT 'idle';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devices' AND column_name='ip_address') THEN
          ALTER TABLE devices ADD COLUMN ip_address VARCHAR(45);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devices' AND column_name='last_error') THEN
          ALTER TABLE devices ADD COLUMN last_error TEXT;
        END IF;
      END $$;
    `);

    // V2.2 — Overlay Cards (floating image/gif overlays per playlist)
    await client.query(`
      CREATE TABLE IF NOT EXISTS playlist_overlay_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
        card_type VARCHAR(30) NOT NULL DEFAULT 'image',
        content_url TEXT,
        content_text TEXT,
        position_preset VARCHAR(20) DEFAULT 'bottom-right',
        pos_x INTEGER DEFAULT 0,
        pos_y INTEGER DEFAULT 0,
        width_px INTEGER DEFAULT 200,
        height_px INTEGER DEFAULT 200,
        opacity NUMERIC(3,2) DEFAULT 1.0,
        z_index INTEGER DEFAULT 10,
        border_radius INTEGER DEFAULT 0,
        animation_in VARCHAR(30) DEFAULT 'fade-in',
        animation_out VARCHAR(30) DEFAULT 'fade-out',
        display_rule VARCHAR(30) DEFAULT 'always',
        display_interval_minutes INTEGER,
        display_duration_seconds INTEGER DEFAULT 15,
        display_time_start TIME,
        display_time_end TIME,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // V2.3 — News feed styles + persistent logo in playlists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='news_style') THEN
          ALTER TABLE playlists ADD COLUMN news_style VARCHAR(30) DEFAULT 'ticker-classic';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='logo_url') THEN
          ALTER TABLE playlists ADD COLUMN logo_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='logo_position') THEN
          ALTER TABLE playlists ADD COLUMN logo_position VARCHAR(20) DEFAULT 'bottom-right';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='logo_size_px') THEN
          ALTER TABLE playlists ADD COLUMN logo_size_px INTEGER DEFAULT 80;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='logo_opacity') THEN
          ALTER TABLE playlists ADD COLUMN logo_opacity NUMERIC(3,2) DEFAULT 0.85;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='storage_quota_gb') THEN
          ALTER TABLE clients ADD COLUMN storage_quota_gb INTEGER DEFAULT 10;
        END IF;
      END $$;
    `);

    // V2.4 — Client Groups (different from device_groups — groups companies/clients)
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        default_plan VARCHAR(50) DEFAULT 'basic',
        default_theme_color VARCHAR(7) DEFAULT '#6366f1',
        default_storage_quota_gb INTEGER DEFAULT 10,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='group_id') THEN
          ALTER TABLE clients ADD COLUMN group_id UUID REFERENCES client_groups(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='inherits_group_settings') THEN
          ALTER TABLE clients ADD COLUMN inherits_group_settings BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    // V2.5 — Plan change history log
    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_change_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES users(id),
        old_plan VARCHAR(50),
        new_plan VARCHAR(50),
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // --- END V2 MIGRATIONS ---

    // V2.6 — Username login and user tracking
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_seen') THEN
          ALTER TABLE users ADD COLUMN last_seen TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_ip') THEN
          ALTER TABLE users ADD COLUMN last_ip VARCHAR(45);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location_city') THEN
          ALTER TABLE users ADD COLUMN location_city VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location_district') THEN
          ALTER TABLE users ADD COLUMN location_district VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='session_start') THEN
          ALTER TABLE users ADD COLUMN session_start TIMESTAMPTZ;
        END IF;
        -- Add group_id to playlists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='playlists' AND column_name='group_id') THEN
          ALTER TABLE playlists ADD COLUMN group_id UUID;
        END IF;
      END $$;
    `);
    // Create unique index on username where not null
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username) WHERE username IS NOT NULL;
    `);

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
