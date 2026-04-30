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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: '700', fontSize: '0.9375rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{device.name}</p>
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
          whiteSpace: 'nowrap',
          marginLeft: '8px'
        }}>
          <span>{ps.icon}</span>
          {ps.label}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <span title={new Date(device.last_seen).toLocaleString()}>🕒 {lastSeen}</span>
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

  useEffect(() => {
    const t = setInterval(() => {
      tickRef.current++;
      setDevices(d => [...d]);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: '700', marginBottom: '6px' }}>
            {greeting}, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/playlists/new')}>+ Criar Novo Plano</button>
      </div>

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard icon="📺" label="Telas Online" value={loading ? '...' : `${stats?.online_devices ?? 0} / ${stats?.total_devices ?? 0}`}
          sub={stats ? `${Math.round((stats.online_devices / Math.max(stats.total_devices, 1)) * 100)}%` : undefined}
          color="var(--success)" onClick={() => navigate('/devices')} />
        <StatCard icon="👤" label="Usuários Online" value={loading ? '...' : stats?.online_users_count ?? 0}
          sub="agora" color="#0ea5e9" />
        <StatCard icon="🎬" label="Planos Ativos" value={loading ? '...' : stats?.total_playlists ?? 0}
          color="var(--primary)" onClick={() => navigate('/playlists')} />
        <StatCard icon="🖼️" label="Mídias" value={loading ? '...' : stats?.total_medias ?? 0}
          color="var(--accent)" onClick={() => navigate('/medias')} />
        {user?.role === 'admin' && (
          <StatCard icon="🏢" label="Empresas" value={loading ? '...' : stats?.total_clients ?? 0}
            color="var(--secondary)" onClick={() => navigate('/clients')} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginBottom: '24px' }}>
        {/* Device Monitor Panel */}
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontWeight: '700', fontSize: '1.0625rem', marginBottom: '4px' }}>
                📡 Monitor de Dispositivos
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {onlineCount} telas transmitindo agora
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
            </div>
          </div>

          {devicesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Nenhum dispositivo encontrado.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {devices.map(device => <DeviceMonitorCard key={device.id} device={device} />)}
            </div>
          )}
        </div>

        {/* Online Users List */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            Usuários Online
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats?.online_users?.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Ninguém online no momento.</p>
            ) : (
              stats?.online_users?.map(u => (
                <div key={u.id} style={{ padding: '10px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{u.name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700' }}>Ativo</span>
                  </div>
                  {u.client_name && <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>🏢 {u.client_name}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Quick Actions */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '1rem' }}>Ações Rápidas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '📤', label: 'Upload Mídia', path: '/medias', color: 'var(--accent)' },
              { icon: '🎬', label: 'Novo Plano', path: '/playlists/new', color: 'var(--primary)' },
              { icon: '🏢', label: 'Nova Empresa', path: '/clients', color: 'var(--secondary)' },
              { icon: '📅', label: 'Novo Agendamento', path: '/schedules', color: 'var(--warning)' },
            ].map(action => (
              <button key={action.path} onClick={() => navigate(action.path)}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', gap: '12px', padding: '12px 16px', textAlign: 'left', width: '100%' }}>
                <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
                <span style={{ fontWeight: '600', fontSize: '0.8125rem' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1rem' }}>Atividade do Sistema</h3>
            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
              onClick={() => navigate('/logs')}>Ver tudo</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.slice(0, 4).map((log, i) => (
              <div key={log.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.1rem' }}>{LOG_ICONS[log.action] || LOG_ICONS.default}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message || log.description}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{timeSince(log.created_at || log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
