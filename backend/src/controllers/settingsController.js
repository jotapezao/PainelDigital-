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
    const tables = ['system_settings', 'users', 'clients', 'devices', 'device_groups', 'media', 'playlists', 'schedules'];
    
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

    const clients = backupData.clients || [];
    const users = backupData.users || [];

    if (clients.length === 0 && users.length === 0) {
      return res.status(400).json({ error: 'O backup enviado não possui dados válidos de empresas ou usuários.' });
    }

    await client.query('BEGIN');

    // Import clients (companies)
    for (const cl of clients) {
      await client.query(`
        INSERT INTO clients (id, name, email, company, phone, plan, active, cache_enabled, theme_color, notes, storage_quota_gb, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), COALESCE($13, NOW()))
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
          updated_at = NOW()
      `, [cl.id, cl.name, cl.email, cl.company, cl.phone, cl.plan, cl.active, cl.cache_enabled, cl.theme_color, cl.notes, cl.storage_quota_gb, cl.created_at, cl.updated_at]);
    }

    // Import users (dashboard users)
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, client_id, name, email, password_hash, role, active, avatar_url, username, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()), COALESCE($11, NOW()))
        ON CONFLICT (id) DO UPDATE SET
          client_id = EXCLUDED.client_id,
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          active = EXCLUDED.active,
          avatar_url = EXCLUDED.avatar_url,
          username = EXCLUDED.username,
          updated_at = NOW()
      `, [u.id, u.client_id, u.name, u.email, u.password_hash, u.role, u.active, u.avatar_url, u.username, u.created_at, u.updated_at]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Backup importado com sucesso! ${clients.length} empresas e ${users.length} usuários foram importados/atualizados.`
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
