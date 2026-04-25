import { useState, useEffect } from 'react';
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

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      } catch {
        // silent — show skeleton
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const LOG_ICONS = { upload: '📤', delete: '🗑️', login: '🔑', logout: '🚪', create: '✨', update: '✏️', device_online: '✅', device_offline: '❌', default: '📋' };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

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
        <StatCard icon="🎬" label={<>Playlists Ativas <span className="info-icon" title="Listas de reprodução que estão em uso no momento">?</span></>} value={loading ? '...' : stats?.total_playlists ?? 0}
          color="var(--primary)" onClick={() => navigate('/playlists')} />
        <StatCard icon="🖼️" label="Mídias na Biblioteca" value={loading ? '...' : stats?.total_medias ?? 0}
          color="var(--accent)" onClick={() => navigate('/medias')} />
        <StatCard icon="📅" label="Agendamentos" value={loading ? '...' : stats?.active_schedules ?? 0}
          sub={stats?.active_schedules ? 'ativos' : undefined}
          color="var(--warning)" onClick={() => navigate('/schedules')} />
      </div>

      {/* Bottom row */}
      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '1rem' }}>Ações Rápidas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '📤', label: 'Fazer upload de mídia', path: '/medias', color: 'var(--accent)' },
              { icon: '🎬', label: 'Criar nova playlist', path: '/playlists', color: 'var(--primary)' },
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
