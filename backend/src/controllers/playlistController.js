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
  const { 
    name, description, client_id, layout, footer_text, show_clock, show_weather, 
    theme_color, orientation, scale_mode, footer_opacity, footer_font_size, 
    footer_font_color, footer_position, footer_font_family, rss_url, transition_effect,
    ticker_speed, ticker_direction, ticker_height, ticker_blur,
    show_social, social_handle, social_platform, card_transparency, ticker_label
  } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const effectiveClientId = req.user.role === 'admin' ? (client_id || req.user.client_id) : req.user.client_id;
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO playlists (
        client_id, name, description, layout, footer_text, show_clock, show_weather, 
        theme_color, orientation, scale_mode, footer_opacity, footer_font_size, 
        footer_font_color, footer_position, footer_font_family, rss_url, transition_effect,
        ticker_speed, ticker_direction, ticker_height, ticker_blur,
        show_social, social_handle, social_platform, card_transparency, ticker_label,
        social_qrcode, widget_position, social_position, show_progress_bar
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30) RETURNING *`,
      [
        effectiveClientId, name, description || null, layout || 'fullscreen', footer_text || null, 
        show_clock || false, show_weather || false, theme_color || '#818cf8', orientation || 'horizontal', 
        scale_mode || 'cover', footer_opacity || 0.8, footer_font_size || '1.5rem', 
        footer_font_color || '#ffffff', footer_position || 'bottom', 
        footer_font_family || 'Inter', rss_url || null, transition_effect || 'fade',
        ticker_speed || 'medium', ticker_direction || 'ltr', ticker_height || 80, ticker_blur !== false,
        show_social || false, social_handle || null, social_platform || 'instagram', card_transparency ?? 0.4, ticker_label || 'NOTÍCIAS',
        social_qrcode || false, widget_position || 'top-right', social_position || 'bottom-right', show_progress_bar !== false
      ]
    );
    const playlist = rows[0];

    // Save items if provided
    if (req.body.items && req.body.items.length > 0) {
      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];
        await pool.query(
          `INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds)
           VALUES ($1, $2, $3, $4)`,
          [playlist.id, item.media_id, i, item.duration_seconds || 10]
        );
      }
    }

    res.status(201).json({ ...playlist, items: req.body.items || [] });
  } catch (err) {
    console.error('Erro ao criar playlist:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /api/playlists/:id
async function update(req, res) {
  const { 
    name, description, active, layout, footer_text, show_clock, show_weather, 
    theme_color, client_id, orientation, scale_mode, footer_opacity, 
    footer_font_size, footer_font_color, footer_position, footer_font_family, 
    rss_url, transition_effect,
    ticker_speed, ticker_direction, ticker_height, ticker_blur,
    show_social, social_handle, social_platform, card_transparency, ticker_label
  } = req.body;
  try {
    const effectiveClientId = req.user.role === 'admin' ? client_id : undefined;

    let query = `UPDATE playlists SET 
      name=$1, description=$2, active=$3, layout=$4, footer_text=$5, 
      show_clock=$6, show_weather=$7, theme_color=$8, orientation=$9, 
      scale_mode=$10, footer_opacity=$11, footer_font_size=$12, 
      footer_font_color=$13, footer_position=$14, footer_font_family=$15, 
      rss_url=$16, transition_effect=$17, ticker_speed=$18, ticker_direction=$19, 
      ticker_height=$20, ticker_blur=$21, show_social=$22, social_handle=$23, 
      social_platform=$24, card_transparency=$25, ticker_label=$26, 
      social_qrcode=$27, widget_position=$28, social_position=$29, show_progress_bar=$30, updated_at=NOW()`;
    let params = [
      name, description || null, active !== false, layout, footer_text, 
      show_clock, show_weather, theme_color, orientation || 'horizontal', 
      scale_mode || 'cover', footer_opacity || 0.8, footer_font_size || '1.5rem', 
      footer_font_color || '#ffffff', footer_position || 'bottom', 
      footer_font_family || 'Inter', rss_url || null, transition_effect || 'fade',
      ticker_speed || 'medium', ticker_direction || 'ltr', ticker_height || 80, ticker_blur !== false,
      show_social || false, social_handle || null, social_platform || 'instagram', card_transparency ?? 0.4, ticker_label || 'NOTÍCIAS',
      req.body.social_qrcode || false, req.body.widget_position || 'top-right', req.body.social_position || 'bottom-right', req.body.show_progress_bar !== false
    ];
    let idx = 31;

    if (effectiveClientId) {
      query += `, client_id=$${idx++}`;
      params.push(effectiveClientId);
    }

    query += ` WHERE id=$${idx} RETURNING *`;
    params.push(req.params.id);

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    const playlist = rows[0];

    // Update items (clear and re-insert)
    if (req.body.items) {
      await pool.query('DELETE FROM playlist_items WHERE playlist_id = $1', [playlist.id]);
      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];
        await pool.query(
          `INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds)
           VALUES ($1, $2, $3, $4)`,
          [playlist.id, item.media_id, i, item.duration_seconds || 10]
        );
      }
    }

    res.json(playlist);
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
    const clientId = req.user.client_id;
    if (!clientId) {
      console.error('[Player] Erro: Usuário sem client_id');
      return res.status(401).json({ error: 'Cliente não identificado' });
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const currentDay = now.getDay();

    console.log(`[Player] Tentando carregar para Cliente: ${clientId}`);

    // Passo 1: Tentar encontrar uma playlist através de AGENDAMENTO ATIVO
    const { rows: scheduled } = await pool.query(
      `SELECT p.* 
       FROM schedules s
       JOIN playlists p ON s.playlist_id = p.id
       WHERE p.client_id = $1 
         AND p.active = true 
         AND s.active = true
         AND $2 = ANY(s.days_of_week)
         AND s.start_time <= $3
         AND s.end_time >= $3
       LIMIT 1`,
      [clientId, currentDay, currentTime]
    );

    let playlist;

    if (scheduled.length > 0) {
      console.log(`[Player] Sucesso: Playlist agendada encontrada (${scheduled[0].name})`);
      playlist = scheduled[0];
    } else {
      console.log(`[Player] Nenhum agendamento para agora. Buscando qualquer playlist ativa...`);
      // Passo 2: Fallback para QUALQUER playlist ativa deste cliente que tenha itens
      const { rows: fallbacks } = await pool.query(
        `SELECT p.* 
         FROM playlists p 
         WHERE p.client_id = $1 AND p.active = true 
         AND (SELECT COUNT(*) FROM playlist_items WHERE playlist_id = p.id) > 0
         ORDER BY p.updated_at DESC LIMIT 1`,
        [clientId]
      );
      
      if (fallbacks.length === 0) {
        console.log(`[Player] Crítico: Cliente ${clientId} não tem NENHUMA playlist ativa com mídias.`);
        return res.status(404).json({ error: 'Nenhuma mídia programada para este cliente.' });
      }
      playlist = fallbacks[0];
      console.log(`[Player] Sucesso: Usando playlist padrão/ativa (${playlist.name})`);
    }

    // Passo 3: Carregar os itens da playlist escolhida
    const { rows: items } = await pool.query(
      `SELECT pi.*, m.type, m.filename, m.name as media_name
       FROM playlist_items pi 
       JOIN medias m ON pi.media_id = m.id
       WHERE pi.playlist_id = $1 
       ORDER BY pi.position ASC`,
      [playlist.id]
    );

    if (items.length === 0) {
      console.log(`[Player] Erro: A playlist ${playlist.name} está vazia no banco.`);
      return res.status(404).json({ error: 'Playlist sem mídias.' });
    }

    const publicUrl = (process.env.R2_PUBLIC_URL || '').endsWith('/') 
      ? process.env.R2_PUBLIC_URL 
      : `${process.env.R2_PUBLIC_URL || ''}/`;

    playlist.items = items.map(item => ({
      ...item,
      url: item.type === 'widget' ? item.filename : `${publicUrl}${item.filename}`,
    }));
    
    console.log(`[Player] OK! Enviando ${items.length} mídias para o player.`);
    res.json(playlist);
  } catch (err) {
    console.error('[Player] Erro fatal em getActive:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

module.exports = { list, getById, create, update, remove, setItems, getActive };
