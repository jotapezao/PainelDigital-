import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const PlaylistEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

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
  
  const [medias, setMedias] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mediasRes, clientsRes] = await Promise.all([
          api.get('/medias'),
          user?.role === 'admin' ? api.get('/clients') : Promise.resolve({ data: [] })
        ]);
        setMedias(mediasRes.data);
        setClients(clientsRes.data);

        if (id && id !== 'new') {
          const playlistRes = await api.get(`/playlists/${id}`);
          const p = playlistRes.data;
          setName(p.name || '');
          setDescription(p.description || '');
          setClientId(p.client_id || '');
          setSelectedItems(p.items || []);
          setLayout(p.layout || 'fullscreen');
          setFooterText(p.footer_text || '');
          setShowClock(p.show_clock || false);
          setShowWeather(p.show_weather || false);
          setThemeColor(p.theme_color || '#818cf8');
          setOrientation(p.orientation || 'horizontal');
          setScaleMode(p.scale_mode || 'cover');
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do plano.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

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

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('warning', 'Atenção', 'O nome do plano é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name, description, client_id: clientId, layout,
        footer_text: footerText, show_clock: showClock, show_weather: showWeather,
        theme_color: themeColor, orientation, scale_mode: scaleMode,
        items: selectedItems.map((item, i) => ({
          media_id: item.media_id,
          duration_seconds: item.media?.type === 'video' ? 0 : (item.duration || 10),
          position: i
        }))
      };
      if (id && id !== 'new') {
        await api.put(`/playlists/${id}`, payload);
      } else {
        await api.post('/playlists', payload);
      }
      addToast('success', 'Sucesso', 'Plano salvo com sucesso!');
      navigate('/playlists');
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar o plano.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/playlists" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Planos
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '🎬 Novo Plano de Exibição' : '✏️ Editar Plano'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/playlists')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Plano'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: '32px', padding: '0 32px' }}>
            {[
              { id: 'info', label: '1. Informações Básicas' },
              { id: 'medias', label: `2. Seleção de Mídias (${selectedItems.length})` },
              { id: 'layout', label: '3. Personalização Visual' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                fontWeight: '700', fontSize: '0.9375rem', transition: 'all 0.2s'
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '40px' }}>
          {activeTab === 'info' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
              {user?.role === 'admin' && (
                <div className="input-group">
                  <label>Empresa (Cliente) *</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">— Selecione uma Empresa —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="input-group">
                <label>Nome do Plano *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Promoções de Natal 2026" style={{ fontSize: '1.1rem' }} />
              </div>
              <div className="input-group">
                <label>Descrição Interna</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo deste plano..." rows={4} />
              </div>
              <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="input-group">
                  <label>Orientação da Tela</label>
                  <select value={orientation} onChange={e => setOrientation(e.target.value)}>
                    <option value="horizontal">📺 Horizontal (16:9)</option>
                    <option value="portrait">📱 Vertical (9:16)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Modo de Escala</label>
                  <select value={scaleMode} onChange={e => setScaleMode(e.target.value)}>
                    <option value="cover">Preencher Tela (Corte Inteligente)</option>
                    <option value="contain">Ajustar à Tela (Bordas Laterais)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div>
                  <div className="input-group">
                    <label>Layout Estrutural</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <button className={`btn ${layout === 'fullscreen' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLayout('fullscreen')} style={{ height: '80px' }}>
                        Tela Cheia
                      </button>
                      <button className={`btn ${layout === 'with_footer' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setLayout('with_footer')} style={{ height: '80px' }}>
                        Com Rodapé
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Cor de Destaque (Tema)</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '60px', height: '46px', padding: '4px' }} />
                      <input value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ flex: 1 }} />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="input-group">
                    <label>Texto do Rodapé (Informativo/Ticker)</label>
                    <textarea value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Digite aqui as notícias ou promoções que vão rolar no rodapé..." rows={3} />
                  </div>
                  <div className="input-group">
                    <label>Widgets Auxiliares</label>
                    <div style={{ display: 'flex', gap: '32px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showClock} onChange={e => setShowClock(e.target.checked)} style={{ width: '20px', height: '20px' }} /> Relógio
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showWeather} onChange={e => setShowWeather(e.target.checked)} style={{ width: '20px', height: '20px' }} /> Clima
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medias' && (
            <div className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                <div>
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Mídias Selecionadas ({selectedItems.length})</h4>
                  {selectedItems.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '12px', border: '2px dashed var(--border)' }}>
                      Nenhuma mídia selecionada. Escolha na biblioteca ao lado.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedItems.map((item, idx) => (
                        <div key={item.media_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', background: 'var(--bg-input)', borderRadius: '12px' }}>
                          <span style={{ fontWeight: '800', color: 'var(--primary)', width: '24px' }}>{idx + 1}</span>
                          <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                            {item.media?.type === 'image' ? <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</div>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{item.media?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.media?.type === 'video' ? 'Vídeo (Duração Original)' : 'Imagem'}</p>
                          </div>
                          {item.media?.type !== 'video' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ fontSize: '0.75rem' }}>Duração:</label>
                              <input type="number" value={item.duration} onChange={e => updateDuration(item.media_id, e.target.value)} style={{ width: '70px', textAlign: 'center' }} />
                              <span>s</span>
                            </div>
                          )}
                          <button onClick={() => toggleMedia(item.media)} className="btn" style={{ padding: '8px', color: 'var(--error)' }}>🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Biblioteca de Mídias</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                    {medias.map(m => (
                      <div key={m.id} onClick={() => toggleMedia(m)} style={{ 
                        cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', position: 'relative',
                        border: selectedItems.some(i => i.media_id === m.id) ? '3px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ height: '100px', background: '#000' }}>
                          {m.type === 'image' ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>▶ Vídeo</div>}
                        </div>
                        {selectedItems.some(i => i.media_id === m.id) && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistEditor;
