import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const LOG_ICONS = {
  upload: '📤',
  delete: '🗑️',
  login: '🔑',
  logout: '🚪',
  create: '✨',
  update: '✏️',
  device_online: '✅',
  device_offline: '❌',
  playlist: '🎬',
  schedule: '📅',
  default: '📋'
};

const LOG_BADGE = {
  info: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error'
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ type: '', action: '', search: '' });
  const { addToast } = useToast();
  const PER_PAGE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: PER_PAGE });
      if (filter.type) params.set('type', filter.type);
      if (filter.action) params.set('action', filter.action);
      if (filter.search) params.set('search', filter.search);
      const res = await api.get(`/logs?${params}`);
      setLogs(res.data.logs || res.data);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os logs.');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('pt-BR'),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const LOG_TYPES = ['info', 'success', 'warning', 'error'];
  const LOG_ACTIONS = ['upload', 'delete', 'login', 'logout', 'create', 'update', 'device_online', 'device_offline', 'playlist', 'schedule'];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Logs de Atividade</h2>
          <p style={{ color: 'var(--text-muted)' }}>Histórico completo de eventos e ações do sistema.</p>
        </div>
        <button className="btn btn-outline" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>🔍</span>
          <input value={filter.search} onChange={e => handleFilterChange('search', e.target.value)}
            placeholder="Buscar nos logs..."
            style={{ paddingLeft: '42px' }} />
        </div>
        <select value={filter.type} onChange={e => handleFilterChange('type', e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="">Todos os tipos</option>
          {LOG_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filter.action} onChange={e => handleFilterChange('action', e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="">Todas as ações</option>
          {LOG_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Log List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>Carregando logs...</div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhum log encontrado</h3>
          <p style={{ color: 'var(--text-muted)' }}>Os logs de atividade aparecerão aqui conforme o sistema for utilizado.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {logs.map((log, i) => {
            const { date, time } = formatDate(log.created_at || log.timestamp);
            const icon = LOG_ICONS[log.action] || LOG_ICONS.default;
            return (
              <div key={log.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '16px',
                padding: '16px 20px',
                borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.15s'
              }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                {/* Icon */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0
                }}>{icon}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <p style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{log.message || log.description}</p>
                    {log.type && (
                      <span className={`badge ${LOG_BADGE[log.type] || 'badge-primary'}`}>{log.type}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--text-dim)', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                    {log.user_name && <span>👤 {log.user_name}</span>}
                    {log.action && <span>⚡ {log.action}</span>}
                    {log.ip && <span>🌐 {log.ip}</span>}
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600' }}>{time}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{date}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', fontSize: '0.875rem', opacity: page === 1 ? 0.5 : 1 }}>← Anterior</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Página {page} de {totalPages}</span>
          <button className="btn btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 16px', fontSize: '0.875rem', opacity: page === totalPages ? 0.5 : 1 }}>Próxima →</button>
        </div>
      )}
    </div>
  );
};

export default Logs;
