const { pool } = require('../database/db');

// GET /api/playlists
async function list(req, res) {
  try {
    const isRestricted = req.user.role === 'client' || req.user.role === 'estagiario';
    const { client_id, group_id } = req.query;
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
    if (group_id) {
      conditions.push(`p.group_id = $${idx++}`);
      params.push(group_id);
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
    console.error('[Playlist list]', err.message);
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

    const { rows: items } = await pool.query(
      `SELECT pi.*, m.name as media_name, m.type as media_type,
        m.filename as media_filename, m.mime_type, m.size_bytes
       FROM playlist_items pi JOIN medias m ON pi.media_id = m.id
       WHERE pi.playlist_id = $1 ORDER BY pi.position ASC`,
      [req.params.id]
    );

    const rawUrl = process.env.R2_PUBLIC_URL || '/uploads';
    const publicUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

    playlist.items = items.map(item => ({
      ...item,
      url: item.media_type === 'widget' ? item.media_filename : `${publicUrl}${item.media_filename}`,
    }));

    res.json(playlist);
  } catch (err) {
    console.error('[Playlist getById]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /api/playlists
async function create(req, res) {
  const { 
    name, description, client_id, group_id, layout, footer_text, show_clock, show_weather, 
    theme_color, orientation, scale_mode, footer_opacity, footer_font_size, 
    footer_font_color, footer_position, footer_font_family, rss_url, transition_effect,
    ticker_speed, ticker_direction, ticker_height, ticker_blur, ticker_font_weight,
    show_social, social_handle, social_platform, card_transparency, ticker_label,
    social_qrcode, widget_position, social_position, show_progress_bar, social_card_style,
    logo_url, logo_position, logo_size_px, logo_opacity, news_style, rotation,
    clock_size, weather_size, social_size, clock_interval, weather_interval, social_interval,
    clock_duration, weather_duration, social_duration, ticker_interval, ticker_duration,
    clock_effect, weather_effect, social_effect, clock_style,
    clock_x, clock_y, weather_x, weather_y, social_x, social_y, use_custom_pos
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  
  const effectiveClientId = req.user.role === 'admin' ? (client_id || req.user.client_id) : req.user.client_id;
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO playlists (
        client_id, group_id, name, description, layout, footer_text, show_clock, show_weather, 
        theme_color, orientation, scale_mode, footer_opacity, footer_font_size, 
        footer_font_color, footer_position, footer_font_family, rss_url, transition_effect,
        ticker_speed, ticker_direction, ticker_height, ticker_blur, ticker_font_weight,
        show_social, social_handle, social_platform, card_transparency, ticker_label,
        social_qrcode, widget_position, social_position, show_progress_bar, social_card_style,
        logo_url, logo_position, logo_size_px, logo_opacity, news_style, rotation,
        clock_size, weather_size, social_size, clock_interval, weather_interval, social_interval,
        clock_duration, weather_duration, social_duration, ticker_interval, ticker_duration,
        clock_effect, weather_effect, social_effect, clock_style,
        clock_x, clock_y, weather_x, weather_y, social_x, social_y, use_custom_pos
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61) RETURNING *`,
      [
        effectiveClientId, group_id || null,
        name, description || null, layout || 'fullscreen',
        footer_text || null, show_clock || false, show_weather || false,
        theme_color || '#818cf8', orientation || 'horizontal', scale_mode || 'cover',
        footer_opacity ?? 0.8, footer_font_size || '1.5rem',
        footer_font_color || '#ffffff', footer_position || 'bottom',
        footer_font_family || 'Inter', rss_url || null, transition_effect || 'fade',
        ticker_speed || 'medium', ticker_direction || 'ltr', ticker_height || 80,
        ticker_blur !== false, ticker_font_weight || '600',
        show_social || false, social_handle || null, social_platform || 'instagram',
        card_transparency ?? 0.4, ticker_label || 'NOTÍCIAS',
        social_qrcode || false, widget_position || 'top-right',
        social_position || 'bottom-right', show_progress_bar !== false,
        social_card_style || 'style1',
        logo_url || null, logo_position || 'bottom-right',
        logo_size_px || 80, logo_opacity ?? 0.85, news_style || 'ticker-classic', rotation || 0,
        clock_size || 100, weather_size || 100, social_size || 100,
        clock_interval || 0, weather_interval || 0, social_interval || 0,
        clock_duration || 0, weather_duration || 0, social_duration || 0,
        ticker_interval || 0, ticker_duration || 0,
        clock_effect || 'fade', weather_effect || 'fade', social_effect || 'fade',
        clock_style || 'digital_transparent',
        clock_x || 0, clock_y || 0, weather_x || 0, weather_y || 0, social_x || 0, social_y || 0, use_custom_pos || false
      ]
    );
    const playlist = rows[0];

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
    console.error('[Playlist create]', err.message);
    res.status(500).json({ error: 'Erro interno ao criar playlist' });
  }
}

async function notifyDevices(req, playlistId) {
  try {
    const io = req.app.get('io');
    if (!io) return;

    // Find which client owns this playlist
    const { rows } = await pool.query('SELECT client_id FROM playlists WHERE id = $1', [playlistId]);
    if (rows.length > 0) {
      const clientId = rows[0].client_id;
      // Emit to all clients in this specific client room
      io.to(`client:${clientId}`).emit('playlist:updated', { playlistId });
      console.log(`[WS] Notified devices for client ${clientId} about playlist ${playlistId} update`);
    }
  } catch (err) {
    console.error('[notifyDevices error]', err.message);
  }
}

// PUT /api/playlists/:id
async function update(req, res) {
  const { 
    name, description, active, client_id, group_id, layout, footer_text, show_clock, show_weather, 
    theme_color, orientation, scale_mode, footer_opacity, footer_font_size, 
    footer_font_color, footer_position, footer_font_family, rss_url, transition_effect,
    ticker_speed, ticker_direction, ticker_height, ticker_blur, ticker_font_weight,
    show_social, social_handle, social_platform, card_transparency, ticker_label,
    social_qrcode, widget_position, social_position, show_progress_bar, social_card_style,
    logo_url, logo_position, logo_size_px, logo_opacity, news_style, rotation,
    clock_size, weather_size, social_size, clock_interval, weather_interval, social_interval,
    clock_duration, weather_duration, social_duration, ticker_interval, ticker_duration,
    clock_effect, weather_effect, social_effect, clock_style,
    clock_x, clock_y, weather_x, weather_y, social_x, social_y, use_custom_pos
  } = req.body;

  try {
    const effectiveClientId = req.user.role === 'admin' ? client_id : undefined;

    let query = `UPDATE playlists SET 
      name=$1, description=$2, active=$3, group_id=$4, layout=$5, footer_text=$6, 
      show_clock=$7, show_weather=$8, theme_color=$9, orientation=$10, 
      scale_mode=$11, footer_opacity=$12, footer_font_size=$13, 
      footer_font_color=$14, footer_position=$15, footer_font_family=$16, 
      rss_url=$17, transition_effect=$18, ticker_speed=$19, ticker_direction=$20, 
      ticker_height=$21, ticker_blur=$22, ticker_font_weight=$23,
      show_social=$24, social_handle=$25, social_platform=$26,
      card_transparency=$27, ticker_label=$28, social_qrcode=$29,
      widget_position=$30, social_position=$31, show_progress_bar=$32,
      social_card_style=$33, logo_url=$34, logo_position=$35,
      logo_size_px=$36, logo_opacity=$37, news_style=$38, rotation=$39,
      clock_size=$40, weather_size=$41, social_size=$42, clock_interval=$43, weather_interval=$44, social_interval=$45,
      clock_duration=$46, weather_duration=$47, social_duration=$48, ticker_interval=$49, ticker_duration=$50,
      clock_effect=$51, weather_effect=$52, social_effect=$53, clock_style=$54, 
      clock_x=$55, clock_y=$56, weather_x=$57, weather_y=$58, social_x=$59, social_y=$60, use_custom_pos=$61,
      updated_at=NOW()`;

    let params = [
      name, description || null, active !== false,
      group_id || null, layout || 'fullscreen',
      footer_text || null, show_clock || false, show_weather || false,
      theme_color || '#818cf8', orientation || 'horizontal',
      scale_mode || 'cover', footer_opacity ?? 0.8, footer_font_size || '1.5rem',
      footer_font_color || '#ffffff', footer_position || 'bottom',
      footer_font_family || 'Inter', rss_url || null, transition_effect || 'fade',
      ticker_speed || 'medium', ticker_direction || 'ltr',
      ticker_height || 80, ticker_blur !== false, ticker_font_weight || '600',
      show_social || false, social_handle || null, social_platform || 'instagram',
      card_transparency ?? 0.4, ticker_label || 'NOTÍCIAS',
      social_qrcode || false, widget_position || 'top-right',
      social_position || 'bottom-right', show_progress_bar !== false,
      social_card_style || 'style1',
      logo_url || null, logo_position || 'bottom-right',
      logo_size_px || 80, logo_opacity ?? 0.85, news_style || 'ticker-classic', rotation || 0,
      clock_size || 100, weather_size || 100, social_size || 100,
      clock_interval || 0, weather_interval || 0, social_interval || 0,
      clock_duration || 0, weather_duration || 0, social_duration || 0,
      ticker_interval || 0, ticker_duration || 0,
      clock_effect || 'fade', weather_effect || 'fade', social_effect || 'fade',
      clock_style || 'digital_transparent',
      clock_x || 0, clock_y || 0, weather_x || 0, weather_y || 0, social_x || 0, social_y || 0, use_custom_pos || false
    ];

    let idx = 62;

    if (effectiveClientId) {
      query += `, client_id=$${idx++}`;
      params.push(effectiveClientId);
    }

    query += ` WHERE id=$${idx} RETURNING *`;
    params.push(req.params.id);

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
    const playlist = rows[0];

    if (req.body.items) {
      await pool.query('DELETE FROM playlist_items WHERE playlist_id = $1', [playlist.id]);
      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];
        await pool.query(
          `INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds, transition)
           VALUES ($1, $2, $3, $4, $5)`,
          [playlist.id, item.media_id, i, item.duration_seconds || 10, item.transition || 'fade']
        );
      }
    }

    // Trigger proactive update notification
    notifyDevices(req, playlist.id);

    res.json(playlist);
  } catch (err) {
    console.error('[Playlist update]', err.message);
    res.status(500).json({ error: 'Erro interno ao atualizar playlist' });
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

// PUT /api/playlists/:id/items
async function setItems(req, res) {
  const { items } = req.body;
  const playlistId = req.params.id;
  try {
    await pool.query('DELETE FROM playlist_items WHERE playlist_id = $1', [playlistId]);
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        await pool.query(
          `INSERT INTO playlist_items (playlist_id, media_id, position, duration_seconds, valid_from, valid_until)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [playlistId, items[i].media_id, i, items[i].duration_seconds || 10,
           items[i].valid_from || null, items[i].valid_until || null]
        );
      }
    }
    
    // Trigger proactive update notification
    notifyDevices(req, playlistId);

    res.json({ message: 'Itens atualizados!' });
  } catch (err) {
    console.error('[setItems]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/playlists/active (Player)
async function getActive(req, res) {
  try {
    const clientId = req.user.client_id;
    if (!clientId) {
      return res.status(401).json({ error: 'Cliente não identificado' });
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const currentDay = now.getDay();

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
      playlist = scheduled[0];
    } else {
      const { rows: fallbacks } = await pool.query(
        `SELECT p.* 
         FROM playlists p 
         WHERE p.client_id = $1 AND p.active = true 
         AND (SELECT COUNT(*) FROM playlist_items WHERE playlist_id = p.id) > 0
         ORDER BY p.updated_at DESC LIMIT 1`,
        [clientId]
      );
      
      if (fallbacks.length === 0) {
        return res.status(404).json({ error: 'Nenhuma mídia programada para este cliente.' });
      }
      playlist = fallbacks[0];
    }

    const { rows: items } = await pool.query(
      `SELECT pi.*, m.type, m.filename, m.name as media_name
       FROM playlist_items pi 
       JOIN medias m ON pi.media_id = m.id
       WHERE pi.playlist_id = $1 
       ORDER BY pi.position ASC`,
      [playlist.id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Playlist sem mídias.' });
    }

    const rawUrl = process.env.R2_PUBLIC_URL || '/uploads';
    const publicUrl = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

    playlist.items = items.map(item => ({
      ...item,
      url: item.type === 'widget' ? item.filename : `${publicUrl}${item.filename}`,
    }));
    
    res.json(playlist);
  } catch (err) {
    console.error('[getActive]', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

module.exports = { list, getById, create, update, remove, setItems, getActive };
