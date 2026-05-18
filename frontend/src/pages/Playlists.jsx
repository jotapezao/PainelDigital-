import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const layoutLabel = (layout) => {
  switch (layout) {
    case 'with_footer': return '📺 Com Rodapé';
    case 'split': return '⬛ Split';
    case 'floating': return '💬 Flutuante';
    default: return '📺 Tela Cheia';
  }
};

const Playlists = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null });
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    fetchPlaylists();
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

  const filtered = playlists.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            Planos de Exibição <span className="info-icon" title="Combine mídias em sequências para exibir nas TVs">?</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            {playlists.length} plano(s) cadastrado(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar planos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem', width: '220px' }}
          />
          <button className="btn btn-primary" onClick={() => navigate('/playlists/new')}>
            + Novo Plano
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
          Carregando planos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎬</div>
          <h3 style={{ marginBottom: '8px' }}>{searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum plano criado'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {searchTerm ? `Nenhum plano corresponde a "${searchTerm}".` : 'Crie seu primeiro plano e organize o conteúdo das suas TVs.'}
          </p>
          {!searchTerm && (
            <button className="btn btn-outline" onClick={() => navigate('/playlists/new')}>Criar Primeiro Plano</button>
          )}
        </div>
      ) : (
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filtered.map(playlist => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              isAdmin={user?.role === 'admin'}
              onEdit={() => navigate(`/playlists/${playlist.id}`)}
              onPreview={() => window.open(`/player?preview=${playlist.id}`, '_blank')}
              onDelete={() => setDeleteModal({ open: true, playlist })}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Plano?"
        message={`Tem certeza que deseja remover "${deleteModal.playlist?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, playlist: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

const PlaylistCard = ({ playlist, isAdmin, onEdit, onPreview, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const themeColor = playlist.theme_color || '#6366f1';
  const widgets = [
    playlist.show_clock && '⏰',
    playlist.show_weather && '⛅',
    playlist.show_social && '📱',
    playlist.layout !== 'fullscreen' && '📰',
  ].filter(Boolean);

  return (
    <div
      className="card"
      style={{
        padding: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.2)' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumb Header */}
      <div style={{
        height: '144px',
        background: `linear-gradient(135deg, ${themeColor}cc 0%, ${themeColor}44 100%)`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }} onClick={onPreview}>
        {/* Decoration circles */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: `${themeColor}33` }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: `${themeColor}22` }} />

        {/* Center icon */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: `${themeColor}44`,
            border: `2px solid ${themeColor}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem',
            backdropFilter: 'blur(8px)',
          }}>🎬</div>
        </div>

        {/* Top badges */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: '700',
            background: 'rgba(0,0,0,0.4)', color: '#fff',
            padding: '3px 8px', borderRadius: '999px',
            backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {layoutLabel(playlist.layout)}
          </span>
          {widgets.map((w, i) => (
            <span key={i} style={{
              fontSize: '0.7rem',
              background: 'rgba(0,0,0,0.35)', color: '#fff',
              padding: '3px 7px', borderRadius: '999px',
              backdropFilter: 'blur(8px)',
            }}>{w}</span>
          ))}
        </div>

        {/* Item count badge */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: '800',
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            padding: '4px 10px', borderRadius: '999px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            {playlist.item_count || 0} mídias
          </span>
        </div>

        {/* Play hint */}
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}>
            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '700', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '999px' }}>
              ▶ Pré-visualizar
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontWeight: '800', fontSize: '1.05rem', marginBottom: '4px', lineHeight: 1.3 }}>
            {playlist.name}
          </h3>
          {playlist.description && (
            <p style={{
              fontSize: '0.8125rem', color: 'var(--text-muted)',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5
            }}>
              {playlist.description}
            </p>
          )}
        </div>

        {/* Meta info */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {isAdmin && playlist.client_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: themeColor, display: 'inline-block' }} />
              {playlist.client_name}
            </span>
          )}
          <span>
            {new Date(playlist.updated_at || playlist.created_at).toLocaleDateString('pt-BR')}
          </span>
          <span style={{ color: playlist.active !== false ? 'var(--success)' : 'var(--error)', fontWeight: '700' }}>
            {playlist.active !== false ? '● Ativo' : '○ Inativo'}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: '0.8rem', gap: '6px' }}
            onClick={onEdit}
          >
            ✏️ Editar
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: '10px 14px', fontSize: '0.8rem' }}
            onClick={onPreview}
            title="Pré-visualizar"
          >
            👁️
          </button>
          <button
            className="btn"
            style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.85rem' }}
            onClick={onDelete}
            title="Remover"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default Playlists;
