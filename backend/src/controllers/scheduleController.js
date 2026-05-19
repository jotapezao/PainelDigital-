const { pool } = require('../database/db');
const {
  normalizarPrioridade,
  normalizarRepeatType,
  verificarAgendamentoAtivo,
  detectarConflitosAgenda,
  resumirRepeticao,
  formatarPeriodo,
  gerarChaveEscopo,
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

function validarEscopo(device_id, group_id) {
  if (device_id && group_id) {
    return 'Selecione apenas uma opção: TV ou Grupo.';
  }
  if (!device_id && !group_id) {
    return 'Informe uma TV ou um Grupo para o agendamento.';
  }
  return null;
}

function montarCampoEscopo(agendamento) {
  return {
    tipo_escopo: agendamento.device_id ? 'device' : (agendamento.group_id ? 'group' : 'global'),
    chave_escopo: gerarChaveEscopo(agendamento),
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

  if (!isAdmin) {
    conditions.push(`COALESCE(d.client_id, g.client_id, p.client_id) = $${idx++}`);
    params.push(req.user.client_id);
  } else if (filtros.client_id) {
    conditions.push(`COALESCE(d.client_id, g.client_id, p.client_id) = $${idx++}`);
    params.push(filtros.client_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT s.*,
      d.name AS device_name,
      g.name AS group_name,
      p.name AS playlist_name,
      COALESCE(d.client_id, g.client_id, p.client_id) AS client_id
     FROM schedules s
     LEFT JOIN devices d ON s.device_id = d.id
     LEFT JOIN device_groups g ON s.group_id = g.id
     LEFT JOIN playlists p ON s.playlist_id = p.id
     ${where}
     ORDER BY s.created_at DESC`,
    params
  );

  return rows;
}

async function resolverClienteDoPayload(payload) {
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

async function notificarAtualizacaoAgendamento(req, clientId) {
  try {
    const io = req.app.get('io');
    if (!io || !clientId) return;
    io.to(`client:${clientId}`).emit('playlist:updated', {
      reason: 'schedule_changed',
      updated_at: new Date().toISOString(),
    });
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
        COALESCE(d.client_id, g.client_id, p.client_id) AS client_id
       FROM schedules s
       LEFT JOIN devices d ON s.device_id = d.id
       LEFT JOIN device_groups g ON s.group_id = g.id
       LEFT JOIN playlists p ON s.playlist_id = p.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const agendamento = rows[0];
    const agendamentosEscopo = await carregarAgendamentosBase(req, {
      device_id: agendamento.device_id || undefined,
      group_id: agendamento.group_id || undefined,
      client_id: req.user.role === 'admin' ? agendamento.client_id : undefined,
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
  console.log('device_id recebido:', req.body.device_id, 'tipo:', typeof req.body.device_id);
  console.log('group_id recebido:', req.body.group_id, 'tipo:', typeof req.body.group_id);

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

  console.log('device_id pós-coerção:', device_id);
  console.log('group_id pós-coerção:', group_id);

  const erroEscopo = validarEscopo(device_id, group_id);
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
    device_id,
    group_id,
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

  if ((payload.repeat_type === 'weekly' || payload.repeat_type === 'custom') && (!payload.repeat_days || payload.repeat_days.length === 0)) {
    payload.repeat_days = payload.days_of_week;
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
        device_id, group_id, playlist_id, name, start_datetime, end_datetime,
        days_of_week, start_time, end_time, priority, repeat_type, repeat_value,
        repeat_days, repeat_until, repeat_config, active, last_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17)
      RETURNING *`,
      [
        payload.device_id,
        payload.group_id,
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
      device_id: agendamento.device_id,
      group_id: agendamento.group_id,
      playlist_id: agendamento.playlist_id,
      priority: agendamento.priority,
      status: statusBase.status,
      event: 'created',
      message: conflitosFiltrados.length ? 'Agendamento criado com conflitos de horário' : 'Agendamento criado',
    });

    await notificarAtualizacaoAgendamento(req, await resolverClienteDoPayload(agendamento));

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
        device_id=$1, group_id=$2, playlist_id=$3, name=$4, start_datetime=$5, end_datetime=$6,
        days_of_week=$7, start_time=$8, end_time=$9, priority=$10, repeat_type=$11, repeat_value=$12,
        repeat_days=$13, repeat_until=$14, repeat_config=$15::jsonb, active=$16,
        last_status=$17, updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [
        payload.device_id,
        payload.group_id,
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
      device_id: agendamento.device_id,
      group_id: agendamento.group_id,
      playlist_id: agendamento.playlist_id,
      priority: agendamento.priority,
      status: statusBase.status,
      event: 'updated',
      message: conflitosFiltrados.length ? 'Agendamento atualizado com conflitos de horário' : 'Agendamento atualizado',
    });

    await notificarAtualizacaoAgendamento(req, await resolverClienteDoPayload(agendamento));

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
      conditions.push(`COALESCE(d.client_id, g.client_id, p.client_id) = $${idx++}`);
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
      `SELECT COALESCE(d.client_id, g.client_id, p.client_id) AS client_id
       FROM schedules s
       LEFT JOIN devices d ON s.device_id = d.id
       LEFT JOIN device_groups g ON s.group_id = g.id
       LEFT JOIN playlists p ON s.playlist_id = p.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    const clientId = rows[0]?.client_id || null;
    const { rowCount } = await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    await notificarAtualizacaoAgendamento(req, clientId);
    res.json({ message: 'Agendamento removido!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { list, getById, create, update, remove, history };
