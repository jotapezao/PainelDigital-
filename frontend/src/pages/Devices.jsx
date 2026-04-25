import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const StatusDot = ({ status }) => {
  const colors = {
    online: 'var(--success)',
    offline: 'var(--error)',
    idle: 'var(--warning)'
  };
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {status === 'online' && (
        <span style={{
          position: 'absolute', width: '20px', height: '20px', borderRadius: '50%',
          backgroundColor: 'var(--success)', opacity: 0.3,
          animation: 'pulse 2s infinite'
        }} />
      )}
      <span style={{
        width: '10px', height: '10px', borderRadius: '50%',
        backgroundColor: colors[status] || 'var(--text-dim)', display: 'block'
      }} />
    </span>
  );
};

// Removed DeviceModal component

const Devices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, device: null });
  const [filter, setFilter] = useState('all');
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [devRes, playRes, clientRes] = await Promise.all([
        api.get('/devices'), 
        api.get('/playlists'),
        api.get('/clients')
      ]);
      setDevices(devRes.data);
      setPlaylists(playRes.data);
      setClients(clientRes.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh a cada 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async () => {
    try {
      await api.delete(`/devices/${deleteModal.device.id}`);
      addToast('success', 'Sucesso', 'Dispositivo removido!');
      setDevices(prev => prev.filter(d => d.id !== deleteModal.device.id));
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover o dispositivo.');
    } finally {
      setDeleteModal({ open: false, device: null });
    }
  };

  const filtered = filter === 'all' ? devices : devices.filter(d => d.status === filter);
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
  };

  const statusLabel = { online: 'Online', offline: 'Offline', idle: 'Ocioso' };
  const statusBadge = { online: 'badge-success', offline: 'badge-error', idle: 'badge-warning' };

  return (
    <div className="animate-fade-in">
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(2);opacity:0.1} }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Dispositivos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Monitore e gerencie suas TVs e displays.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/devices/new')}>
          + Novo Dispositivo
        </button>
      </div>

      {/* Stats */}
      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--primary)' },
          { label: 'Online', value: stats.online, color: 'var(--success)' },
          { label: 'Offline', value: stats.offline, color: 'var(--error)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['all', 'online', 'offline'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={f === filter ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ padding: '8px 18px', fontSize: '0.875rem' }}>
            {f === 'all' ? 'Todos' : f === 'online' ? 'Online' : 'Offline'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando dispositivos...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📺</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhum dispositivo{filter !== 'all' ? ` ${statusLabel[filter]?.toLowerCase()}` : ''}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {filter === 'all' ? 'Cadastre seu primeiro dispositivo para começar.' : 'Não há dispositivos com esse status no momento.'}
          </p>
          {filter === 'all' && <button className="btn btn-outline" onClick={() => navigate('/devices/new')}>Cadastrar Dispositivo</button>}
        </div>
      ) : (
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filtered.map(device => (
            <div key={device.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                  }}>📺</div>
                  <div>
                    <h4 style={{ fontWeight: '700', marginBottom: '2px' }}>{device.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{device.location || 'Sem localização'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>🏢 {device.client_name || 'Sem Cliente'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <StatusDot status={device.status || 'offline'} />
                  <span className={`badge ${statusBadge[device.status] || 'badge-warning'}`}>
                    {statusLabel[device.status] || 'Desconhecido'}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Plano Atual</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                  {device.playlist_name || '— Nenhum —'}
                </p>
              </div>

              {device.last_seen && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                  Último acesso: {new Date(device.last_seen).toLocaleString()}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }}
                  onClick={() => navigate(`/devices/${device.id}`)}>
                  ✏️ Editar
                </button>
                <button className="btn" style={{ padding: '8px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
                  onClick={() => setDeleteModal({ open: true, device })}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Dispositivo?"
        message={`Tem certeza que deseja remover "${deleteModal.device?.name}"? O dispositivo perderá acesso ao painel.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, device: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Devices;
