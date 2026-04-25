const { pool } = require('../database/db');

// GET /api/clients
async function list(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    let query, params;
    if (isAdmin) {
      query = `SELECT c.*, 
        (SELECT COUNT(*) FROM users WHERE client_id = c.id) as user_count,
        (SELECT COUNT(*) FROM devices WHERE client_id = c.id) as device_count,
        (SELECT COUNT(*) FROM medias WHERE client_id = c.id) as media_count
        FROM clients c ORDER BY c.created_at DESC`;
      params = [];
    } else {
      query = `SELECT c.* FROM clients c WHERE c.id = $1`;
      params = [req.user.client_id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/clients/:id
async function getById(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT c.* FROM clients c WHERE c.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/clients
async function create(req, res) {
  const { name, email, phone, plan } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (name, email, phone, plan) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, phone || null, plan || 'basic']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/clients/:id
async function update(req, res) {
  const { name, email, phone, plan, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET name=$1, email=$2, phone=$3, plan=$4, active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, email, phone || null, plan || 'basic', active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email já em uso' });
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/clients/:id
async function remove(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json({ message: 'Cliente removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, getById, create, update, remove };
