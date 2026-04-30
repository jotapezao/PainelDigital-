const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/db');

const https = require('https');

async function resolveLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost')) return null;
  return new Promise((resolve) => {
    https.get(`https://ip-api.com/json/${ip}?fields=status,city,district`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            resolve({ city: json.city, district: json.district });
          } else resolve(null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role, client_id: user.client_id },
    process.env.JWT_SECRET || 'painel-digital-secreto-temporario-2026',
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login — aceita email OU username
async function login(req, res) {
  const { email, username, password, login: loginField } = req.body;
  const identifier = loginField || username || email; // suporta os 3 formatos
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Usuário/email e senha são obrigatórios' });
  }
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const loc = await resolveLocation(ip);

    // Tenta por username OU email
    const { rows } = await pool.query(
      `UPDATE users SET 
        last_seen = NOW(), 
        last_ip = $2,
        location_city = COALESCE($3, location_city),
        location_district = COALESCE($4, location_district),
        session_start = COALESCE(session_start, NOW())
       WHERE (username = $1 OR email = $1) AND active = true 
       RETURNING *`,
      [identifier.toLowerCase().trim(), ip, loc?.city || null, loc?.district || null]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const user = rows[0];
    
    // Also update client name for the response
    const clientRes = await pool.query('SELECT name FROM clients WHERE id = $1', [user.client_id]);
    user.client_name = clientRes.rows[0]?.name;

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
        username: user.username,
        role: user.role,
        client_id: user.client_id,
        client_name: user.client_name,
        avatar_url: user.avatar_url,
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
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    // Periodically update location if missing
    let loc = null;
    const checkLoc = await pool.query('SELECT location_city, last_ip FROM users WHERE id = $1', [req.user.id]);
    if (checkLoc.rows.length > 0 && !checkLoc.rows[0].location_city) {
        loc = await resolveLocation(ip);
    }

    const { rows } = await pool.query(
      `UPDATE users SET 
        last_seen = NOW(), 
        last_ip = $2,
        location_city = COALESCE($3, location_city),
        location_district = COALESCE($4, location_district)
       WHERE id = $1 RETURNING id`,
      [req.user.id, ip, loc?.city || null, loc?.district || null]
    );
    
    const userRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.username, u.role, u.client_id, u.avatar_url, u.last_ip, u.location_city, u.location_district, u.session_start, c.name as client_name
       FROM users u LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(userRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/auth/register (admin only)
async function register(req, res) {
  const { name, email, username, password, role, client_id } = req.body;
  if (!name || !password || (!email && !username)) {
    return res.status(400).json({ error: 'Nome, senha e usuário/email são obrigatórios' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, username, password_hash, role, client_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, username, role, client_id, avatar_url`,
      [name, email || null, username ? username.toLowerCase().trim() : null,
       hash, role || 'client', client_id || null, req.body.avatar_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Usuário/email já cadastrado' });
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

// GET /api/auth/users/:id (admin only)
async function getUser(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.username, u.role, u.active, u.client_id, u.avatar_url, u.created_at, c.name as client_name
       FROM users u LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/auth/users (admin only)
async function listUsers(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.username, u.role, u.active, u.client_id, u.avatar_url, u.created_at, c.name as client_name
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
  const { name, email, username, role, client_id, active, avatar_url, password } = req.body;
  try {
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    }

    const { rows } = await pool.query(
      `UPDATE users SET name=$1, email=$2, username=$3, role=$4, client_id=$5, active=$6, avatar_url=$7, updated_at=NOW()
       WHERE id=$8 RETURNING id, name, email, username, role, client_id, active, avatar_url`,
      [name, email || null, username ? username.toLowerCase().trim() : null,
       role, client_id || null, active !== false, avatar_url || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Usuário/email já em uso' });
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

module.exports = { login, me, register, changePassword, getUser, listUsers, updateUser, deleteUser };
