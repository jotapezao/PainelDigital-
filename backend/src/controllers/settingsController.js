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

module.exports = { getSettings, updateSettings, uploadLogo, generateBackup };
