const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/db');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, client_id: user.client_id },
    process.env.JWT_SECRET || 'painel-digital-secreto-temporario-2026',
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT u.*, c.name as client_name FROM users u
       LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.email = $1 AND u.active = true`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        client_id: user.client_id,
        client_name: user.client_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.client_id, c.name as client_name
       FROM users u LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/auth/register (admin only)
async function register(req, res) {
  const { name, email, password, role, client_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, client_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, client_id`,
      [name, email, hash, role || 'client', client_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/auth/change-password
async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/auth/users (admin only)
async function listUsers(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.client_id, u.created_at, c.name as client_name
       FROM users u LEFT JOIN clients c ON u.client_id = c.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/auth/users/:id (admin only)
async function updateUser(req, res) {
  const { name, email, role, client_id, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET name=$1, email=$2, role=$3, client_id=$4, active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING id, name, email, role, client_id, active`,
      [name, email, role, client_id || null, active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/auth/users/:id (admin only)
async function deleteUser(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { login, me, register, changePassword, listUsers, updateUser, deleteUser };
