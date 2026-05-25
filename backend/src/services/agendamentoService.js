const PRIORIDADES = {
  baixa: 1,
  normal: 2,
  alta: 3,
};

const STATUS = {
  aguardando: 'aguardando',
  ativo: 'ativo',
  pausado: 'pausado',
  finalizado: 'finalizado',
  inativo: 'inativo',
};

function normalizarPrioridade(valor) {
  const chave = `${valor || 'normal'}`.toLowerCase();
  if (chave === 'low') return 'baixa';
  if (chave === 'high') return 'alta';
  if (chave === 'medium') return 'normal';
  return PRIORIDADES[chave] ? chave : 'normal';
}

function pesoPrioridade(valor) {
  return PRIORIDADES[normalizarPrioridade(valor)] || PRIORIDADES.normal;
}

function normalizarDias(valor) {
  if (!Array.isArray(valor) || valor.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  return valor
    .map((item) => parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    .sort((a, b) => a - b);
}

function normalizarRepeatType(valor) {
  const chave = `${valor || 'none'}`.toLowerCase();
  const mapa = {
    none: 'none',
    minutos: 'interval_minutes',
    minute: 'interval_minutes',
    minutes: 'interval_minutes',
    interval_minutes: 'interval_minutes',
    horas: 'interval_hours',
    hour: 'interval_hours',
    hours: 'interval_hours',
    interval_hours: 'interval_hours',
    daily: 'daily',
    diario: 'daily',
    diária: 'daily',
    diaria: 'daily',
    weekly: 'weekly',
    semanal: 'weekly',
    custom: 'custom',
    personalizado: 'custom',
  };

  return mapa[chave] || 'none';
}

function parseHorarioParaMinutos(valor) {
  if (!valor) return null;
  const texto = `${valor}`.trim();
  if (!texto) return null;
  const [hora, minuto = '0'] = texto.split(':');
  const h = parseInt(hora, 10);
  const m = parseInt(minuto, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h * 60) + m;
}

function gerarChaveEscopo(agendamento) {
  if (agendamento.device_id) return `device:${agendamento.device_id}`;
  if (agendamento.group_id) return `group:${agendamento.group_id}`;
  if (agendamento.client_id) return `client:${agendamento.client_id}`;
  return 'global';
}

function obterNomeEscopo(agendamento) {
  if (agendamento.device_name) return agendamento.device_name;
  if (agendamento.group_name) return agendamento.group_name;
  if (agendamento.client_name) return agendamento.client_name;
  return agendamento.device_id ? 'Dispositivo' : (agendamento.group_id ? 'Grupo' : (agendamento.client_id ? 'Cliente' : 'Todos'));
}

function obterTipoEscopo(agendamento) {
  if (agendamento.device_id) return 'device';
  if (agendamento.group_id) return 'group';
  if (agendamento.client_id) return 'client';
  return 'global';
}

function obterDuracaoPadraoMinutos(agendamento) {
  const config = agendamento.repeat_config || {};
  if (Number.isFinite(Number(config.duration_minutes)) && Number(config.duration_minutes) > 0) {
    return Number(config.duration_minutes);
  }

  const inicio = parseHorarioParaMinutos(agendamento.start_time);
  const fim = parseHorarioParaMinutos(agendamento.end_time);
  if (inicio !== null && fim !== null) {
    const diferenca = fim - inicio;
    if (diferenca > 0) return diferenca;
    return 24 * 60 - inicio + fim;
  }

  return 60;
}

function obterDiasAtivos(agendamento) {
  const repeatType = normalizarRepeatType(agendamento.repeat_type);
  if (repeatType === 'custom' && Array.isArray(agendamento.repeat_days) && agendamento.repeat_days.length > 0) {
    return normalizarDias(agendamento.repeat_days);
  }
  if (Array.isArray(agendamento.days_of_week) && agendamento.days_of_week.length > 0) {
    return normalizarDias(agendamento.days_of_week);
  }
  if (Array.isArray(agendamento.repeat_days) && agendamento.repeat_days.length > 0) {
    return normalizarDias(agendamento.repeat_days);
  }
  return [0, 1, 2, 3, 4, 5, 6];
}

function montarInicioPadrao(agendamento, agora) {
  if (agendamento.start_datetime) {
    return new Date(agendamento.start_datetime);
  }

  const inicio = parseHorarioParaMinutos(agendamento.start_time);
  if (inicio === null) return agora;

  const base = new Date(agora);
  base.setSeconds(0, 0);
  base.setHours(Math.floor(inicio / 60), inicio % 60, 0, 0);
  return base;
}

function temIntersecaoDias(diasA, diasB) {
  const conjuntoB = new Set(diasB);
  return diasA.some((dia) => conjuntoB.has(dia));
}

function horarioOverlap(inicioA, fimA, inicioB, fimB) {
  if (inicioA === null || fimA === null || inicioB === null || fimB === null) return true;
  return inicioA < fimB && inicioB < fimA;
}

function compararEspecificidade(a, b) {
  const pesoA = a.device_id ? 3 : (a.group_id ? 2 : (a.client_id ? 1 : 0));
  const pesoB = b.device_id ? 3 : (b.group_id ? 2 : (b.client_id ? 1 : 0));
  if (pesoA !== pesoB) return pesoB - pesoA;

  const prioridade = pesoPrioridade(b.priority) - pesoPrioridade(a.priority);
  if (prioridade !== 0) return prioridade;

  const atualizadoA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
  const atualizadoB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
  if (atualizadoA !== atualizadoB) return atualizadoB - atualizadoA;

  const criadoA = a.created_at ? new Date(a.created_at).getTime() : 0;
  const criadoB = b.created_at ? new Date(b.created_at).getTime() : 0;
  return criadoB - criadoA;
}

function duracaoIntervaloMinutos(agendamento) {
  const repeatType = normalizarRepeatType(agendamento.repeat_type);
  if (repeatType === 'interval_minutes') {
    const valor = Math.max(1, Number(agendamento.repeat_value) || 1);
    return valor;
  }
  if (repeatType === 'interval_hours') {
    const valor = Math.max(1, Number(agendamento.repeat_value) || 1);
    return valor * 60;
  }
  return obterDuracaoPadraoMinutos(agendamento);
}

function possuiJanelaDatada(agendamento) {
  return Boolean(agendamento.start_datetime || agendamento.end_datetime || agendamento.repeat_until);
}

function verificarAgendamentoAtivo(agendamento, agora = new Date()) {
  if (!agendamento || agendamento.active === false) {
    return { ativo: false, status: STATUS.inativo, motivo: 'Agendamento desativado' };
  }

  const repeatType = normalizarRepeatType(agendamento.repeat_type);
  const diasAtivos = obterDiasAtivos(agendamento);
  const diaAtual = agora.getDay();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();
  const inicioHora = parseHorarioParaMinutos(agendamento.start_time);
  const fimHora = parseHorarioParaMinutos(agendamento.end_time);

  if (agendamento.repeat_until && new Date(agendamento.repeat_until) < agora) {
    return { ativo: false, status: STATUS.finalizado, motivo: 'Repetição encerrada' };
  }

  if (repeatType === 'interval_minutes' || repeatType === 'interval_hours') {
    const inicioBase = montarInicioPadrao(agendamento, agora);
    if (agora < inicioBase) {
      return { ativo: false, status: STATUS.aguardando, motivo: 'Aguardando início da recorrência' };
    }

    const intervaloMinutos = Math.max(1, duracaoIntervaloMinutos(agendamento));
    const duracaoMinutos = obterDuracaoPadraoMinutos(agendamento);
    const diffMinutos = Math.floor((agora.getTime() - inicioBase.getTime()) / 60000);
    const modulo = diffMinutos % intervaloMinutos;
    const ativo = modulo >= 0 && modulo < duracaoMinutos;

    return {
      ativo,
      status: ativo ? STATUS.ativo : STATUS.aguardando,
      motivo: ativo ? 'Dentro da janela da recorrência' : 'Fora da janela atual',
    };
  }

  if (agendamento.start_datetime && agora < new Date(agendamento.start_datetime)) {
    return { ativo: false, status: STATUS.aguardando, motivo: 'Aguardando data inicial' };
  }

  if (agendamento.end_datetime && agora > new Date(agendamento.end_datetime)) {
    return { ativo: false, status: STATUS.finalizado, motivo: 'Data final alcançada' };
  }

  if (!diasAtivos.includes(diaAtual)) {
    return { ativo: false, status: STATUS.aguardando, motivo: 'Dia fora da programação' };
  }

  if (inicioHora !== null && fimHora !== null) {
    const ativo = fimHora >= inicioHora
      ? (horaAtual >= inicioHora && horaAtual <= fimHora)
      : (horaAtual >= inicioHora || horaAtual <= fimHora);

    return {
      ativo,
      status: ativo ? STATUS.ativo : STATUS.aguardando,
      motivo: ativo ? 'Dentro do horário programado' : 'Fora do horário atual',
    };
  }

  if (possuiJanelaDatada(agendamento)) {
    return {
      ativo: true,
      status: STATUS.ativo,
      motivo: 'Agendamento datado ativo',
    };
  }

  return {
    ativo: true,
    status: STATUS.ativo,
    motivo: 'Agendamento ativo',
  };
}

function agendamentosConflitam(a, b) {
  if (!a || !b || a.id === b.id) return false;
  if (a.device_id && b.device_id && a.device_id !== b.device_id) return false;
  if (a.group_id && b.group_id && a.group_id !== b.group_id) return false;
  if (a.client_id && b.client_id && a.client_id !== b.client_id) return false;
  if (!a.device_id && !a.group_id && !a.client_id && !b.device_id && !b.group_id && !b.client_id) return false;

  const diasA = obterDiasAtivos(a);
  const diasB = obterDiasAtivos(b);
  if (!temIntersecaoDias(diasA, diasB)) return false;

  const tipoA = normalizarRepeatType(a.repeat_type);
  const tipoB = normalizarRepeatType(b.repeat_type);
  const usaTempoA = Boolean(a.start_time || a.end_time || tipoA.startsWith('interval'));
  const usaTempoB = Boolean(b.start_time || b.end_time || tipoB.startsWith('interval'));

  if (usaTempoA && usaTempoB) {
    const inicioA = parseHorarioParaMinutos(a.start_time);
    const fimA = parseHorarioParaMinutos(a.end_time);
    const inicioB = parseHorarioParaMinutos(b.start_time);
    const fimB = parseHorarioParaMinutos(b.end_time);
    if (!horarioOverlap(inicioA, fimA, inicioB, fimB)) return false;
  }

  if (a.start_datetime && b.end_datetime && new Date(a.start_datetime) > new Date(b.end_datetime)) return false;
  if (b.start_datetime && a.end_datetime && new Date(b.start_datetime) > new Date(a.end_datetime)) return false;
  if (a.end_datetime && b.start_datetime && new Date(a.end_datetime) < new Date(b.start_datetime)) return false;
  if (b.end_datetime && a.start_datetime && new Date(b.end_datetime) < new Date(a.start_datetime)) return false;

  return true;
}

function detectarConflitosAgenda(agendamento, listaAgendamentos = []) {
  return listaAgendamentos
    .filter((outro) => agendamentosConflitam(agendamento, outro))
    .map((outro) => ({
      id: outro.id,
      nome: outro.name,
      prioridade: normalizarPrioridade(outro.priority),
      escopo: obterNomeEscopo(outro),
      peso_prioridade: pesoPrioridade(outro.priority),
    }));
}

function resolverAgendamentoVigente(listaAgendamentos = [], agora = new Date()) {
  const ativos = listaAgendamentos
    .filter((agendamento) => verificarAgendamentoAtivo(agendamento, agora).ativo)
    .sort(compararEspecificidade);

  return ativos[0] || null;
}

function resumirRepeticao(agendamento = {}) {
  const repeatType = normalizarRepeatType(agendamento.repeat_type);
  if (repeatType === 'interval_minutes') {
    return `Repetir a cada ${agendamento.repeat_value || 1} min`;
  }
  if (repeatType === 'interval_hours') {
    return `Repetir a cada ${agendamento.repeat_value || 1} h`;
  }
  if (repeatType === 'daily') return 'Repetição diária';
  if (repeatType === 'weekly') return 'Repetição semanal';
  if (repeatType === 'custom') return 'Repetição personalizada';
  return 'Sem repetição';
}

function formatarPeriodo(agendamento = {}) {
  if (agendamento.start_datetime && agendamento.end_datetime) {
    return `${new Date(agendamento.start_datetime).toLocaleDateString('pt-BR')} - ${new Date(agendamento.end_datetime).toLocaleDateString('pt-BR')}`;
  }

  if (agendamento.start_time || agendamento.end_time) {
    return `${agendamento.start_time || '--:--'} - ${agendamento.end_time || '--:--'}`;
  }

  return 'Sem período definido';
}

module.exports = {
  STATUS,
  normalizarPrioridade,
  pesoPrioridade,
  normalizarRepeatType,
  obterTipoEscopo,
  obterNomeEscopo,
  gerarChaveEscopo,
  verificarAgendamentoAtivo,
  detectarConflitosAgenda,
  resolverAgendamentoVigente,
  resumirRepeticao,
  formatarPeriodo,
  compararEspecificidade,
  obterDiasAtivos,
};
