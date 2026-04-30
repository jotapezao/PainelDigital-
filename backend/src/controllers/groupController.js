const { pool } = require('../database/db');

// GET /api/client-groups
async function list(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT g.*, 
        (SELECT COUNT(*) FROM clients WHERE group_id = g.id) as client_count
       FROM client_groups g ORDER BY g.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/client-groups/:id
async function getById(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM client_groups WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Grupo não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/client-groups
async function create(req, res) {
  const { name, description, default_plan, default_theme_color, default_storage_quota_gb } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO client_groups (name, description, default_plan, default_theme_color, default_storage_quota_gb)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, default_plan || 'basic', 
       default_theme_color || '#6366f1', default_storage_quota_gb || 10]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/client-groups/:id
async function update(req, res) {
  const { name, description, default_plan, default_theme_color, default_storage_quota_gb, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE client_groups SET name=$1, description=$2, default_plan=$3, 
       default_theme_color=$4, default_storage_quota_gb=$5, active=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, description || null, default_plan || 'basic', 
       default_theme_color || '#6366f1', default_storage_quota_gb || 10, 
       active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Grupo não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/client-groups/:id
async function remove(req, res) {
  try {
    await pool.query('DELETE FROM client_groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Grupo removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, getById, create, update, remove };
