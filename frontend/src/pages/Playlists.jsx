import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const PlaylistModal = ({ isOpen, playlist, medias, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (playlist) {
      setName(playlist.name || '');
      setDescription(playlist.description || '');
      setSelectedItems(playlist.items || []);
    } else {
      setName('');
      setDescription('');
      setSelectedItems([]);
    }
    setActiveTab('info');
  }, [playlist, isOpen]);

  const toggleMedia = (media) => {
    const exists = selectedItems.find(i => i.media_id === media.id);
    if (exists) {
      setSelectedItems(prev => prev.filter(i => i.media_id !== media.id));
    } else {
      setSelectedItems(prev => [...prev, {
        media_id: media.id,
        media: media,
        duration: media.type === 'video' ? 0 : 10,
        order: prev.length
      }]);
    }
  };

  const updateDuration = (mediaId, duration) => {
    setSelectedItems(prev => prev.map(i =>
      i.media_id === mediaId ? { ...i, duration: parseInt(duration) || 0 } : i
    ));
  };

  const moveItem = (index, direction) => {
    const newItems = [...selectedItems];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    [newItems[index], newItems[targetIdx]] = [newItems[targetIdx], newItems[index]];
    setSelectedItems(newItems.map((item, i) => ({ ...item, order: i })));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('warning', 'Atenção', 'O nome da playlist é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        items: selectedItems.map((item, i) => ({
          media_id: item.media_id,
          duration: item.duration,
          order: i
        }))
      };
      if (playlist?.id) {
        await api.put(`/playlists/${playlist.id}`, payload);
      } else {
        await api.post('/playlists', payload);
      }
      addToast('success', 'Sucesso', `Playlist ${playlist?.id ? 'atualizada' : 'criada'} com sucesso!`);
      onSave();
      onClose();
    } catch (err) {
      addToast('error', 'Erro', err.response?.data?.message || 'Falha ao salvar playlist.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalDuration = selectedItems.reduce((acc, i) => acc + (i.duration || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '800px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
            {playlist?.id ? 'Editar Playlist' : 'Nova Playlist'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 28px' }}>
          {['info', 'medias'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: '600', textTransform: 'capitalize', transition: 'all 0.2s'
            }}>
              {tab === 'info' ? 'Informações' : `Mídias (${selectedItems.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          {activeTab === 'info' ? (
            <div>
              <div className="input-group">
                <label>Nome da Playlist *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Promoções de Verão" />
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Descrição opcional..." rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              {selectedItems.length > 0 && (
                <div className="card" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    📊 <strong style={{ color: 'var(--primary)' }}>{selectedItems.length}</strong> mídias selecionadas • Duração total: <strong style={{ color: 'var(--primary)' }}>{totalDuration}s</strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Selected items order */}
              {selectedItems.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Ordem de Reprodução</h4>
                  {selectedItems.map((item, index) => (
                    <div key={item.media_id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-input)', marginBottom: '8px'
                    }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.875rem', minWidth: '20px' }}>{index + 1}</span>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '8px',
                        backgroundColor: '#000', overflow: 'hidden', flexShrink: 0
                      }}>
                        {item.media?.type === 'video'
                          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>▶</span>
                          : <img src={item.media?.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.media?.name}</span>
                      {item.media?.type !== 'video' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duração(s):</span>
                          <input type="number" value={item.duration} min="1" max="3600"
                            onChange={e => updateDuration(item.media_id, e.target.value)}
                            style={{ width: '70px', padding: '6px 10px', fontSize: '0.875rem' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => moveItem(index, -1)} disabled={index === 0}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
                        <button onClick={() => moveItem(index, 1)} disabled={index === selectedItems.length - 1}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', opacity: index === selectedItems.length - 1 ? 0.3 : 1 }}>↓</button>
                        <button onClick={() => toggleMedia(item.media)}
                          style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Media library */}
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Biblioteca de Mídias</h4>
              {medias.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>Nenhuma mídia disponível. Faça upload primeiro.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                  {medias.map(media => {
                    const isSelected = selectedItems.some(i => i.media_id === media.id);
                    return (
                      <div key={media.id} onClick={() => toggleMedia(media)}
                        style={{
                          borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer',
                          border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                          transition: 'all 0.2s', transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                          position: 'relative'
                        }}>
                        <div style={{ height: '90px', backgroundColor: '#000' }}>
                          {media.type === 'video'
                            ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '1.5rem' }}>▶</div>
                            : <img src={media.url} alt={media.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: '6px', right: '6px',
                            backgroundColor: 'var(--primary)', borderRadius: '50%',
                            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', color: 'white', fontWeight: '700'
                          }}>✓</div>
                        )}
                        <p style={{ padding: '6px 8px', fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : (playlist?.id ? 'Salvar Alterações' : 'Criar Playlist')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null });
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([fetchPlaylists(), fetchMedias()]);
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar as playlists.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedias = async () => {
    try {
      const res = await api.get('/medias');
      setMedias(res.data);
    } catch {
      // silent
    }
  };

  const handleEdit = async (playlist) => {
    try {
      const res = await api.get(`/playlists/${playlist.id}`);
      setEditingPlaylist(res.data);
    } catch {
      setEditingPlaylist(playlist);
    }
    setModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/playlists/${deleteModal.playlist.id}`);
      addToast('success', 'Sucesso', 'Playlist removida!');
      setPlaylists(prev => prev.filter(p => p.id !== deleteModal.playlist.id));
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover a playlist.');
    } finally {
      setDeleteModal({ open: false, playlist: null });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Playlists</h2>
          <p style={{ color: 'var(--text-muted)' }}>Organize e sequencie suas mídias para exibição.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingPlaylist(null); setModalOpen(true); }}>
          + Nova Playlist
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando playlists...</div>
      ) : playlists.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎬</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhuma playlist criada</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Crie sua primeira playlist e organize o conteúdo das suas TVs.</p>
          <button className="btn btn-outline" onClick={() => { setEditingPlaylist(null); setModalOpen(true); }}>Criar Primeira Playlist</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
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

      <PlaylistModal
        isOpen={modalOpen}
        playlist={editingPlaylist}
        medias={medias}
        onClose={() => setModalOpen(false)}
        onSave={fetchPlaylists}
      />

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
