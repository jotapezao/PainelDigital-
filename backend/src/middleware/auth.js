const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'painel-digital-secreto-temporario-2026';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    // Background update of last_seen to keep monitor accurate
    const { pool } = require('../database/db');
    pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [decoded.id]).catch(() => {});

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireAdmin, requireRole };
