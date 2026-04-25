import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const PlaylistModal = ({ isOpen, playlist, medias, clients, onClose, onSave }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [layout, setLayout] = useState('fullscreen');
  const [footerText, setFooterText] = useState('');
  const [showClock, setShowClock] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [themeColor, setThemeColor] = useState('#818cf8');
  const [orientation, setOrientation] = useState('horizontal');
  const [scaleMode, setScaleMode] = useState('cover');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (playlist) {
      setName(playlist.name || '');
      setDescription(playlist.description || '');
      setClientId(playlist.client_id || '');
      setSelectedItems(playlist.items || []);
      setLayout(playlist.layout || 'fullscreen');
      setFooterText(playlist.footer_text || '');
      setShowClock(playlist.show_clock || false);
      setShowWeather(playlist.show_weather || false);
      setThemeColor(playlist.theme_color || '#818cf8');
      setOrientation(playlist.orientation || 'horizontal');
      setScaleMode(playlist.scale_mode || 'cover');
    } else {
      setName('');
      setDescription('');
      setClientId('');
      setSelectedItems([]);
      setLayout('fullscreen');
      setFooterText('');
      setShowClock(false);
      setShowWeather(false);
      setThemeColor('#818cf8');
      setOrientation('horizontal');
      setScaleMode('cover');
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
      i.media_id === mediaId ? { ...i, duration: Math.max(1, parseInt(duration) || 1) } : i
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
        client_id: clientId,
        layout,
        footer_text: footerText,
        show_clock: showClock,
        show_weather: showWeather,
        theme_color: themeColor,
        orientation: orientation,
        scale_mode: scaleMode,
        items: selectedItems.map((item, i) => ({
          media_id: item.media_id,
          duration_seconds: item.media?.type === 'video' ? 0 : (item.duration || 10),
          position: i
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

  const totalDuration = selectedItems.reduce((acc, i) => {
    const dur = i.media?.type === 'video' ? 0 : (i.duration || 10);
    return acc + dur;
  }, 0);

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '1100px', height: '90vh' }}>
        <div className="modal-header">
          <h2>{playlist?.id ? '✏️ Editar Playlist' : '🎬 Nova Playlist'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: 'calc(90vh - 140px)', overflow: 'hidden' }}>
          {/* Main Controls Area */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="table-container" style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex' }}>
                {[
                  { id: 'info', label: 'Informações' },
                  { id: 'medias', label: `Mídias (${selectedItems.length})` },
                  { id: 'layout', label: '🎨 Visual & Widgets' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer',
                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                    fontWeight: '600', transition: 'all 0.2s'
                  }}>{tab.label}</button>
                ))}
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
              {activeTab === 'info' ? (
                <div className="animate-fade-in">
                  {user?.role === 'admin' && (
                    <div className="input-group">
                      <label>Empresa (Cliente) *</label>
                      <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                        <option value="">— Selecione uma Empresa —</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="input-group">
                    <label>Nome da Playlist *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Cardápio Digital Loja 1" />
                  </div>
                  <div className="input-group">
                    <label>Descrição</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional..." rows={3} />
                  </div>
                  <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Orientação da Tela</label>
                      <select value={orientation} onChange={e => setOrientation(e.target.value)}>
                        <option value="horizontal">Horizontal (16:9)</option>
                        <option value="portrait">Vertical (9:16)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Ajuste da Mídia</label>
                      <select value={scaleMode} onChange={e => setScaleMode(e.target.value)}>
                        <option value="cover">Preencher Tela (Corte)</option>
                        <option value="contain">Manter Proporção (Bordas)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'layout' ? (
                <div className="animate-fade-in">
                  <div className="input-group">
                    <label>Layout</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button className={`btn ${layout === 'fullscreen' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLayout('fullscreen')}>Tela Cheia</button>
                      <button className={`btn ${layout === 'with_footer' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLayout('with_footer')}>Com Rodapé</button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Texto do Rodapé (Ticker)</label>
                    <input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Promoção do dia..." />
                  </div>
                  <div className="input-group">
                    <label>Widgets</label>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={showClock} onChange={e => setShowClock(e.target.checked)} /> Relógio
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={showWeather} onChange={e => setShowWeather(e.target.checked)} /> Clima
                      </label>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Cor do Tema</label>
                    <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '100%', height: '40px' }} />
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.875rem', marginBottom: '12px' }}>Ordem de Reprodução</h4>
                    {selectedItems.map((item, idx) => (
                      <div key={item.media_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '8px' }}>
                        <span style={{ width: '20px' }}>{idx+1}</span>
                        <span style={{ flex: 1, fontSize: '0.875rem' }}>{item.media?.name}</span>
                        {item.media?.type !== 'video' && (
                          <input type="number" value={item.duration} onChange={e => updateDuration(item.media_id, e.target.value)} style={{ width: '60px', padding: '4px' }} />
                        )}
                        <button onClick={() => toggleMedia(item.media)} style={{ color: 'var(--error)' }}>×</button>
                      </div>
                    ))}
                  </div>
                  <h4 style={{ fontSize: '0.875rem', marginBottom: '12px' }}>Biblioteca</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                    {medias.map(m => (
                      <div key={m.id} onClick={() => toggleMedia(m)} style={{ 
                        cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: selectedItems.some(i => i.media_id === m.id) ? '2px solid var(--primary)' : '2px solid transparent'
                      }}>
                        <div style={{ height: '70px', background: '#000' }}>
                          {m.type === 'video' ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</div> : <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div style={{ padding: '28px', background: 'var(--bg-dark)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Visualização</h4>
            <div style={{ 
              flex: 1, position: 'relative', background: '#000', borderRadius: '12px', border: '4px solid #222', overflow: 'hidden',
              display: 'flex', flexDirection: orientation === 'portrait' ? 'row' : 'column',
              aspectRatio: orientation === 'portrait' ? '9/16' : '16/9'
            }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedItems.length > 0 ? (
                  <div style={{ width: '100%', height: '100%' }}>
                    {selectedItems[0].media?.type === 'image' ? (
                      <img src={selectedItems[0].media?.url} style={{ width: '100%', height: '100%', objectFit: scaleMode }} />
                    ) : (
                      <div style={{ color: '#fff' }}>▶ Vídeo</div>
                    )}
                  </div>
                ) : <div style={{ color: '#444' }}>Vazio</div>}
                {(showClock || showWeather) && (
                  <div style={{ position: 'absolute', top: '5%', right: '5%', padding: '4px', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.5rem', borderRadius: '4px', border: `1px solid ${themeColor}` }}>
                    14:50 {showWeather && '⛅'}
                  </div>
                )}
              </div>
              {(layout === 'with_footer' || footerText) && (
                <div style={{ height: orientation === 'portrait' ? '100%' : '40px', width: orientation === 'portrait' ? '40px' : '100%', background: themeColor, color: '#fff', fontSize: '0.5rem', padding: '5px', overflow: 'hidden' }}>
                  {footerText || 'RODAPÉ...'}
                </div>
              )}
            </div>
            <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duração Total: <strong>{totalDuration}s</strong></p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Playlists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [medias, setMedias] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, playlist: null });
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([
      fetchPlaylists(),
      fetchMedias(),
      fetchClients()
    ]).finally(() => setLoading(false));
  }, []);

  const fetchClients = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch { /* silent */ }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
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
        clients={clients}
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
