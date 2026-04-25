import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const ScheduleModal = ({ isOpen, schedule, devices, playlists, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: '', device_id: '', playlist_id: '',
    start_time: '', end_time: '', days_of_week: [],
    active: true
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    if (schedule) {
      setForm({
        name: schedule.name || '',
        device_id: schedule.device_id || '',
        playlist_id: schedule.playlist_id || '',
        start_time: schedule.start_time || '',
        end_time: schedule.end_time || '',
        days_of_week: schedule.days_of_week || [],
        active: schedule.active !== false
      });
    } else {
      setForm({ name: '', device_id: '', playlist_id: '', start_time: '', end_time: '', days_of_week: [], active: true });
    }
  }, [schedule, isOpen]);

  const toggleDay = (dayIdx) => {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayIdx)
        ? prev.days_of_week.filter(d => d !== dayIdx)
        : [...prev.days_of_week, dayIdx].sort()
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.device_id || !form.playlist_id || !form.start_time || !form.end_time) {
      addToast('warning', 'Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (form.days_of_week.length === 0) {
      addToast('warning', 'Atenção', 'Selecione ao menos um dia da semana.');
      return;
    }
    setSaving(true);
    try {
      if (schedule?.id) {
        await api.put(`/schedules/${schedule.id}`, form);
      } else {
        await api.post('/schedules', form);
      }
      addToast('success', 'Sucesso', `Agendamento ${schedule?.id ? 'atualizado' : 'criado'}!`);
      onSave();
      onClose();
    } catch (err) {
      addToast('error', 'Erro', err.response?.data?.message || 'Falha ao salvar agendamento.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h2>{schedule?.id ? '✏️ Editar Agendamento' : '📅 Novo Agendamento'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        {/* Content */}
        <div className="modal-body">
          <div className="input-group">
            <label>Nome do Agendamento *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Promoção Manhã" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="input-group">
              <label>Dispositivo (TV) *</label>
              <select value={form.device_id} onChange={e => setForm(p => ({ ...p, device_id: e.target.value }))}>
                <option value="">— Selecione —</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Plano *</label>
              <select value={form.playlist_id} onChange={e => setForm(p => ({ ...p, playlist_id: e.target.value }))}>
                <option value="">— Selecione —</option>
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Início *</label>
              <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Fim *</label>
              <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>

          <div className="input-group">
            <label>Dias da Semana *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DAYS.map((day, idx) => (
                <button key={idx} type="button" onClick={() => toggleDay(idx)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-md)', fontWeight: '600',
                    fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                    border: form.days_of_week.includes(idx) ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: form.days_of_week.includes(idx) ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: form.days_of_week.includes(idx) ? 'var(--primary)' : 'var(--text-muted)'
                  }}>{day}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', margin: 0, width: '100%' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Agendamento ativo</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : (schedule?.id ? 'Salvar' : 'Criar Agendamento')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, schedule: null });
  const { addToast } = useToast();

  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    Promise.all([
      api.get('/schedules').then(r => setSchedules(r.data)).catch(() => {}),
      api.get('/devices').then(r => setDevices(r.data)).catch(() => {}),
      api.get('/playlists').then(r => setPlaylists(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os agendamentos.');
    }
  };

  const toggleActive = async (schedule) => {
    try {
      await api.put(`/schedules/${schedule.id}`, { ...schedule, active: !schedule.active });
      setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, active: !s.active } : s));
    } catch {
      addToast('error', 'Erro', 'Não foi possível alterar o status.');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/schedules/${deleteModal.schedule.id}`);
      addToast('success', 'Sucesso', 'Agendamento removido!');
      setSchedules(prev => prev.filter(s => s.id !== deleteModal.schedule.id));
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover o agendamento.');
    } finally {
      setDeleteModal({ open: false, schedule: null });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Agendamentos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Programe a exibição de planos por horário e dia da semana.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingSchedule(null); setModalOpen(true); }}>
          + Novo Agendamento
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando agendamentos...</div>
      ) : schedules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhum agendamento criado</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Programe o horário de exibição dos seus planos em cada TV.</p>
          <button className="btn btn-outline" onClick={() => { setEditingSchedule(null); setModalOpen(true); }}>Criar Primeiro Agendamento</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {schedules.map(schedule => (
            <div key={schedule.id} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', opacity: schedule.active ? 1 : 0.6 }}>
              {/* Active toggle */}
              <div style={{ flexShrink: 0 }}>
                <label style={{ display: 'flex', cursor: 'pointer' }}>
                  <input type="checkbox" checked={schedule.active} onChange={() => toggleActive(schedule)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </label>
              </div>

              {/* Time block */}
              <div style={{
                backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
                padding: '12px 18px', textAlign: 'center', flexShrink: 0, minWidth: '110px'
              }}>
                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)', fontFamily: 'Outfit' }}>
                  {schedule.start_time} – {schedule.end_time}
                </p>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '700', marginBottom: '4px' }}>{schedule.name}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>📺 {schedule.device_name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>🎬 {schedule.playlist_name}</span>
                </div>
              </div>

              {/* Days */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {DAYS.map((day, idx) => (
                  <span key={idx} style={{
                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700',
                    backgroundColor: schedule.days_of_week?.includes(idx) ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: schedule.days_of_week?.includes(idx) ? 'var(--primary)' : 'var(--text-dim)',
                    border: `1px solid ${schedule.days_of_week?.includes(idx) ? 'rgba(99,102,241,0.4)' : 'transparent'}`
                  }}>{day}</span>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                  onClick={() => { setEditingSchedule(schedule); setModalOpen(true); }}>✏️</button>
                <button className="btn" style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
                  onClick={() => setDeleteModal({ open: true, schedule })}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleModal
        isOpen={modalOpen}
        schedule={editingSchedule}
        devices={devices}
        playlists={playlists}
        onClose={() => setModalOpen(false)}
        onSave={fetchSchedules}
      />
      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Agendamento?"
        message={`Tem certeza que deseja remover "${deleteModal.schedule?.name}"?`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, schedule: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Schedules;
