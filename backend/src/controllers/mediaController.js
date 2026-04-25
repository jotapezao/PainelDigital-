const { pool } = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../../uploads');

function getClientFilter(user) {
  return user.role === 'admin' ? {} : { client_id: user.client_id };
}

// GET /api/medias
async function list(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { type, client_id } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (!isAdmin) {
      conditions.push(`m.client_id = $${idx++}`);
      params.push(req.user.client_id);
    } else if (client_id) {
      conditions.push(`m.client_id = $${idx++}`);
      params.push(client_id);
    }

    if (type) {
      conditions.push(`m.type = $${idx++}`);
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT m.*, c.name as client_name
       FROM medias m LEFT JOIN clients c ON m.client_id = c.id
       ${where} ORDER BY m.created_at DESC`,
      params
    );

    // Build full URL for each media
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const medias = rows.map(m => ({
      ...m,
      url: `${baseUrl}/uploads/${m.type === 'video' ? 'videos' : 'images'}/${m.filename}`,
      thumbnail_url: m.thumbnail ? `${baseUrl}/uploads/thumbnails/${m.thumbnail}` : null,
    }));

    res.json(medias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/medias/upload
async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  try {
    const isVideo = req.file.mimetype.startsWith('video/');
    const type = isVideo ? 'video' : 'image';
    const clientId = req.user.role === 'admin' && req.body.client_id
      ? req.body.client_id
      : req.user.client_id;

    const { rows } = await pool.query(
      `INSERT INTO medias (client_id, name, type, filename, original_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        clientId,
        req.body.name || req.file.originalname.replace(/\.[^/.]+$/, ''),
        type,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
      ]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const media = rows[0];
    res.status(201).json({
      ...media,
      url: `${baseUrl}/uploads/${type === 'video' ? 'videos' : 'images'}/${media.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no upload' });
  }
}

// DELETE /api/medias/:id
async function remove(req, res) {
  try {
    const { rows } = await pool.query('SELECT * FROM medias WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Mídia não encontrada' });

    const media = rows[0];

    // Check client ownership
    if (req.user.role !== 'admin' && media.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Delete file from disk
    const subDir = media.type === 'video' ? 'videos' : 'images';
    const filePath = path.join(uploadDir, subDir, media.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM medias WHERE id = $1', [req.params.id]);
    res.json({ message: 'Mídia removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/medias/:id
async function update(req, res) {
  const { name, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE medias SET name=$1, active=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [name, active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Mídia não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/medias/widget
async function createWidget(req, res) {
  const { name, url, client_id } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Nome e URL do widget são obrigatórios' });
  
  const effectiveClientId = req.user.role === 'admin' && client_id
    ? client_id
    : req.user.client_id;

  try {
    const { rows } = await pool.query(
      `INSERT INTO medias (client_id, name, type, filename, original_name, mime_type, size_bytes)
       VALUES ($1, $2, 'widget', $3, 'Widget Externo', 'text/html', 0) RETURNING *`,
      [effectiveClientId, name, url] // Reusing filename column to store the widget URL
    );
    res.status(201).json({
      ...rows[0],
      url: rows[0].filename // The URL itself
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar widget' });
  }
}

module.exports = { list, upload, remove, update, createWidget };
