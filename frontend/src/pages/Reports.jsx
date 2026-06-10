import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const StatCard = ({ icon, label, value, color }) => (
  <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: 'var(--radius-md)',
        backgroundColor: `${color}1a`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color
      }}>{icon}</div>
    </div>
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>{label}</p>
    <p style={{ fontSize: '1.875rem', fontWeight: '700', color, fontFamily: 'Outfit' }}>{value ?? '—'}</p>
  </div>
);

const getSlaColor = (sla) => {
  if (sla >= 99) return '#10b981'; // var(--success)
  if (sla >= 95) return '#f59e0b'; // amber/orange
  return '#ef4444'; // var(--error)
};

const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return 'Em andamento';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}min`;
  return `${seconds}s`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState('');
  const [filterDays, setFilterDays] = useState(7);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('days', filterDays);
      if (filterClient) {
        params.append('clientId', filterClient);
      }
      
      const res = await api.get(`/reports?${params.toString()}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Falha ao buscar relatórios de uptime', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterDays, filterClient]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/clients')
        .then(res => setClients(res.data))
        .catch(err => console.error('Erro ao buscar clientes', err));
    }
  }, [user]);

  const stats = reportData?.summary;
  const devices = reportData?.devices || [];
  const incidents = reportData?.incidents || [];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: '700', marginBottom: '6px' }}>Relatórios de Desempenho e SLA 📊</h2>
          <p style={{ color: 'var(--text-muted)' }}>Monitore o tempo de exibição, quedas de sinal e disponibilidade das TVs.</p>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {user?.role === 'admin' && (
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: '500',
                outline: 'none',
                minWidth: '200px'
              }}
            >
              <option value="">Todas as Empresas</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <select
            value={filterDays}
            onChange={e => setFilterDays(parseInt(e.target.value, 10))}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              fontWeight: '500',
              outline: 'none',
              minWidth: '150px'
            }}
          >
            <option value="1">Últimas 24 horas</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* Métricas Sumarizadas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          icon="📺"
          label="TVs Monitoradas"
          value={loading ? '...' : `${stats?.onlineDevices ?? 0} / ${stats?.totalDevices ?? 0}`}
          color="#10b981"
        />
        <StatCard
          icon="⏱️"
          label="Uptime Total Acumulado"
          value={loading ? '...' : `${stats?.totalUptimeHours ?? 0} hrs`}
          color="var(--primary)"
        />
        <StatCard
          icon="🛡️"
          label="Média de SLA (Disponibilidade)"
          value={loading ? '...' : `${stats?.averageSla ?? 100}%`}
          color={getSlaColor(stats?.averageSla ?? 100)}
        />
        <StatCard
          icon="🔌"
          label="Total de Desconexões"
          value={loading ? '...' : stats?.totalDisconnects ?? 0}
          color="#f59e0b"
        />
      </div>

      {/* Tabela de Dispositivos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '28px', overflowX: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '4px' }}>Disponibilidade Individual por Tela</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Detalhamento de transmissão de cada dispositivo ativo no período selecionado.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Buscando dados de desempenho...</div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed var(--border)', borderRadius: '16px' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📺</p>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum dispositivo encontrado para gerar relatórios.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>TV / Localização</th>
                  {user?.role === 'admin' && (
                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Empresa</th>
                  )}
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Status Atual</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Uptime</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Quedas</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Último Sinal</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', width: '220px' }}>SLA / Uptime Rate</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} className="table-row" style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.875rem' }}>{d.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {d.location || 'Não definida'}</div>
                    </td>
                    {user?.role === 'admin' && (
                      <td style={{ padding: '16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        🏢 {d.clientName}
                      </td>
                    )}
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: d.currentStatus === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: d.currentStatus === 'online' ? '#10b981' : '#ef4444'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: d.currentStatus === 'online' ? '#10b981' : '#ef4444',
                          animation: d.currentStatus === 'online' ? 'pulse 2s infinite' : 'none'
                        }}></span>
                        {d.currentStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      <strong>{(d.uptimeMs / (1000 * 60 * 60)).toFixed(1)}h</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                        (sem sinal: {(d.downtimeMs / (1000 * 60 * 60)).toFixed(1)}h)
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.875rem', color: '#f59e0b', fontWeight: '700' }}>
                      🔌 {d.disconnects}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {d.lastSeen ? new Date(d.lastSeen).toLocaleString('pt-BR') : 'Sem registros'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${d.sla}%`, height: '100%', backgroundColor: getSlaColor(d.sla) }}></div>
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '0.8125rem', color: getSlaColor(d.sla), minWidth: '50px', textAlign: 'right' }}>
                          {d.sla.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Histórico de Desconexões Recentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1.125rem', marginBottom: '4px' }}>Histórico de Instabilidade Recente 🔌</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Registro cronológico de perdas de sinal capturadas pelo monitor do servidor.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando log de incidentes...</div>
          ) : incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-muted)' }}>
              ✅ Nenhuma desconexão ou perda de sinal registrada no período. Excelente estabilidade!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incidents.map((incident, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderLeft: `4px solid ${incident.endedAt ? '#f59e0b' : '#ef4444'}`,
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '1.25rem' }}>🔌</span>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '0.875rem', margin: 0 }}>
                        {incident.deviceName}
                        {user?.role === 'admin' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 'normal', marginLeft: '6px' }}>
                            ({incident.clientName})
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                        Instabilidade: {formatDate(incident.startedAt)} {incident.endedAt ? `até ${formatDate(incident.endedAt).split(' ')[1]}` : ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      backgroundColor: incident.endedAt ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: incident.endedAt ? '#f59e0b' : '#ef4444'
                    }}>
                      Duração: {formatDuration(incident.durationMs)}
                    </span>
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

export default Reports;
