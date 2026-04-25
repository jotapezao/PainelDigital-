import { useState, useEffect, useCallback } from 'react';
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

const DeviceModal = ({ isOpen, device, playlists, clients, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', location: '', playlist_id: '', client_id: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (device) {
      setForm({ 
        name: device.name || '', 
        location: device.location || '', 
        playlist_id: device.playlist_id || '',
        client_id: device.client_id || ''
      });
    } else {
      setForm({ name: '', location: '', playlist_id: '', client_id: '' });
    }
  }, [device, isOpen]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('warning', 'Atenção', 'O nome do dispositivo é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      if (device?.id) {
        await api.put(`/devices/${device.id}`, form);
      } else {
        await api.post('/devices', form);
      }
      addToast('success', 'Sucesso', `Dispositivo ${device?.id ? 'atualizado' : 'cadastrado'}!`);
      onSave();
      onClose();
    } catch (err) {
      addToast('error', 'Erro', err.response?.data?.message || 'Falha ao salvar dispositivo.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: 0 }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{device?.id ? 'Editar Dispositivo' : 'Novo Dispositivo'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '28px' }}>
          <div className="input-group">
            <label>Nome do Dispositivo *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: TV Recepção - 01" />
          </div>
          <div className="input-group">
            <label>Localização</label>
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ex: Andar 2, Sala de Espera" />
          </div>
          <div className="input-group">
            <label>Playlist Padrão</label>
            <select value={form.playlist_id} onChange={e => setForm(p => ({ ...p, playlist_id: e.target.value }))}>
              <option value="">— Nenhuma —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Vincular ao Cliente (Empresa)</label>
            <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
              <option value="">— Selecione um Cliente —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : (device?.id ? 'Salvar' : 'Cadastrar')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Dispositivos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Monitore e gerencie suas TVs e displays.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingDevice(null); setModalOpen(true); }}>
          + Novo Dispositivo
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
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
          {filter === 'all' && <button className="btn btn-outline" onClick={() => { setEditingDevice(null); setModalOpen(true); }}>Cadastrar Dispositivo</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
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
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>Playlist Atual</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                  {device.playlist_name || '— Nenhuma —'}
                </p>
              </div>

              {device.last_seen && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                  Último acesso: {new Date(device.last_seen).toLocaleString()}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }}
                  onClick={() => { setEditingDevice(device); setModalOpen(true); }}>
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

      <DeviceModal
        isOpen={modalOpen}
        device={editingDevice}
        playlists={playlists}
        clients={clients}
        onClose={() => setModalOpen(false)}
        onSave={fetchData}
      />

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
