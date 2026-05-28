const { pool } = require('../database/db');
const {
  normalizarPrioridade,
  normalizarRepeatType,
  verificarAgendamentoAtivo,
  detectarConflitosAgenda,
  resumirRepeticao,
  formatarPeriodo,
  gerarChaveEscopo,
  obterNomeEscopo,
  obterTipoEscopo,
  compararEspecificidade,
  pesoPrioridade,
} = require('../services/agendamentoService');

function normalizarArrayNumerico(valor, fallback = []) {
  if (!Array.isArray(valor) || valor.length === 0) return fallback;
  return valor
    .map((item) => parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    .sort((a, b) => a - b);
}

function normalizarRepeatConfig(valor) {
  if (!valor) return {};
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return {};
    }
  }
  if (typeof valor === 'object') return valor;
  return {};
}

function validarEscopo(client_id, device_id, group_id, client_group_id) {
  if (client_group_id && (client_id || device_id || group_id)) {
    return 'Selecione apenas uma opção: Grupo de Clientes OU (Cliente/TV/Grupo de TVs).';
  }
  if (device_id && group_id) {
    return 'Selecione apenas uma opção: TV, Grupo ou Cliente.';
  }
  if (!client_id && !device_id && !group_id && !client_group_id) {
    return 'Informe um Cliente, Grupo de Clientes, uma TV ou um Grupo de TVs para o agendamento.';
  }
  return null;
}

function montarCampoEscopo(agendamento) {
  return {
    tipo_escopo: obterTipoEscopo(agendamento),
    chave_escopo: gerarChaveEscopo(agendamento),
    label: obterNomeEscopo(agendamento),
    client_group_id: agendamento.client_group_id || null,
  };
}

function aplicarStatusLista(agendamentos = []) {
  const agora = new Date();
  const vigentesPorEscopo = new Map();

  const ordenados = [...agendamentos].sort((a, b) => {
    const comparacaoPrioridade = pesoPrioridade(b.priority) - pesoPrioridade(a.priority);
    if (comparacaoPrioridade !== 0) return comparacaoPrioridade;
    return compararEspecificidade(a, b);
  });

  for (const item of ordenados) {
    const chaveEscopo = gerarChaveEscopo(item);
    const statusBase = verificarAgendamentoAtivo(item, agora);
    const conflitos = detectarConflitosAgenda(item, ordenados.filter((outro) => gerarChaveEscopo(outro) === chaveEscopo));
    const vencedorAtual = vigentesPorEscopo.get(chaveEscopo);

    let status = statusBase.status;
    let motivo = statusBase.motivo;

    if (statusBase.ativo) {
      if (!vencedorAtual) {
        vigentesPorEscopo.set(chaveEscopo, item);
        status = 'ativo';
        motivo = 'Agendamento em execução';
      } else {
        status = 'pausado';
        motivo = 'Pausado por prioridade ou conflito';
      }
    }

    item.status = status;
    item.status_reason = motivo;
    item.conflitos = conflitos;
    item.conflito_count = conflitos.length;
    item.repeat_label = resumirRepeticao(item);
    item.periodo_label = formatarPeriodo(item);
    item.scope = montarCampoEscopo(item);
  }

  return ordenados;
}

async function registrarHistorico(agendamentoId, payload) {
  const {
    device_id = null,
    group_id = null,
    playlist_id = null,
    priority = 'normal',
    status = 'ativo',
    event = 'started',
    message = null,
    ended_at = null,
  } = payload || {};

  await pool.query(
    `INSERT INTO schedule_execution_logs (
      schedule_id, device_id, group_id, playlist_id, priority, status, event, message, ended_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [agendamentoId, device_id, group_id, playlist_id, priority, status, event, message, ended_at]
  );
}

async function carregarAgendamentosBase(req, filtros = {}) {
  const isAdmin = req.user.role === 'admin';
  let conditions = [];
  let params = [];
  let idx = 1;

  if (filtros.device_id) {
    conditions.push(`s.device_id = $${idx++}`);
    params.push(filtros.device_id);
  }
  if (filtros.group_id) {
    conditions.push(`s.group_id = $${idx++}`);
    params.push(filtros.group_id);
  }
  if (filtros.client_id) {
    conditions.push(`COALESCE(s.client_id, d.client_id, g.client_id, p.client_id) = $${idx++}`);
    params.push(filtros.client_id);
  }
  if (filtros.client_group_id) {
    conditions.push(`s.client_group_id = $${idx++}`);
    params.push(filtros.client_group_id);
  }

  if (!isAdmin) {
    // Buscar o grupo de clientes do usuário restrito para poder listar também agendamentos do grupo
    const { rows: clientRows } = await pool.query(
      'SELECT group_id FROM clients WHERE id = $1',
      [req.user.client_id]
    );
    const clientGroupId = clientRows[0]?.group_id || null;

    if (clientGroupId) {
      conditions.push(`(COALESCE(s.client_id, d.client_id, g.client_id, p.client_id) = $${idx} OR s.client_group_id = $${idx + 1})`);
      params.push(req.user.client_id, clientGroupId);
      idx += 2;
    } else {
      conditions.push(`COALESCE(s.client_id, d.client_id, g.client_id, p.client_id) = $${idx++}`);
      params.push(req.user.client_id);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.*,
      d.name AS device_name,
      g.name AS group_name,
      p.name AS playlist_name,
      c.name AS client_name,
      cg.name AS client_group_name,
      COALESCE(s.client_id, d.client_id, g.client_id, p.client_id) AS client_id
     FROM schedules s
     LEFT JOIN devices d ON s.device_id = d.id
     LEFT JOIN device_groups g ON s.group_id = g.id
     LEFT JOIN playlists p ON s.playlist_id = p.id
     LEFT JOIN clients c ON COALESCE(s.client_id, p.client_id) = c.id
     LEFT JOIN client_groups cg ON s.client_group_id = cg.id
     ${where}
     ORDER BY s.created_at DESC`,
    params
  );

  return rows;
}

async function resolverClienteDoPayload(payload) {
  if (payload.client_id) {
    return payload.client_id;
  }
  if (payload.device_id) {
    const { rows } = await pool.query('SELECT client_id FROM devices WHERE id = $1', [payload.device_id]);
    return rows[0]?.client_id || null;
  }

  if (payload.group_id) {
    const { rows } = await pool.query('SELECT client_id FROM device_groups WHERE id = $1', [payload.group_id]);
    return rows[0]?.client_id || null;
  }

  if (payload.playlist_id) {
    const { rows } = await pool.query('SELECT client_id FROM playlists WHERE id = $1', [payload.playlist_id]);
    return rows[0]?.client_id || null;
  }

  return null;
}

async function notificarAtualizacaoAgendamento(req, clientId, clientGroupId = null) {
  try {
    const io = req.app.get('io');
    if (!io) return;
    
    if (clientId) {
      io.to(`client:${clientId}`).emit('playlist:updated', {
        reason: 'schedule_changed',
        updated_at: new Date().toISOString(),
      });
    }
    
    if (clientGroupId) {
      const { rows } = await pool.query('SELECT id FROM clients WHERE group_id = $1', [clientGroupId]);
      for (const row of rows) {
        io.to(`client:${row.id}`).emit('playlist:updated', {
          reason: 'schedule_changed',
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('[Schedule notify]', err.message);
  }
}

// GET /api/schedules
async function list(req, res) {
  try {
    const { device_id, group_id, client_id } = req.query;
    const agendamentos = await carregarAgendamentosBase(req, { device_id, group_id, client_id });
    res.json(aplicarStatusLista(agendamentos));
  } catch (err) {
    console.error('[Schedule list]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /api/schedules/:id
async function getById(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
        d.name AS device_name,
        g.name AS group_name,
        p.name AS playlist_name,
        c.name AS client_name,
        cg.name AS client_group_name,
        COALESCE(s.client_id, d.client_id, g.client_id, p.client_id) AS client_id
       FROM schedules s
       LEFT JOIN devices d ON s.device_id = d.id
       LEFT JOIN device_groups g ON s.group_id = g.id
       LEFT JOIN playlists p ON s.playlist_id = p.id
       LEFT JOIN clients c ON COALESCE(s.client_id, p.client_id) = c.id
       LEFT JOIN client_groups cg ON s.client_group_id = cg.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const agendamento = rows[0];
    const agendamentosEscopo = await carregarAgendamentosBase(req, {
      device_id: agendamento.device_id || undefined,
      group_id: agendamento.group_id || undefined,
      client_id: agendamento.client_id || undefined,
      client_group_id: agendamento.client_group_id || undefined,
    });
    const listaComStatus = aplicarStatusLista(agendamentosEscopo);
    const statusAtual = listaComStatus.find((item) => item.id === agendamento.id) || {};
    const conflitos = detectarConflitosAgenda(agendamento, agendamentosEscopo);

    res.json({
      ...agendamento,
      ...montarCampoEscopo(agendamento),
      status: statusAtual.status || 'aguardando',
      status_reason: statusAtual.status_reason || 'Agendamento carregado',
      conflitos,
      conflito_count: conflitos.length,
      repeat_label: resumirRepeticao(agendamento),
      periodo_label: formatarPeriodo(agendamento),
    });
  } catch (err) {
    console.error('[Schedule getById]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

async function validarEPrepararCorpo(req, modo = 'create') {
  const {
    playlist_id,
    name,
    start_datetime,
    end_datetime,
    days_of_week,
    start_time,
    end_time,
    priority,
    repeat_type,
    repeat_value,
    repeat_days,
    repeat_until,
    repeat_config,
    active,
  } = req.body;

  console.log('--- [Schedule Debug] Corpo recebido no Backend ---');
  console.log('client_id recebido:', req.body.client_id, 'tipo:', typeof req.body.client_id);
  console.log('device_id recebido:', req.body.device_id, 'tipo:', typeof req.body.device_id);
  console.log('group_id recebido:', req.body.group_id, 'tipo:', typeof req.body.group_id);
  console.log('client_group_id recebido:', req.body.client_group_id, 'tipo:', typeof req.body.client_group_id);

  let client_id = req.body.client_id;
  if (typeof client_id === 'string') {
    client_id = client_id.trim();
  }
  if (!client_id || client_id === 'null' || client_id === 'undefined' || client_id === '') {
    client_id = null;
  }

  let device_id = req.body.device_id;
  if (typeof device_id === 'string') {
    device_id = device_id.trim();
  }
  if (!device_id || device_id === 'null' || device_id === 'undefined' || device_id === '') {
    device_id = null;
  }

  let group_id = req.body.group_id;
  if (typeof group_id === 'string') {
    group_id = group_id.trim();
  }
  if (!group_id || group_id === 'null' || group_id === 'undefined' || group_id === '') {
    group_id = null;
  }

  let client_group_id = req.body.client_group_id;
  if (typeof client_group_id === 'string') {
    client_group_id = client_group_id.trim();
  }
  if (!client_group_id || client_group_id === 'null' || client_group_id === 'undefined' || client_group_id === '') {
    client_group_id = null;
  }

  console.log('device_id pós-coerção:', device_id);
  console.log('group_id pós-coerção:', group_id);

  const erroEscopo = validarEscopo(client_id, device_id, group_id, client_group_id);
  if (erroEscopo) {
    console.log('Erro de Escopo detectado:', erroEscopo);
    const err = new Error(erroEscopo);
    err.statusCode = 400;
    throw err;
  }

  if (!playlist_id) {
    const err = new Error('playlist_id é obrigatório');
    err.statusCode = 400;
    throw err;
  }

  const payload = {
    client_id,
    device_id,
    group_id,
    client_group_id,
    playlist_id,
    name: name || null,
    start_datetime: start_datetime || null,
    end_datetime: end_datetime || null,
    days_of_week: normalizarArrayNumerico(days_of_week, [0, 1, 2, 3, 4, 5, 6]),
    start_time: start_time || null,
    end_time: end_time || null,
    priority: normalizarPrioridade(priority),
    repeat_type: normalizarRepeatType(repeat_type),
    repeat_value: Number.isFinite(Number(repeat_value)) ? Number(repeat_value) : null,
    repeat_days: normalizarArrayNumerico(repeat_days, []),
    repeat_until: repeat_until || null,
    repeat_config: normalizarRepeatConfig(repeat_config),
    active: active !== false,
  };

  if (payload.repeat_type === 'custom' && (!payload.repeat_days || payload.repeat_days.length === 0) && payload.repeat_config?.days_of_week?.length) {
    payload.repeat_days = normalizarArrayNumerico(payload.repeat_config.days_of_week, []);
  }

  if (!payload.client_id && !payload.client_group_id) {
    payload.client_id = await resolverClienteDoPayload(payload);
  }

  if ((payload.repeat_type === 'weekly' || payload.repeat_type === 'custom') && (!payload.repeat_days || payload.repeat_days.length === 0)) {
    payload.repeat_days = payload.days_of_week;
  }

  // Obter as relações de cliente e grupo da playlist selecionada para validar consistência
  const { rows: playlistRows } = await pool.query(
    'SELECT client_id, group_id FROM playlists WHERE id = $1',
    [payload.playlist_id]
  );
  const playlistClientId = playlistRows[0]?.client_id || null;
  const playlistGroupId = playlistRows[0]?.group_id || null;

  if (playlistClientId && payload.client_id && String(payload.client_id) !== String(playlistClientId)) {
    const err = new Error('O cliente selecionado não corresponde ao cliente do plano.');
    err.statusCode = 400;
    throw err;
  }

  if (playlistGroupId) {
    if (payload.client_group_id && String(payload.client_group_id) !== String(playlistGroupId)) {
      const err = new Error('O grupo de clientes do agendamento não corresponde ao grupo do plano.');
      err.statusCode = 400;
      throw err;
    }
    if (payload.client_id) {
      const { rows: clientRows } = await pool.query('SELECT group_id FROM clients WHERE id = $1', [payload.client_id]);
      const clientGroupId = clientRows[0]?.group_id || null;
      if (String(clientGroupId) !== String(playlistGroupId)) {
        const err = new Error('O cliente selecionado não pertence ao grupo do plano de exibição.');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  if (modo === 'update' && !req.params.id) {
    const err = new Error('ID do agendamento não informado');
    err.statusCode = 400;
    throw err;
  }

  return payload;
}

async function buscarConflitosDoPayload(req, payload, idIgnorar = null) {
  const clientId = req.user.role === 'admin'
    ? await resolverClienteDoPayload(payload)
    : req.user.client_id;

  const agendamentos = await carregarAgendamentosBase(req, {
    device_id: payload.device_id || undefined,
    group_id: payload.group_id || undefined,
    client_id: clientId || undefined,
    client_group_id: payload.client_group_id || undefined,
  });

  return agendamentos.filter((item) => item.id !== idIgnorar);
}

// POST /api/schedules
async function create(req, res) {
  try {
    const payload = await validarEPrepararCorpo(req, 'create');
    const conflitos = await buscarConflitosDoPayload(req, payload);

    const { rows } = await pool.query(
      `INSERT INTO schedules (
        client_id, device_id, group_id, client_group_id, playlist_id, name, start_datetime, end_datetime,
        days_of_week, start_time, end_time, priority, repeat_type, repeat_value,
        repeat_days, repeat_until, repeat_config, active, last_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18, $19)
      RETURNING *`,
      [
        payload.client_id,
        payload.device_id,
        payload.group_id,
        payload.client_group_id,
        payload.playlist_id,
        payload.name,
        payload.start_datetime,
        payload.end_datetime,
        payload.days_of_week,
        payload.start_time,
        payload.end_time,
        payload.priority,
        payload.repeat_type,
        payload.repeat_value,
        payload.repeat_days.length ? payload.repeat_days : null,
        payload.repeat_until,
        JSON.stringify(payload.repeat_config || {}),
        payload.active,
        'aguardando',
      ]
    );

    const agendamento = rows[0];
    const conflitosFiltrados = detectarConflitosAgenda(agendamento, conflitos);
    const statusBase = verificarAgendamentoAtivo(agendamento);

    await registrarHistorico(agendamento.id, {
      client_id: agendamento.client_id,
      device_id: agendamento.device_id,
      group_id: agendamento.group_id,
      playlist_id: agendamento.playlist_id,
      priority: agendamento.priority,
      status: statusBase.status,
      event: 'created',
      message: conflitosFiltrados.length ? 'Agendamento criado com conflitos de horário' : 'Agendamento criado',
    });

    await notificarAtualizacaoAgendamento(req, agendamento.client_id, agendamento.client_group_id);

    res.status(201).json({
      ...agendamento,
      ...montarCampoEscopo(agendamento),
      status: statusBase.status,
      status_reason: statusBase.motivo,
      conflitos: conflitosFiltrados,
      conflito_count: conflitosFiltrados.length,
      repeat_label: resumirRepeticao(agendamento),
      periodo_label: formatarPeriodo(agendamento),
    });
  } catch (err) {
    console.error('[Schedule create]', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Erro interno' });
  }
}

// PUT /api/schedules/:id
async function update(req, res) {
  try {
    const payload = await validarEPrepararCorpo(req, 'update');
    const conflitos = await buscarConflitosDoPayload(req, payload, req.params.id);

    const { rows } = await pool.query(
      `UPDATE schedules SET
        client_id=$1, device_id=$2, group_id=$3, client_group_id=$4, playlist_id=$5, name=$6, start_datetime=$7, end_datetime=$8,
        days_of_week=$9, start_time=$10, end_time=$11, priority=$12, repeat_type=$13, repeat_value=$14,
        repeat_days=$15, repeat_until=$16, repeat_config=$17::jsonb, active=$18,
        last_status=$19, updated_at=NOW()
       WHERE id=$20 RETURNING *`,
      [
        payload.client_id,
        payload.device_id,
        payload.group_id,
        payload.client_group_id,
        payload.playlist_id,
        payload.name,
        payload.start_datetime,
        payload.end_datetime,
        payload.days_of_week,
        payload.start_time,
        payload.end_time,
        payload.priority,
        payload.repeat_type,
        payload.repeat_value,
        payload.repeat_days.length ? payload.repeat_days : null,
        payload.repeat_until,
        JSON.stringify(payload.repeat_config || {}),
        payload.active,
        verificarAgendamentoAtivo(payload).status,
        req.params.id,
      ]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    const agendamento = rows[0];
    const conflitosFiltrados = detectarConflitosAgenda(agendamento, conflitos);
    const statusBase = verificarAgendamentoAtivo(agendamento);

    await registrarHistorico(agendamento.id, {
      client_id: agendamento.client_id,
      device_id: agendamento.device_id,
      group_id: agendamento.group_id,
      playlist_id: agendamento.playlist_id,
      priority: agendamento.priority,
      status: statusBase.status,
      event: 'updated',
      message: conflitosFiltrados.length ? 'Agendamento atualizado com conflitos de horário' : 'Agendamento atualizado',
    });

    await notificarAtualizacaoAgendamento(req, agendamento.client_id, agendamento.client_group_id);

    res.json({
      ...agendamento,
      ...montarCampoEscopo(agendamento),
      status: statusBase.status,
      status_reason: statusBase.motivo,
      conflitos: conflitosFiltrados,
      conflito_count: conflitosFiltrados.length,
      repeat_label: resumirRepeticao(agendamento),
      periodo_label: formatarPeriodo(agendamento),
    });
  } catch (err) {
    console.error('[Schedule update]', err.message);
    res.status(err.statusCode || 500).json({ error: err.message || 'Erro interno' });
  }
}

async function history(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { schedule_id, device_id, limit = 100 } = req.query;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (schedule_id) {
      conditions.push(`h.schedule_id = $${idx++}`);
      params.push(schedule_id);
    }

    if (device_id) {
      conditions.push(`h.device_id = $${idx++}`);
      params.push(device_id);
    }

    if (!isAdmin) {
      conditions.push(`COALESCE(s.client_id, d.client_id, g.client_id, p.client_id) = $${idx++}`);
      params.push(req.user.client_id);
    }

    params.push(parseInt(limit, 10) || 100);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT h.*, s.name AS schedule_name, d.name AS device_name, g.name AS group_name, p.name AS playlist_name
       FROM schedule_execution_logs h
       LEFT JOIN schedules s ON h.schedule_id = s.id
       LEFT JOIN devices d ON h.device_id = d.id
       LEFT JOIN device_groups g ON h.group_id = g.id
       LEFT JOIN playlists p ON h.playlist_id = p.id
       ${where}
       ORDER BY h.created_at DESC
       LIMIT $${idx}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('[Schedule history]', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// DELETE /api/schedules/:id
async function remove(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT s.client_id, s.client_group_id
       FROM schedules s
       WHERE s.id = $1`,
      [req.params.id]
    );
    const clientId = rows[0]?.client_id || null;
    const clientGroupId = rows[0]?.client_group_id || null;
    const { rowCount } = await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    await notificarAtualizacaoAgendamento(req, clientId, clientGroupId);
    res.json({ message: 'Agendamento removido!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, getById, create, update, remove, history };
