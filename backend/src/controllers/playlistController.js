const { pool } = require('../database/db');

// GET /api/playlists
async function list(req, res) {
  try {
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const { client_id } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;
    if (isRestricted) { 
      conditions.push(`p.client_id = $${idx++}`); 
      params.push(req.user.client_id); 
    }
    else if (client_id) { 
      conditions.push(`p.client_id = $${idx++}`); 
      params.push(client_id); 
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT p.*, c.name as client_name,
        (SELECT COUNT(*) FROM playlist_items WHERE playlist_id = p.id) as item_count
       FROM playlists p LEFT JOIN clients c ON p.client_id = c.id
       ${where} ORDER BY p.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/playlists/:id
async function getById(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name as client_name FROM playlists p
       LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    const playlist = rows[0];

    // Fetch items with media info
    const { rows: items } = await pool.query(
      `SELECT pi.*, m.name as media_name, m.type as media_type,
        m.filename as media_filename, m.mime_type, m.size_bytes
       FROM playlist_items pi JOIN medias m ON pi.media_id = m.id
       WHERE pi.playlist_id = $1 ORDER BY pi.position ASC`,
      [req.params.id]
    );

    const publicUrl = process.env.R2_PUBLIC_URL.endsWith('/') 
      ? process.env.R2_PUBLIC_URL 
      : `${process.env.R2_PUBLIC_URL}/`;

    playlist.items = items.map(item => ({
      ...item,
      url: item.media_type === 'widget' ? item.media_filename : `${publicUrl}${item.media_filename}`,
    }));

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/playlists
async function create(req, res) {
  const { name, description, client_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
  const effectiveClientId = isRestricted ? req.user.client_id : (client_id || req.user.client_id);
  try {
    const { rows } = await pool.query(
      `INSERT INTO playlists (client_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [effectiveClientId, name, description || null]
    );
    res.status(201).json({ ...rows[0], items: [] });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/playlists/:id
async function update(req, res) {
  const { name, description, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE playlists SET name=$1, description=$2, active=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [name, description || null, active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/playlists/:id
async function remove(req, res) {
  try {
    const { rowCount } = await pool.query('DELETE FROM playlists WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    res.json({ message: 'Playlist removida!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/playlists/:id/items  (replace all items with new ordered list)
async function setItems(req, res) {
  const { items } = req.body; // [{ media_id, duration_seconds }]
  const playlistId = req.params.id;
  try {
    await pool.query('DELETE FROM playlist_items WHERE playlist_id = $1', [playlistId]);
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        await pool.query(
          `INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds, valid_from, valid_until)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            playlistId, 
            items[i].media_id, 
            i, 
            items[i].duration_seconds || 10,
            items[i].valid_from || null,
            items[i].valid_until || null
          ]
        );
      }
    }
    res.json({ message: 'Itens atualizados!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/playlists/active (for Player mode)
async function getActive(req, res) {
  try {
    const { rows: playlists } = await pool.query(
      `SELECT * FROM playlists WHERE client_id = $1 AND active = true LIMIT 1`,
      [req.user.client_id]
    );
    if (playlists.length === 0) return res.status(404).json({ error: 'Nenhuma playlist ativa' });
    const playlist = playlists[0];

    const { rows: items } = await pool.query(
      `SELECT pi.*, m.type, m.filename 
       FROM playlist_items pi JOIN medias m ON pi.media_id = m.id
       WHERE pi.playlist_id = $1 
         AND (pi.valid_from IS NULL OR pi.valid_from <= NOW())
         AND (pi.valid_until IS NULL OR pi.valid_until >= NOW())
       ORDER BY pi.position ASC`,
      [playlist.id]
    );

    const publicUrl = process.env.R2_PUBLIC_URL.endsWith('/') 
      ? process.env.R2_PUBLIC_URL 
      : `${process.env.R2_PUBLIC_URL}/`;

    playlist.items = items.map(item => ({
      ...item,
      url: item.type === 'widget' ? item.filename : `${publicUrl}${item.filename}`,
    }));
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, getById, create, update, remove, setItems, getActive };
