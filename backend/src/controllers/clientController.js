const { pool } = require('../database/db');
const bcrypt = require('bcryptjs');

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
      query = `SELECT c.*,
        (SELECT COUNT(*) FROM users WHERE client_id = c.id) as user_count,
        (SELECT COUNT(*) FROM devices WHERE client_id = c.id) as device_count,
        (SELECT COUNT(*) FROM medias WHERE client_id = c.id) as media_count
        FROM clients c WHERE c.id = $1`;
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
      `SELECT c.*,
        (SELECT COUNT(*) FROM users WHERE client_id = c.id) as user_count,
        (SELECT COUNT(*) FROM devices WHERE client_id = c.id) as device_count
       FROM clients c WHERE c.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/clients/:id/users — list users linked to a client
async function getUsers(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, active, avatar_url, created_at
       FROM users WHERE client_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/clients
// Accepts optional user fields: user_name, user_email, user_password, user_role
async function create(req, res) {
  const { name, email, company, phone, plan, theme_color, notes,
          user_name, user_email, user_password, user_role } = req.body;

  if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    const clientResult = await db.query(
      `INSERT INTO clients (name, email, company, phone, plan, theme_color, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, company || null, phone || null, plan || 'basic',
       theme_color || '#6366f1', notes || null]
    );
    const newClient = clientResult.rows[0];

    // Optionally create the first user for this client
    if (user_name && user_email && user_password) {
      const hash = await bcrypt.hash(user_password, 10);
      await db.query(
        `INSERT INTO users (client_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [newClient.id, user_name, user_email, hash, user_role || 'client']
      );
    }

    await db.query('COMMIT');
    res.status(201).json(newClient);
  } catch (err) {
    await db.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    db.release();
  }
}

// PUT /api/clients/:id
async function update(req, res) {
  const { name, email, company, phone, plan, active, theme_color, notes } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET name=$1, email=$2, company=$3, phone=$4, plan=$5,
       active=$6, theme_color=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, email, company || null, phone || null, plan || 'basic',
       active !== false, theme_color || '#6366f1', notes || null, req.params.id]
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

module.exports = { list, getById, getUsers, create, update, remove };
