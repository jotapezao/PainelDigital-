import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const DeviceEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    location: '',
    playlist_id: '',
    client_id: '',
    notes: '',
    orientation: 'landscape'
  });
  
  const [playlists, setPlaylists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playlistsRes, clientsRes] = await Promise.all([
          api.get('/playlists'),
          user?.role === 'admin' ? api.get('/clients') : Promise.resolve({ data: [] })
        ]);
        setPlaylists(playlistsRes.data);
        setClients(clientsRes.data);

        if (id && id !== 'new') {
          const res = await api.get(`/devices/${id}`);
          const d = res.data;
          setForm({
            name: d.name || '',
            location: d.location || '',
            playlist_id: d.playlist_id || '',
            client_id: d.client_id || '',
            notes: d.notes || '',
            orientation: d.orientation || 'landscape'
          });
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do dispositivo.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('warning', 'Atenção', 'O nome do dispositivo é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await api.put(`/devices/${id}`, form);
      } else {
        await api.post('/devices', form);
      }
      addToast('success', 'Sucesso', 'Dispositivo salvo com sucesso!');
      navigate('/devices');
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar dispositivo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/devices" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Dispositivos
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '📺 Novo Dispositivo' : '✏️ Editar Dispositivo'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/devices')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '40px' }}>
        {user?.role === 'admin' && (
          <div className="input-group">
            <label>Empresa (Cliente) *</label>
            <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
              <option value="">— Selecione uma Empresa —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>Nome da TV (Ex: Recepção 01) *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do dispositivo" />
          </div>
          <div className="input-group">
            <label>Localização Física</label>
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ex: 2º Andar, Corredor" />
          </div>
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>Plano Padrão (O que passar por padrão)</label>
            <select value={form.playlist_id} onChange={e => setForm(p => ({ ...p, playlist_id: e.target.value }))}>
              <option value="">— Nenhum —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Orientação do Hardware</label>
            <select value={form.orientation} onChange={e => setForm(p => ({ ...p, orientation: e.target.value }))}>
              <option value="landscape">Horizontal (Padrão)</option>
              <option value="portrait">Vertical (Modo Totem)</option>
            </select>
          </div>
        </div>

        <div className="input-group">
          <label>Observações Adicionais</label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="IP fixo, modelo da TV, etc..." rows={4} />
        </div>
      </div>
    </div>
  );
};

export default DeviceEditor;
