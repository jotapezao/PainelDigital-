const { pool } = require('../database/db');

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
  const { system_name, whatsapp_number, support_text, primary_color, logo_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE system_settings 
       SET system_name = $1, whatsapp_number = $2, support_text = $3, 
           primary_color = $4, logo_url = $5, updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [system_name, whatsapp_number, support_text, primary_color, logo_url]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
}

module.exports = { getSettings, updateSettings };
