import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

// Removed PlaylistModal component

const Playlists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null });
  const { addToast } = useToast();

  useEffect(() => {
    fetchPlaylists().finally(() => setLoading(false));
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os planos.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (playlist) => {
    navigate(`/playlists/${playlist.id}`);
  };

  const handlePreview = (playlist) => {
    window.open(`/player?preview=${playlist.id}`, '_blank');
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/playlists/${deleteModal.playlist.id}`);
      addToast('success', 'Sucesso', 'Plano removido!');
      setPlaylists(prev => prev.filter(p => p.id !== deleteModal.playlist.id));
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover o plano.');
    } finally {
      setDeleteModal({ open: false, playlist: null });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Planos de Exibição</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os planos e sequências de mídias.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/playlists/new')}>
          + Novo Plano
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando planos...</div>
      ) : playlists.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎬</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhum plano criado</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Crie seu primeiro plano e organize o conteúdo das suas TVs.</p>
          <button className="btn btn-outline" onClick={() => navigate('/playlists/new')}>Criar Primeiro Plano</button>
        </div>
      ) : (
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {playlists.map(playlist => (
            <div key={playlist.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0
                }}>🎬</div>
                <span className="badge badge-primary">{playlist.item_count || 0} mídias</span>
              </div>
              <div>
                <h3 style={{ fontWeight: '700', marginBottom: '4px' }}>{playlist.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{playlist.description || 'Sem descrição'}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                <button className="btn btn-primary" style={{ flex: 1.5, padding: '8px', fontSize: '0.8125rem' }} onClick={() => handlePreview(playlist)}>
                  👁️ Visualizar Plano
                </button>
                <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }} onClick={() => handleEdit(playlist)}>
                  ✏️ Editar
                </button>
                <button className="btn" style={{ padding: '8px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
                  onClick={() => setDeleteModal({ open: true, playlist })}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Playlist?"
        message={`Tem certeza que deseja remover "${deleteModal.playlist?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, playlist: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Playlists;
