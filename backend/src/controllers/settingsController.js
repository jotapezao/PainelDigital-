const { pool } = require('../database/db');
const { uploadFile } = require('../services/r2Service');

// GET /api/settings
async function getSettings(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM system_settings WHERE id = 1');
    if (rows.length === 0) {
      // Should not happen due to migration, but just in case
      return res.status(404).json({ error: 'Configurações não encontradas' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
}

// PUT /api/settings (admin only)
async function updateSettings(req, res) {
  const { 
    system_name, whatsapp_number, support_text, primary_color, logo_url,
    latest_app_version, app_download_url, app_update_message, app_force_update,
    github_repo, player_sync_interval_minutes
  } = req.body;
  const intervaloSincronizacao = Number.parseInt(player_sync_interval_minutes, 10);
  
  // Clear the GitHub release cache on settings update
  const clearCache = req.app.get('clearGithubCache');
  if (clearCache) {
    clearCache();
  }

  try {
    const { rows } = await pool.query(
      `UPDATE system_settings 
       SET system_name = $1, whatsapp_number = $2, support_text = $3, 
           primary_color = $4, logo_url = $5, 
           latest_app_version = $6, app_download_url = $7, 
           app_update_message = $8, app_force_update = $9,
           github_repo = $10,
           player_sync_interval_minutes = $11,
           updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        system_name, whatsapp_number, support_text, primary_color, logo_url,
        latest_app_version, app_download_url, app_update_message, app_force_update,
        github_repo,
        Number.isFinite(intervaloSincronizacao) && intervaloSincronizacao > 0
          ? intervaloSincronizacao
          : 2
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
}

// POST /api/settings/logo
async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  try {
    const { fileName, url } = await uploadFile(req.file);
    res.json({ url });
  } catch (err) {
    console.error('[Logo upload]', err.message);
    res.status(500).json({ error: 'Erro no upload da logo para o R2' });
  }
}

// GET /api/settings/backup
async function generateBackup(req, res) {
  try {
    const backupData = {};
    const tables = [
      'client_groups',
      'system_settings',
      'clients',
      'users',
      'devices',
      'device_groups',
      'device_group_members'
    ];
    
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = rows;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="painel_digital_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('[Backup Error]', err);
    res.status(500).json({ error: 'Erro ao gerar backup do sistema' });
  }
}

// POST /api/settings/import
async function importBackup(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de backup enviado' });

  const client = await pool.connect();
  try {
    const backupData = JSON.parse(req.file.buffer.toString('utf-8'));

    const clientGroups = backupData.client_groups || [];
    const systemSettings = backupData.system_settings || [];
    const clients = backupData.clients || [];
    const users = backupData.users || [];
    const devices = backupData.devices || [];
    const deviceGroups = backupData.device_groups || [];
    const deviceGroupMembers = backupData.device_group_members || [];

    if (clients.length === 0 && users.length === 0) {
      return res.status(400).json({ error: 'O backup enviado não possui dados válidos de empresas ou usuários.' });
    }

    await client.query('BEGIN');

    // 1. Importar client_groups
    for (const cg of clientGroups) {
      await client.query(`
        INSERT INTO client_groups (
          id, name, description, default_plan, default_theme_color, default_storage_quota_gb, active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()), COALESCE($9, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          default_plan = EXCLUDED.default_plan,
          default_theme_color = EXCLUDED.default_theme_color,
          default_storage_quota_gb = EXCLUDED.default_storage_quota_gb,
          active = EXCLUDED.active,
          updated_at = NOW()
      `, [
        cg.id,
        cg.name,
        cg.description || null,
        cg.default_plan || 'basic',
        cg.default_theme_color || '#6366f1',
        cg.default_storage_quota_gb !== undefined ? cg.default_storage_quota_gb : 10,
        cg.active !== false,
        cg.created_at,
        cg.updated_at
      ]);
    }

    // 2. Importar system_settings
    for (const ss of systemSettings) {
      await client.query(`
        INSERT INTO system_settings (
          id, system_name, whatsapp_number, support_text, primary_color, logo_url,
          latest_app_version, app_download_url, app_update_message, app_force_update, github_repo,
          player_sync_interval_minutes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()), COALESCE($14, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          system_name = EXCLUDED.system_name,
          whatsapp_number = EXCLUDED.whatsapp_number,
          support_text = EXCLUDED.support_text,
          primary_color = EXCLUDED.primary_color,
          logo_url = EXCLUDED.logo_url,
          latest_app_version = EXCLUDED.latest_app_version,
          app_download_url = EXCLUDED.app_download_url,
          app_update_message = EXCLUDED.app_update_message,
          app_force_update = EXCLUDED.app_force_update,
          github_repo = EXCLUDED.github_repo,
          player_sync_interval_minutes = EXCLUDED.player_sync_interval_minutes,
          updated_at = NOW()
      `, [
        ss.id,
        ss.system_name || 'Painel Digital',
        ss.whatsapp_number || null,
        ss.support_text || 'Precisa de ajuda? Entre em contato conosco!',
        ss.primary_color || '#6366f1',
        ss.logo_url || null,
        ss.latest_app_version || '1.0.0',
        ss.app_download_url || null,
        ss.app_update_message || 'Nova versão disponível!',
        ss.app_force_update === true,
        ss.github_repo || null,
        ss.player_sync_interval_minutes !== undefined ? ss.player_sync_interval_minutes : 2,
        ss.created_at,
        ss.updated_at
      ]);
    }

    // 3. Importar clients
    for (const cl of clients) {
      await client.query(`
        INSERT INTO clients (
          id, name, email, company, phone, plan, active, cache_enabled, theme_color, notes, storage_quota_gb, group_id, inherits_group_settings, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()), COALESCE($15, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          company = EXCLUDED.company,
          phone = EXCLUDED.phone,
          plan = EXCLUDED.plan,
          active = EXCLUDED.active,
          cache_enabled = EXCLUDED.cache_enabled,
          theme_color = EXCLUDED.theme_color,
          notes = EXCLUDED.notes,
          storage_quota_gb = EXCLUDED.storage_quota_gb,
          group_id = EXCLUDED.group_id,
          inherits_group_settings = EXCLUDED.inherits_group_settings,
          updated_at = NOW()
      `, [
        cl.id,
        cl.name,
        cl.email,
        cl.company || null,
        cl.phone || null,
        cl.plan || 'basic',
        cl.active !== false,
        cl.cache_enabled !== false,
        cl.theme_color || '#6366f1',
        cl.notes || null,
        cl.storage_quota_gb !== undefined ? cl.storage_quota_gb : 10,
        cl.group_id || null,
        cl.inherits_group_settings !== false,
        cl.created_at,
        cl.updated_at
      ]);
    }

    // 4. Importar users
    for (const u of users) {
      await client.query(`
        INSERT INTO users (
          id, client_id, name, email, password_hash, role, active, avatar_url, username, last_seen, last_ip, location_city, location_district, session_start, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, NOW()), COALESCE($16, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          client_id = EXCLUDED.client_id,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          active = EXCLUDED.active,
          avatar_url = EXCLUDED.avatar_url,
          username = EXCLUDED.username,
          last_seen = EXCLUDED.last_seen,
          last_ip = EXCLUDED.last_ip,
          location_city = EXCLUDED.location_city,
          location_district = EXCLUDED.location_district,
          session_start = EXCLUDED.session_start,
          updated_at = NOW()
      `, [
        u.id,
        u.client_id,
        u.name,
        u.email,
        u.password_hash,
        u.role || 'client',
        u.active !== false,
        u.avatar_url || null,
        u.username || null,
        u.last_seen || null,
        u.last_ip || null,
        u.location_city || null,
        u.location_district || null,
        u.session_start || null,
        u.created_at,
        u.updated_at
      ]);
    }

    // 5. Importar devices
    for (const d of devices) {
      await client.query(`
        INSERT INTO devices (
          id, client_id, name, location, pairing_code, paired, cache_enabled, status,
          last_seen, orientation, resolution, notes, player_status, ip_address, last_error, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, COALESCE($16, NOW()), COALESCE($17, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          client_id = EXCLUDED.client_id,
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          pairing_code = EXCLUDED.pairing_code,
          paired = EXCLUDED.paired,
          cache_enabled = EXCLUDED.cache_enabled,
          status = EXCLUDED.status,
          last_seen = EXCLUDED.last_seen,
          orientation = EXCLUDED.orientation,
          resolution = EXCLUDED.resolution,
          notes = EXCLUDED.notes,
          player_status = EXCLUDED.player_status,
          ip_address = EXCLUDED.ip_address,
          last_error = EXCLUDED.last_error,
          updated_at = NOW()
      `, [
        d.id,
        d.client_id,
        d.name,
        d.location || null,
        d.pairing_code || null,
        d.paired !== false,
        d.cache_enabled !== false,
        d.status || 'offline',
        d.last_seen || null,
        d.orientation || 'landscape',
        d.resolution || null,
        d.notes || null,
        d.player_status || 'idle',
        d.ip_address || null,
        d.last_error || null,
        d.created_at,
        d.updated_at
      ]);
    }

    // 6. Importar device_groups
    for (const dg of deviceGroups) {
      await client.query(`
        INSERT INTO device_groups (id, client_id, name, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), COALESCE($6, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          client_id = EXCLUDED.client_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW()
      `, [
        dg.id,
        dg.client_id,
        dg.name,
        dg.description || null,
        dg.created_at,
        dg.updated_at
      ]);
    }

    // 7. Importar device_group_members
    for (const dgm of deviceGroupMembers) {
      await client.query(`
        INSERT INTO device_group_members (group_id, device_id)
        VALUES ($1, $2)
        ON CONFLICT (group_id, device_id) DO NOTHING
      `, [
        dgm.group_id,
        dgm.device_id
      ]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Backup importado com sucesso! ${clients.length} empresas, ${users.length} usuários, ${devices.length} TVs e ${deviceGroups.length} grupos foram importados/atualizados.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Import Backup Error]', err);
    res.status(500).json({ error: 'Erro ao importar backup do sistema. Verifique se o arquivo JSON está no formato correto.' });
  } finally {
    client.release();
  }
}

module.exports = { getSettings, updateSettings, uploadLogo, generateBackup, importBackup };
