import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  { value: 'normal', label: 'Normal', color: '#818cf8', bg: 'rgba(129,140,248,0.14)' },
  { value: 'alta', label: 'Alta', color: '#fb7185', bg: 'rgba(251,113,133,0.14)' },
];

const REPETICOES = [
  { value: 'none', label: 'Sem repetição' },
  { value: 'interval_minutes', label: 'A cada X minutos' },
  { value: 'interval_hours', label: 'A cada X horas' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'custom', label: 'Personalizada' },
];

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ScheduleEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    device_id: '',
    group_id: '',
    playlist_id: '',
    start_datetime: '',
    end_datetime: '',
    start_time: '',
    end_time: '',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    priority: 'normal',
    repeat_type: 'none',
    repeat_value: 1,
    repeat_days: [0, 1, 2, 3, 4, 5, 6],
    repeat_until: '',
    repeat_config: { duration_minutes: 60 },
    active: true,
    conflitos: [],
    status: 'aguardando',
    status_reason: '',
  });

  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const prioridadeSelecionada = useMemo(
    () => PRIORIDADES.find((item) => item.value === form.priority) || PRIORIDADES[1],
    [form.priority]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, groupsRes, playlistsRes] = await Promise.all([
          api.get('/clients'),
          api.get('/device-groups'),
          api.get('/playlists')
        ]);
        setClients(clientsRes.data || []);
        setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data?.groups || []));
        setPlaylists(playlistsRes.data);

        if (id && id !== 'new') {
          const res = await api.get(`/schedules/${id}`);
          const data = res.data;
          setForm(prev => ({
            ...prev,
            ...data,
            start_datetime: data.start_datetime ? String(data.start_datetime).slice(0, 16) : '',
            end_datetime: data.end_datetime ? String(data.end_datetime).slice(0, 16) : '',
            repeat_until: data.repeat_until ? String(data.repeat_until).slice(0, 16) : '',
            repeat_value: data.repeat_value || 1,
            repeat_config: data.repeat_config || { duration_minutes: 60 },
            days_of_week: Array.isArray(data.days_of_week) && data.days_of_week.length ? data.days_of_week : [0, 1, 2, 3, 4, 5, 6],
            repeat_days: Array.isArray(data.repeat_days) && data.repeat_days.length ? data.repeat_days : (Array.isArray(data.days_of_week) ? data.days_of_week : [0, 1, 2, 3, 4, 5, 6]),
            conflitos: data.conflitos || [],
            status: data.status || 'aguardando',
            status_reason: data.status_reason || '',
          }));
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do agendamento.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, addToast]);

  const toggleDay = (idx) => {
    setForm(prev => {
      const dias = prev.days_of_week.includes(idx)
        ? prev.days_of_week.filter(d => d !== idx)
        : [...prev.days_of_week, idx].sort((a, b) => a - b);
      return {
        ...prev,
        days_of_week: dias,
        repeat_days: dias,
      };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || (!form.client_id && !form.group_id) || !form.playlist_id) {
      addToast('warning', 'Atenção', 'Preencha o nome, o cliente ou grupo e o plano.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        device_id: null,
        group_id: form.group_id || null,
        repeat_config: {
          ...(form.repeat_config || {}),
          duration_minutes: Number(form.repeat_config?.duration_minutes || 60),
        },
      };

      if (id && id !== 'new') {
        const res = await api.put(`/schedules/${id}`, payload);
        setForm(prev => ({
          ...prev,
          ...res.data,
          conflitos: res.data.conflitos || [],
          status: res.data.status || 'aguardando',
          status_reason: res.data.status_reason || '',
        }));
        if ((res.data.conflito_count || 0) > 0) {
          addToast('warning', 'Conflito detectado', 'Este agendamento possui sobreposição com outros horários.');
        }
      } else {
        const res = await api.post('/schedules', payload);
        if ((res.data.conflito_count || 0) > 0) {
          addToast('warning', 'Conflito detectado', 'O novo agendamento entrou em sobreposição com outra programação.');
        } else {
          addToast('success', 'Sucesso', 'Agendamento salvo com sucesso!');
        }
        navigate('/schedules');
      }
    } catch (err) {
      const message = err?.response?.data?.error || 'Falha ao salvar agendamento.';
      addToast('error', 'Erro', message);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = {
    ativo: 'Ativo',
    aguardando: 'Aguardando',
    pausado: 'Pausado',
    finalizado: 'Finalizado',
    inativo: 'Inativo',
  }[form.status] || 'Aguardando';

  const resumoEscopo = form.client_id
    ? (clients.find((c) => c.id === form.client_id)?.name || 'Cliente selecionado')
    : (groups.find((group) => group.id === form.group_id)?.name || 'Grupo selecionado');

  const resumoPlaylist = playlists.find((playlist) => playlist.id === form.playlist_id)?.name || 'Plano de exibição';

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <Link to="/schedules" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            ← Voltar para Agendamentos
          </Link>
          <h2 style={{ fontSize: '1.9rem', fontWeight: '800', marginBottom: '6px' }}>{id === 'new' ? 'Novo Agendamento' : 'Editar Agendamento'}</h2>
          <p style={{ color: 'var(--text-muted)' }}>Organize prioridade, recorrência e destino com mais clareza. O agendamento pode ser feito por cliente mesmo sem dispositivos cadastrados.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => navigate('/schedules')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar agendamento'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '28px' }}>
            <div className="input-group">
              <label>Nome do agendamento *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Programação da manhã" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div className="input-group">
                <label>Cliente *</label>
                <select value={form.client_id || ''} onChange={e => setForm(p => ({ ...p, client_id: e.target.value, group_id: '' }))}>
                  <option value="">— Selecione o cliente —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Ou Grupo de Clientes</label>
                <select value={form.group_id || ''} onChange={e => setForm(p => ({ ...p, group_id: e.target.value, client_id: '' }))}>
                  <option value="">— Selecione o grupo —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}{g.description ? ` — ${g.description}` : ''}</option>)}
                </select>
                {groups.length === 0 && (
                  <div style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Nenhum grupo cadastrado para este cliente.
                  </div>
                )}
              </div>
            </div>

            <div className="input-group">
              <label>Plano de exibição *</label>
              <select value={form.playlist_id} onChange={e => setForm(p => ({ ...p, playlist_id: e.target.value }))}>
                <option value="">— Selecione o plano —</option>
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Programação</h3>
              <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>{statusLabel}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div className="input-group">
                <label>Início da execução</label>
                <input type="datetime-local" value={form.start_datetime} onChange={e => setForm(p => ({ ...p, start_datetime: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Fim da execução</label>
                <input type="datetime-local" value={form.end_datetime} onChange={e => setForm(p => ({ ...p, end_datetime: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Horário de início diário</label>
                <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Horário de fim diário</label>
                <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>

            <div className="input-group">
              <label>Dias da semana</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {DIAS.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '999px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: form.days_of_week.includes(idx) ? 'var(--primary)' : 'var(--bg-input)',
                      color: form.days_of_week.includes(idx) ? '#fff' : 'var(--text-muted)',
                      border: 'none'
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '18px' }}>Prioridade e repetição</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              {PRIORIDADES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, priority: item.value }))}
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    textAlign: 'left',
                    border: form.priority === item.value ? `1px solid ${item.color}` : '1px solid var(--border)',
                    background: form.priority === item.value ? item.bg : 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    boxShadow: form.priority === item.value ? `0 0 0 1px ${item.color}33 inset` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>{item.label}</strong>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {item.value === 'alta' ? 'Assume prioridade sobre conteúdos de menor peso.' : item.value === 'normal' ? 'Comportamento padrão da programação.' : 'Usada para conteúdos secundários.'}
                  </p>
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
              <div className="input-group">
                <label>Modo de repetição</label>
                <select value={form.repeat_type} onChange={e => setForm(p => ({ ...p, repeat_type: e.target.value }))}>
                  {REPETICOES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>

              {(form.repeat_type === 'interval_minutes' || form.repeat_type === 'interval_hours') && (
                <div className="input-group">
                  <label>Repetir a cada</label>
                  <input
                    type="number"
                    min="1"
                    value={form.repeat_value}
                    onChange={e => setForm(p => ({ ...p, repeat_value: e.target.value }))}
                  />
                </div>
              )}

              <div className="input-group">
                <label>Duração de cada execução (min)</label>
                <input
                  type="number"
                  min="1"
                  value={form.repeat_config?.duration_minutes || 60}
                  onChange={e => setForm(p => ({
                    ...p,
                    repeat_config: {
                      ...(p.repeat_config || {}),
                      duration_minutes: e.target.value,
                    },
                  }))}
                />
              </div>

              <div className="input-group">
                <label>Validade da repetição</label>
                <input type="datetime-local" value={form.repeat_until} onChange={e => setForm(p => ({ ...p, repeat_until: e.target.value }))} />
              </div>
            </div>
          </div>

          {form.conflitos?.length > 0 && (
            <div className="card" style={{ padding: '24px', border: '1px solid rgba(251,113,133,0.35)', background: 'rgba(251,113,133,0.08)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '12px', color: '#fecdd3' }}>Conflitos encontrados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {form.conflitos.map((conflito) => (
                  <div key={conflito.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(15,23,42,0.32)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <strong>{conflito.nome}</strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{conflito.escopo}</p>
                    </div>
                    <span className="badge badge-warning">{conflito.prioridade}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '16px' }}>Resumo rápido</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Prioridade</p>
                <strong style={{ color: prioridadeSelecionada.color }}>{prioridadeSelecionada.label}</strong>
              </div>
              <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Destino</p>
                <strong>{resumoEscopo}</strong>
              </div>
              <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Plano</p>
                <strong>{resumoPlaylist}</strong>
              </div>
              <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Repetição</p>
                <strong>{form.repeat_type === 'none' ? 'Sem repetição' : REPETICOES.find((item) => item.value === form.repeat_type)?.label}</strong>
              </div>
              <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</p>
                <strong>{statusLabel}</strong>
                {form.status_reason && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>{form.status_reason}</p>}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '16px' }}>Controle</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
              />
              <span>Agendamento habilitado</span>
            </label>
            <p style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              A prioridade alta pausa conteúdos inferiores quando entra em execução.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;
