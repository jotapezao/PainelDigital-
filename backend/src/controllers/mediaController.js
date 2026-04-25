const { pool } = require('../database/db');
const { uploadFile, deleteFile, listFiles } = require('../services/r2Service');

// GET /api/medias
async function list(req, res) {
  try {
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const { type, client_id } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (isRestricted) {
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

    // No R2, as URLs já estão salvas ou podem ser geradas via R2_PUBLIC_URL
    const publicUrl = process.env.R2_PUBLIC_URL.endsWith('/') 
      ? process.env.R2_PUBLIC_URL 
      : `${process.env.R2_PUBLIC_URL}/`;

    const medias = rows.map(m => ({
      ...m,
      url: m.type === 'widget' ? m.filename : `${publicUrl}${m.filename}`,
      thumbnail_url: m.thumbnail ? `${publicUrl}thumbnails/${m.thumbnail}` : null,
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
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const isVideo = req.file.mimetype.startsWith('video/');
    const type = isVideo ? 'video' : 'image';
    const clientId = isRestricted
      ? req.user.client_id
      : (req.body.client_id || req.user.client_id);

    // Upload to R2
    const { fileName, url } = await uploadFile(req.file);

    const { rows } = await pool.query(
      `INSERT INTO medias (client_id, name, type, filename, original_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        clientId,
        req.body.name || req.file.originalname.replace(/\.[^/.]+$/, ''),
        type,
        fileName,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
      ]
    );

    res.status(201).json({
      ...rows[0],
      url: url
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no upload para o R2' });
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

    // Delete from R2 (if not widget)
    if (media.type !== 'widget') {
      await deleteFile(media.filename);
    }

    await pool.query('DELETE FROM medias WHERE id = $1', [req.params.id]);
    res.json({ message: 'Mídia removida com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover mídia do R2' });
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
