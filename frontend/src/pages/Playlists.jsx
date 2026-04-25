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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Planos de Exibição <span className="info-icon" title="Combine várias mídias em uma sequência para exibir em suas TVs">?</span></h2>
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
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {playlists.map(playlist => (
            <div key={playlist.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Preview Header */}
              <div style={{ 
                height: '140px', 
                background: `linear-gradient(135deg, ${playlist.theme_color || 'var(--primary)'}, var(--accent))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>🎬</div>
                <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                    {playlist.item_count || 0} mídias
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: '12px', left: '16px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {playlist.layout === 'with_footer' ? '📺 COM RODAPÉ' : '📺 TELA CHEIA'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '4px' }}>{playlist.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {playlist.description || 'Nenhuma descrição informada.'}
                  </p>
                </div>

                {user?.role === 'admin' && (
                  <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-dim)' }}>{playlist.client_name}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                  <button className="btn btn-primary" style={{ flex: 1.5, padding: '10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => handlePreview(playlist)}>
                    <span>👁️</span> Visualizar
                  </button>
                  <button className="btn btn-outline" style={{ flex: 1, padding: '10px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => handleEdit(playlist)}>
                    <span>✏️</span> Editar
                  </button>
                  <button className="btn" style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.1)' }}
                    onClick={() => setDeleteModal({ open: true, playlist })}>
                    🗑️
                  </button>
                </div>
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
