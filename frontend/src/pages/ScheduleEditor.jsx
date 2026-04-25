import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ScheduleEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    device_id: '',
    playlist_id: '',
    start_time: '',
    end_time: '',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    active: true
  });
  
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, playlistsRes] = await Promise.all([
          api.get('/devices'),
          api.get('/playlists')
        ]);
        setDevices(devicesRes.data);
        setPlaylists(playlistsRes.data);

        if (id && id !== 'new') {
          const res = await api.get(`/schedules/${id}`);
          setForm(res.data);
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do agendamento.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const toggleDay = (idx) => {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(idx)
        ? prev.days_of_week.filter(d => d !== idx)
        : [...prev.days_of_week, idx].sort()
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.device_id || !form.playlist_id) {
      addToast('warning', 'Atenção', 'Preencha os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await api.put(`/schedules/${id}`, form);
      } else {
        await api.post('/schedules', form);
      }
      addToast('success', 'Sucesso', 'Agendamento salvo com sucesso!');
      navigate('/schedules');
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar agendamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/schedules" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Agendamentos
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '📅 Novo Agendamento' : '✏️ Editar Agendamento'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/schedules')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '40px' }}>
        <div className="input-group">
          <label>Título do Agendamento *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Programação Manhã" />
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>Dispositivo (TV) *</label>
            <select value={form.device_id} onChange={e => setForm(p => ({ ...p, device_id: e.target.value }))}>
              <option value="">— Selecione a TV —</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Plano de Exibição *</label>
            <select value={form.playlist_id} onChange={e => setForm(p => ({ ...p, playlist_id: e.target.value }))}>
              <option value="">— Selecione o Plano —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>Horário de Início</label>
            <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div className="input-group">
            <label>Horário de Fim</label>
            <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
          </div>
        </div>

        <div className="input-group">
          <label>Dias da Semana</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DAYS.map((day, idx) => (
              <button key={idx} type="button" onClick={() => toggleDay(idx)}
                style={{
                  padding: '10px 16px', borderRadius: 'var(--radius-md)', fontWeight: '700',
                  cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: form.days_of_week.includes(idx) ? 'var(--primary)' : 'var(--bg-input)',
                  color: form.days_of_week.includes(idx) ? '#fff' : 'var(--text-muted)',
                  border: 'none'
                }}>{day}</button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} style={{ width: '20px', height: '20px' }} />
            <span>Agendamento Habilitado</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;
