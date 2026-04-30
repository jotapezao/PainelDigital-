import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const StatCard = ({ icon, label, value, sub, color, onClick }) => (
  <div className="card" onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default', transition: 'all 0.25s', padding: '24px' }}
    onMouseOver={e => onClick && (e.currentTarget.style.transform = 'translateY(-3px)')}
    onMouseOut={e => onClick && (e.currentTarget.style.transform = 'none')}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: 'var(--radius-md)',
        backgroundColor: `${color}1a`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
      }}>{icon}</div>
      {sub !== undefined && (
        <span style={{
          fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px',
          borderRadius: '20px', backgroundColor: `${color}1a`, color
        }}>{sub}</span>
      )}
    </div>
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>{label}</p>
    <p style={{ fontSize: '2rem', fontWeight: '700', color, fontFamily: 'Outfit' }}>{value ?? '—'}</p>
  </div>
);

const timeSince = (dateStr) => {
  if (!dateStr) return 'nunca';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
};

const PLAYER_STATUS_LABELS = {
  playing: { label: 'Reproduzindo', color: '#22c55e', icon: '▶' },
  loading: { label: 'Carregando', color: '#f59e0b', icon: '⟳' },
  error: { label: 'Erro', color: '#ef4444', icon: '⚠' },
  idle: { label: 'Aguardando', color: '#6b7280', icon: '⏸' },
  offline: { label: 'Offline', color: '#ef4444', icon: '●' },
};

const DeviceMonitorCard = ({ device }) => {
  const isOnline = device.status === 'online';
  const lastSeen = timeSince(device.last_seen);
  const ps = PLAYER_STATUS_LABELS[isOnline ? (device.player_status || 'idle') : 'offline'];

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isOnline ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
      borderLeft: `4px solid ${isOnline ? '#22c55e' : '#ef4444'}`,
      borderRadius: '14px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      transition: 'transform 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: '700', fontSize: '0.9375rem', marginBottom: '2px' }}>{device.name}</p>
          {device.location && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>📍 {device.location}</p>
          )}
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '20px',
          background: `${ps.color}20`,
          color: ps.color,
          fontSize: '0.7rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap'
        }}>
          <span>{ps.icon}</span>
          {ps.label}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <span>🕒 {lastSeen}</span>
        {device.ip_address && <span>🌐 {device.ip_address}</span>}
        {device.playlist_name && <span>🎬 {device.playlist_name}</span>}
        {device.client_name && <span>🏢 {device.client_name}</span>}
      </div>

      {device.last_error && (
        <div style={{ fontSize: '0.72rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', padding: '6px 10px' }}>
          ⚠ {device.last_error}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const tickRef = useRef(0);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.allSettled([
        api.get('/stats'),
        api.get('/logs?limit=5')
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (logsRes.status === 'fulfilled') {
        const data = logsRes.value.data;
        setRecentLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const params = filterClient ? `?client_id=${filterClient}` : '';
      const res = await api.get(`/devices${params}`);
      setDevices(res.data);
    } catch { /* silent */ } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (user?.role === 'admin') {
      api.get('/clients').then(r => setClients(r.data)).catch(() => {});
    }
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDevicesLoading(true);
    fetchDevices();
    const interval = setInterval(fetchDevices, 15000);
    return () => clearInterval(interval);
  }, [filterClient]);

  // Live clock tick for "time since" refresh
  useEffect(() => {
    const t = setInterval(() => {
      tickRef.current++;
      setDevices(d => [...d]); // force re-render to refresh timeSince
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const LOG_ICONS = { upload: '📤', delete: '🗑️', login: '🔑', logout: '🚪', create: '✨', update: '✏️', device_online: '✅', device_offline: '❌', default: '📋' };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status !== 'online').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: '700', marginBottom: '6px' }}>
            {greeting}, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/devices')}>+ Novo Dispositivo</button>
      </div>

      {/* Stats Grid */}
      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard icon="📺" label={<>Dispositivos Online <span className="info-icon" title="Quantidade de telas ligadas agora vs total cadastrado">?</span></>} value={loading ? '...' : `${stats?.online_devices ?? 0} / ${stats?.total_devices ?? 0}`}
          sub={stats ? `${Math.round((stats.online_devices / Math.max(stats.total_devices, 1)) * 100)}%` : undefined}
          color="var(--success)" onClick={() => navigate('/devices')} />
        <StatCard icon="🎬" label={<>Planos Ativos <span className="info-icon" title="Programações de exibição em uso">?</span></>} value={loading ? '...' : stats?.total_playlists ?? 0}
          color="var(--primary)" onClick={() => navigate('/playlists')} />
        <StatCard icon="🖼️" label="Mídias na Biblioteca" value={loading ? '...' : stats?.total_medias ?? 0}
          color="var(--accent)" onClick={() => navigate('/medias')} />
        <StatCard icon="📅" label="Agendamentos" value={loading ? '...' : stats?.active_schedules ?? 0}
          sub={stats?.active_schedules ? 'ativos' : undefined}
          color="var(--warning)" onClick={() => navigate('/schedules')} />
        {user?.role === 'admin' && (
          <StatCard icon="🏢" label="Empresas Cadastradas" value={loading ? '...' : stats?.total_clients ?? 0}
            sub={stats?.active_clients ? `${stats.active_clients} ativas` : undefined}
            color="var(--secondary)" onClick={() => navigate('/clients')} />
        )}
      </div>

      {/* Device Monitor Panel */}
      <div className="card" style={{ marginBottom: '24px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontWeight: '700', fontSize: '1.0625rem', marginBottom: '4px' }}>
              📡 Monitor de Dispositivos
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Atualiza a cada 15s &nbsp;·&nbsp;
              <span style={{ color: 'var(--success)', fontWeight: '600' }}>● {onlineCount} online</span>
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--error)', fontWeight: '600' }}>● {offlineCount} offline</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {user?.role === 'admin' && clients.length > 0 && (
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem' }}
              >
                <option value="">Todas as Empresas</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
              onClick={fetchDevices}>
              🔄 Atualizar
            </button>
            <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
              onClick={() => navigate('/devices')}>
              Ver todos
            </button>
          </div>
        </div>

        {devicesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando dispositivos...</div>
        ) : devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📺</div>
            <p>Nenhum dispositivo cadastrado.</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/devices/new')}>Cadastrar primeiro dispositivo</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {devices.map(device => <DeviceMonitorCard key={device.id} device={device} />)}
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '1rem' }}>Ações Rápidas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '📤', label: 'Fazer upload de mídia', path: '/medias', color: 'var(--accent)' },
              { icon: '🎬', label: 'Criar novo plano de exibição', path: '/playlists', color: 'var(--primary)' },
              { icon: '📺', label: 'Cadastrar dispositivo', path: '/devices', color: 'var(--success)' },
              { icon: '📅', label: 'Agendar exibição', path: '/schedules', color: 'var(--warning)' },
            ].map(action => (
              <button key={action.path} onClick={() => navigate(action.path)}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', gap: '12px', padding: '12px 16px', textAlign: 'left' }}>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: `${action.color}1a`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>{action.icon}</span>
                <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>Atividade Recente</h3>
            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
              onClick={() => navigate('/logs')}>Ver tudo</button>
          </div>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Carregando...</div>
          ) : recentLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
              <p>Nenhuma atividade registrada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentLogs.map((log, i) => (
                <div key={log.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0
                  }}>{LOG_ICONS[log.action] || LOG_ICONS.default}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message || log.description}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(log.created_at || log.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
