const { pool } = require('../database/db');
const { uploadFile, deleteFile, listFiles } = require('../services/r2Service');

// GET /api/medias
async function list(req, res) {
  try {
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const { type, client_id, folder_id } = req.query;

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

    if (folder_id) {
      if (folder_id === 'root' || folder_id === 'null') {
        conditions.push(`m.folder_id IS NULL`);
      } else {
        conditions.push(`m.folder_id = $${idx++}`);
        params.push(folder_id);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT m.*, c.name as client_name
       FROM medias m LEFT JOIN clients c ON m.client_id = c.id
       ${where} ORDER BY m.created_at DESC`,
      params
    );

    // Se não houver R2_PUBLIC_URL, usa a rota local de uploads como fallback
    const rawUrl = process.env.R2_PUBLIC_URL || '/uploads';
    const publicUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

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

    // Validate 10GB limit per client
    const { rows: sizeRows } = await pool.query(
      `SELECT SUM(size_bytes) as total_size FROM medias WHERE client_id = $1`,
      [clientId]
    );
    const currentSize = parseInt(sizeRows[0].total_size || '0');
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    
    if (currentSize + req.file.size > maxSize) {
      return res.status(400).json({ error: 'Limite de armazenamento de 10GB excedido para esta empresa.' });
    }

    // Upload to R2
    const { fileName, url } = await uploadFile(req.file);

    let folderId = req.body.folder_id;
    if (!folderId || folderId === 'null' || folderId === 'undefined' || folderId === '') {
      folderId = null;
    }

    const { rows } = await pool.query(
      `INSERT INTO medias (client_id, name, type, filename, original_name, mime_type, size_bytes, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        clientId,
        req.body.name || req.file.originalname.replace(/\.[^/.]+$/, ''),
        type,
        fileName,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        folderId,
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
  const { name, active, folder_id } = req.body;
  let targetFolderId = folder_id;
  if (targetFolderId === 'null' || targetFolderId === 'root' || targetFolderId === '') {
    targetFolderId = null;
  }
  try {
    const { rows: mediaRows } = await pool.query('SELECT * FROM medias WHERE id = $1', [req.params.id]);
    if (mediaRows.length === 0) return res.status(404).json({ error: 'Mídia não encontrada' });
    const media = mediaRows[0];

    // Check client ownership
    if (req.user.role !== 'admin' && media.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const { rows } = await pool.query(
      `UPDATE medias SET name=COALESCE($1, name), active=COALESCE($2, active), folder_id=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [name, active !== undefined ? active : media.active, targetFolderId, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[updateMedia]', err.message);
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

// === METODOS DO SISTEMA DE PASTAS DE MIDIAS (V3.2) ===

// GET /api/medias/folders
async function listFolders(req, res) {
  try {
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const clientId = isRestricted ? req.user.client_id : (req.query.client_id || req.user.client_id);

    const { rows } = await pool.query(
      `SELECT * FROM media_folders 
       WHERE client_id = $1 
       ORDER BY name ASC`,
      [clientId]
    );

    res.json(rows);
  } catch (err) {
    console.error('[listFolders]', err.message);
    res.status(500).json({ error: 'Erro interno ao listar pastas' });
  }
}

// POST /api/medias/folders
async function createFolder(req, res) {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'O nome da pasta é obrigatório' });

  try {
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const clientId = isRestricted ? req.user.client_id : (req.body.client_id || req.user.client_id);

    const { rows } = await pool.query(
      `INSERT INTO media_folders (client_id, name, color)
       VALUES ($1, $2, $3) RETURNING *`,
      [clientId, name, color || '#4f46e5']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[createFolder]', err.message);
    res.status(500).json({ error: 'Erro interno ao criar pasta' });
  }
}

// PUT /api/medias/folders/:id
async function updateFolder(req, res) {
  const { name, color } = req.body;
  try {
    const { rows: folderRows } = await pool.query('SELECT * FROM media_folders WHERE id = $1', [req.params.id]);
    if (folderRows.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });

    const folder = folderRows[0];
    if (req.user.role !== 'admin' && folder.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    const { rows } = await pool.query(
      `UPDATE media_folders 
       SET name = COALESCE($1, name), color = COALESCE($2, color), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, color, req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('[updateFolder]', err.message);
    res.status(500).json({ error: 'Erro interno ao atualizar pasta' });
  }
}

// DELETE /api/medias/folders/:id
async function removeFolder(req, res) {
  try {
    const { rows: folderRows } = await pool.query('SELECT * FROM media_folders WHERE id = $1', [req.params.id]);
    if (folderRows.length === 0) return res.status(404).json({ error: 'Pasta não encontrada' });

    const folder = folderRows[0];
    if (req.user.role !== 'admin' && folder.client_id !== req.user.client_id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }

    // Buscar mídias dessa pasta para deletar arquivos do R2
    const { rows: mediaRows } = await pool.query(
      'SELECT id, filename, type FROM medias WHERE folder_id = $1',
      [req.params.id]
    );

    for (const m of mediaRows) {
      if (m.type !== 'widget') {
        try {
          await deleteFile(m.filename);
        } catch (err) {
          console.error(`Erro ao deletar arquivo ${m.filename} do R2:`, err.message);
        }
      }
    }

    // Exclui a pasta do banco de dados (cascade deletará as mídias no banco)
    await pool.query('DELETE FROM media_folders WHERE id = $1', [req.params.id]);

    res.json({ message: 'Pasta e todas as suas mídias removidas com sucesso' });
  } catch (err) {
    console.error('[removeFolder]', err.message);
    res.status(500).json({ error: 'Erro interno ao remover pasta' });
  }
}

module.exports = { list, upload, remove, update, createWidget, listFolders, createFolder, updateFolder, removeFolder };
