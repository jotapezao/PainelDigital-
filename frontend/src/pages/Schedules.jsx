import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

// Removed ScheduleModal

const Schedules = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
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
        <button className="btn btn-primary" onClick={() => navigate('/schedules/new')}>
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
          <button className="btn btn-outline" onClick={() => navigate('/schedules/new')}>Criar Primeiro Agendamento</button>
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
                  onClick={() => navigate(`/schedules/${schedule.id}`)}>✏️</button>
                <button className="btn" style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
                  onClick={() => setDeleteModal({ open: true, schedule })}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
