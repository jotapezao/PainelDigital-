import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_MAP = {
  ativo: { label: 'Ativo', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  aguardando: { label: 'Aguardando', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  pausado: { label: 'Pausado', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  finalizado: { label: 'Finalizado', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  inativo: { label: 'Inativo', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

const PRIORIDADE_MAP = {
  baixa: { label: 'Baixa', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  normal: { label: 'Normal', color: '#818cf8', bg: 'rgba(129,140,248,0.14)' },
  alta: { label: 'Alta', color: '#fb7185', bg: 'rgba(251,113,133,0.14)' },
};

const Schedules = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, schedule: null });
  const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all' });
  const { addToast } = useToast();

  const carregar = async () => {
    setLoading(true);
    try {
      const [scheduleRes, historyRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/schedules/history?limit=8').catch(() => ({ data: [] })),
      ]);
      setSchedules(scheduleRes.data || []);
      setHistory(historyRes.data || []);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const toggleActive = async (schedule) => {
    try {
      await api.put(`/schedules/${schedule.id}`, { ...schedule, active: !schedule.active });
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, active: !s.active } : s));
    } catch {
      addToast('error', 'Erro', 'Não foi possível alterar o status.');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/schedules/${deleteModal.schedule.id}`);
      addToast('success', 'Sucesso', 'Agendamento removido!');
      setSchedules(prev => prev.filter(s => s.id !== deleteModal.schedule.id));
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover o agendamento.');
    } finally {
      setDeleteModal({ open: false, schedule: null });
    }
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const busca = `${schedule.name || ''} ${schedule.device_name || ''} ${schedule.group_name || ''} ${schedule.playlist_name || ''}`.toLowerCase();
      const prioridade = (schedule.priority || 'normal').toLowerCase();
      const status = (schedule.status || 'aguardando').toLowerCase();

      if (filters.search && !busca.includes(filters.search.toLowerCase())) return false;
      if (filters.priority !== 'all' && prioridade !== filters.priority) return false;
      if (filters.status !== 'all' && status !== filters.status) return false;
      return true;
    });
  }, [schedules, filters]);

  const resumo = useMemo(() => {
    const total = schedules.length;
    const ativos = schedules.filter((item) => item.status === 'ativo').length;
    const pausados = schedules.filter((item) => item.status === 'pausado').length;
    const conflitos = schedules.reduce((acc, item) => acc + (item.conflito_count || 0), 0);
    return { total, ativos, pausados, conflitos };
  }, [schedules]);

  const schedulesPorDia = useMemo(() => {
    const mapa = DIAS.map(() => []);
    filteredSchedules.forEach((schedule) => {
      const dias = Array.isArray(schedule.days_of_week) && schedule.days_of_week.length ? schedule.days_of_week : [0, 1, 2, 3, 4, 5, 6];
      dias.forEach((dia) => {
        if (mapa[dia]) mapa[dia].push(schedule);
      });
    });
    mapa.forEach((lista) => lista.sort((a, b) => String(a.start_time || '00:00').localeCompare(String(b.start_time || '00:00'))));
    return mapa;
  }, [filteredSchedules]);

  const timelineOrdenada = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      const tempoA = String(a.start_time || a.start_datetime || '00:00');
      const tempoB = String(b.start_time || b.start_datetime || '00:00');
      return tempoA.localeCompare(tempoB);
    });
  }, [filteredSchedules]);

  const getPriorityStyle = (priority) => PRIORIDADE_MAP[(priority || 'normal').toLowerCase()] || PRIORIDADE_MAP.normal;
  const getStatusStyle = (status) => STATUS_MAP[(status || 'aguardando').toLowerCase()] || STATUS_MAP.aguardando;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Agendamentos</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '720px' }}>
            Gerencie a programação com visão de calendário, prioridade e conflitos em tempo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={carregar}>Atualizar</button>
          <button className="btn btn-primary" onClick={() => navigate('/schedules/new')}>+ Novo Agendamento</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total', value: resumo.total, color: '#818cf8' },
          { label: 'Ativos', value: resumo.ativos, color: '#22c55e' },
          { label: 'Pausados', value: resumo.pausados, color: '#fb7185' },
          { label: 'Conflitos', value: resumo.conflitos, color: '#f59e0b' },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `3px solid ${item.color}` }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.label}</span>
            <strong style={{ fontSize: '2rem', fontWeight: '800' }}>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          placeholder="Buscar por nome, TV, grupo ou plano"
          style={{ flex: '1 1 280px' }}
        />
        <select value={filters.priority} onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))} style={{ width: '180px' }}>
          <option value="all">Todas as prioridades</option>
          <option value="baixa">Baixa</option>
          <option value="normal">Normal</option>
          <option value="alta">Alta</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} style={{ width: '180px' }}>
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="aguardando">Aguardando</option>
          <option value="pausado">Pausado</option>
          <option value="finalizado">Finalizado</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando agendamentos...</div>
      ) : filteredSchedules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhum agendamento encontrado</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Crie uma nova programação para começar a organizar a exibição.</p>
          <button className="btn btn-outline" onClick={() => navigate('/schedules/new')}>Criar Primeiro Agendamento</button>
        </div>
      ) : (
        <>
          {schedules.some((item) => (item.conflito_count || 0) > 0) && (
            <div className="card" style={{ padding: '18px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>Há conflitos de horário na programação</strong>
              <p style={{ color: 'var(--text-muted)' }}>Os itens com prioridade superior ganham execução automática e os demais ficam pausados.</p>
            </div>
          )}

          <div className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Calendário semanal</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Visualização organizada por dia para entender a distribuição da programação.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {DIAS.map((dia, idx) => (
                <div key={dia} style={{ minHeight: '220px', borderRadius: '18px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong>{dia}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{schedulesPorDia[idx].length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {schedulesPorDia[idx].slice(0, 4).map((schedule) => {
                      const status = getStatusStyle(schedule.status);
                      const priority = getPriorityStyle(schedule.priority);
                      return (
                        <button
                          key={`${schedule.id}-${dia}`}
                          onClick={() => navigate(`/schedules/${schedule.id}`)}
                          style={{
                            textAlign: 'left',
                            padding: '12px',
                            borderRadius: '14px',
                            border: `1px solid ${priority.color}33`,
                            background: `linear-gradient(135deg, ${priority.bg}, rgba(255,255,255,0.02))`,
                            color: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.9rem' }}>{schedule.name}</strong>
                            <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.72rem', background: status.bg, color: status.color }}>{status.label}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{schedule.periodo_label || `${schedule.start_time || '--:--'} - ${schedule.end_time || '--:--'}`}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.74rem', color: priority.color, fontWeight: '700' }}>{priority.label}</span>
                            {schedule.conflito_count > 0 && <span className="badge badge-warning">{schedule.conflito_count} conflito(s)</span>}
                          </div>
                        </button>
                      );
                    })}
                    {schedulesPorDia[idx].length > 4 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>+ {schedulesPorDia[idx].length - 4} itens</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Timeline de programação</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ordem de execução com prioridade e status atual.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {timelineOrdenada.map((schedule) => {
                  const status = getStatusStyle(schedule.status);
                  const priority = getPriorityStyle(schedule.priority);
                  return (
                    <div key={schedule.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr auto',
                      gap: '14px',
                      padding: '14px',
                      borderRadius: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                      alignItems: 'center',
                    }}>
                      <div style={{ fontWeight: '800', color: 'var(--primary)' }}>{schedule.periodo_label || `${schedule.start_time || '--:--'} - ${schedule.end_time || '--:--'}`}</div>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>{schedule.name}</strong>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {schedule.scope?.label || schedule.device_name || schedule.group_name || 'Escopo geral'} • {schedule.playlist_name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ padding: '6px 10px', borderRadius: '999px', background: priority.bg, color: priority.color, fontSize: '0.75rem', fontWeight: '800' }}>{priority.label}</span>
                        <span style={{ padding: '6px 10px', borderRadius: '999px', background: status.bg, color: status.color, fontSize: '0.75rem', fontWeight: '800' }}>{status.label}</span>
                        <button className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={() => navigate(`/schedules/${schedule.id}`)}>Editar</button>
                        <button className="btn" style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => setDeleteModal({ open: true, schedule })}>Remover</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '16px' }}>Legenda</h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {Object.entries(PRIORIDADE_MAP).map(([key, item]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', background: item.bg }}>
                      <span>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: '700' }}>{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Histórico recente</h3>
                  <button className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={carregar}>Atualizar</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {history.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Ainda não há execuções registradas.</p>
                  ) : history.map((item) => (
                    <div key={item.id} style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{item.schedule_name || 'Agendamento'}</strong>
                        <span className="badge badge-primary">{item.event}</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.message || item.status}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Agendamento?"
        message={`Tem certeza que deseja remover "${deleteModal.schedule?.name}"?`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, schedule: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Schedules;
