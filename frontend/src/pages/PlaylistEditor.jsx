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
  const [footerOpacity, setFooterOpacity] = useState(0.8);
  const [footerFontSize, setFooterFontSize] = useState('1.5rem');
  const [footerFontColor, setFooterFontColor] = useState('#ffffff');
  const [footerPosition, setFooterPosition] = useState('bottom');
  const [footerFontFamily, setFooterFontFamily] = useState('Inter');
  const [rssUrl, setRssUrl] = useState('');
  const [transitionEffect, setTransitionEffect] = useState('fade');
  const [tickerSpeed, setTickerSpeed] = useState('medium');
  const [tickerDirection, setTickerDirection] = useState('ltr');
  const [tickerHeight, setTickerHeight] = useState(80);
  const [tickerBlur, setTickerBlur] = useState(true);
  const [tickerFontWeight, setTickerFontWeight] = useState('600');
  
  // Novas funcionalidades de Widget e Transparência
  const [showSocial, setShowSocial] = useState(false);
  const [socialHandle, setSocialHandle] = useState('');
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [cardTransparency, setCardTransparency] = useState(0.4);
  const [tickerLabel, setTickerLabel] = useState('NOTÍCIAS');
  
  // Novidades Extras
  const [socialQrcode, setSocialQrcode] = useState(false);
  const [widgetPosition, setWidgetPosition] = useState('top-right');
  const [socialPosition, setSocialPosition] = useState('bottom-right');
  const [showProgressBar, setShowProgressBar] = useState(true);
  
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
          setFooterOpacity(p.footer_opacity || 0.8);
          setFooterFontSize(p.footer_font_size || '1.5rem');
          setFooterFontColor(p.footer_font_color || '#ffffff');
          setFooterPosition(p.footer_position || 'bottom');
          setFooterFontFamily(p.footer_font_family || 'Inter');
          setRssUrl(p.rss_url || '');
          setTransitionEffect(p.transition_effect || 'fade');
          setTickerSpeed(p.ticker_speed || 'medium');
          setTickerDirection(p.ticker_direction || 'ltr');
          setTickerHeight(p.ticker_height || 80);
          setTickerBlur(p.ticker_blur !== false);
          setTickerFontWeight(p.ticker_font_weight || '600');
          setShowSocial(p.show_social || false);
          setSocialHandle(p.social_handle || '');
          setSocialPlatform(p.social_platform || 'instagram');
          setCardTransparency(p.card_transparency !== undefined && p.card_transparency !== null ? parseFloat(p.card_transparency) : 0.4);
          setTickerLabel(p.ticker_label || 'NOTÍCIAS');
          setSocialQrcode(p.social_qrcode || false);
          setWidgetPosition(p.widget_position || 'top-right');
          setSocialPosition(p.social_position || 'bottom-right');
          setShowProgressBar(p.show_progress_bar !== false);
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

  const moveUp = (idx) => {
    if (idx === 0) return;
    setSelectedItems(prev => {
      const copy = [...prev];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  };

  const moveDown = (idx) => {
    if (idx === selectedItems.length - 1) return;
    setSelectedItems(prev => {
      const copy = [...prev];
      [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
      return copy;
    });
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
        footer_opacity: parseFloat(footerOpacity), footer_font_size: footerFontSize,
        footer_font_color: footerFontColor, footer_position: footerPosition,
        footer_font_family: footerFontFamily, rss_url: rssUrl,
        transition_effect: transitionEffect,
        ticker_speed: tickerSpeed,
        ticker_direction: tickerDirection,
        ticker_height: parseInt(tickerHeight) || 80,
        ticker_blur: tickerBlur,
        ticker_font_weight: tickerFontWeight,
        show_social: showSocial,
        social_handle: socialHandle,
        social_platform: socialPlatform,
        card_transparency: parseFloat(cardTransparency),
        ticker_label: tickerLabel,
        social_qrcode: socialQrcode,
        widget_position: widgetPosition,
        social_position: socialPosition,
        show_progress_bar: showProgressBar,
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

  const totalDuration = selectedItems.reduce((acc, item) => acc + (item.media?.type === 'video' ? 0 : (item.duration || 10)), 0);

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
                    <label>Efeito de Transição (entre mídias)</label>
                    <select value={transitionEffect} onChange={e => setTransitionEffect(e.target.value)}>
                      <option value="none">Sem Efeito</option>
                      <option value="fade">Fade (Esmaecer)</option>
                      <option value="slide-left">Slide Esquerda</option>
                      <option value="slide-right">Slide Direita</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>

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

                  <div className="input-group">
                    <label>Configurações do Ticker (Rodapé)</label>
                    <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Velocidade</label>
                          <select value={tickerSpeed} onChange={e => setTickerSpeed(e.target.value)}>
                            <option value="slow">Lento</option>
                            <option value="medium">Médio</option>
                            <option value="fast">Rápido</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Direção</label>
                          <select value={tickerDirection} onChange={e => setTickerDirection(e.target.value)}>
                            <option value="ltr">Esquerda → Direita</option>
                            <option value="rtl">Direita → Esquerda</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Altura (px)</label>
                          <input type="number" value={tickerHeight} onChange={e => setTickerHeight(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                            <input type="checkbox" checked={tickerBlur} onChange={e => setTickerBlur(e.target.checked)} /> Efeito Blur (Vidro)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="input-group">
                    <label>Fonte de Notícias (RSS Feed URL)</label>
                    <input value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="Ex: https://g1.globo.com/rss/g1/" />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Deixe em branco para usar o texto manual abaixo.</p>
                  </div>
                  <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Label Notícias</label>
                      <input value={tickerLabel} onChange={e => setTickerLabel(e.target.value)} placeholder="Ex: AVISOS" />
                    </div>
                    <div className="input-group">
                      <label>Texto do Rodapé (Manual)</label>
                      <textarea value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Digite aqui as notícias..." rows={2} />
                    </div>
                  </div>

                  <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Posição do Rodapé</label>
                      <select value={footerPosition} onChange={e => setFooterPosition(e.target.value)}>
                        <option value="bottom">Embaixo (Padrão)</option>
                        <option value="top">Em Cima</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Transparência (0.1 a 1.0)</label>
                      <input type="range" min="0.1" max="1" step="0.1" value={footerOpacity} onChange={e => setFooterOpacity(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Cor da Letra</label>
                      <input type="color" value={footerFontColor} onChange={e => setFooterFontColor(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Peso da Fonte</label>
                      <select value={tickerFontWeight} onChange={e => setTickerFontWeight(e.target.value)}>
                        <option value="400">Regular</option>
                        <option value="600">Semibold</option>
                        <option value="800">Extra Bold</option>
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Posicionamento e Cards Informativos</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showClock} onChange={e => setShowClock(e.target.checked)} style={{ width: '20px', height: '20px' }} /> Relógio e Data
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showWeather} onChange={e => setShowWeather(e.target.checked)} style={{ width: '20px', height: '20px' }} /> Clima
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={showProgressBar} onChange={e => setShowProgressBar(e.target.checked)} style={{ width: '20px', height: '20px' }} /> Barra de Progresso (Tempo)
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Transparência dos Cards (0.1 a 1.0)</label>
                          <input type="range" min="0.1" max="1" step="0.1" value={cardTransparency} onChange={e => setCardTransparency(e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Posição (Relógio/Clima)</label>
                          <select value={widgetPosition} onChange={e => setWidgetPosition(e.target.value)}>
                            <option value="top-right">Canto Superior Direito</option>
                            <option value="top-left">Canto Superior Esquerdo</option>
                            <option value="bottom-right">Canto Inferior Direito</option>
                            <option value="bottom-left">Canto Inferior Esquerdo</option>
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '16px' }}>
                          <input type="checkbox" checked={showSocial} onChange={e => setShowSocial(e.target.checked)} style={{ width: '20px', height: '20px' }} /> Ativar Card de Redes Sociais
                        </label>
                        
                        {showSocial && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Rede Social</label>
                                <select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)}>
                                  <option value="instagram">Instagram</option>
                                  <option value="twitter">Twitter / X</option>
                                  <option value="facebook">Facebook</option>
                                  <option value="tiktok">TikTok</option>
                                  <option value="youtube">YouTube</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Seu @ (Handle ou link)</label>
                                <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="@sua_empresa" />
                              </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>Posição do Card Social</label>
                                <select value={socialPosition} onChange={e => setSocialPosition(e.target.value)}>
                                  <option value="bottom-right">Canto Inferior Direito</option>
                                  <option value="bottom-left">Canto Inferior Esquerdo</option>
                                  <option value="top-right">Canto Superior Direito</option>
                                  <option value="top-left">Canto Superior Esquerdo</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                                  <input type="checkbox" checked={socialQrcode} onChange={e => setSocialQrcode(e.target.checked)} /> 
                                  Exibir QR Code da Rede
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--text-muted)' }}>Mídias Selecionadas ({selectedItems.length})</h4>
                    <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '700' }}>Tempo Total: {totalDuration}s</span>
                  </div>
                  {selectedItems.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '12px', border: '2px dashed var(--border)' }}>
                      Nenhuma mídia selecionada. Escolha na biblioteca ao lado.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedItems.map((item, idx) => (
                        <div key={`${item.media_id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                            <button onClick={() => moveDown(idx)} disabled={idx === selectedItems.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: idx === selectedItems.length - 1 ? 0.3 : 1 }}>▼</button>
                          </div>
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#000', position: 'relative' }}>
                            {item.media?.type === 'image' ? <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>VIDEO</div>}
                            <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', padding: '2px 4px' }}>{item.media?.type === 'image' ? 'IMG' : 'VID'}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{item.media?.name}</p>
                          </div>
                          {item.media?.type !== 'video' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="number" value={item.duration} onChange={e => updateDuration(item.media_id, e.target.value)} style={{ width: '60px', textAlign: 'center', padding: '6px' }} />
                              <span style={{ fontSize: '0.75rem' }}>s</span>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                    {medias.map(m => (
                      <div key={m.id} onClick={() => toggleMedia(m)} style={{ 
                        cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', position: 'relative',
                        border: selectedItems.some(i => i.media_id === m.id) ? '3px solid var(--primary)' : '2px solid var(--border)',
                        transition: 'all 0.2s', height: '120px'
                      }}>
                        <div style={{ height: '80px', background: '#000' }}>
                          {m.type === 'image' ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem' }}>▶ Vídeo</div>}
                        </div>
                        <div style={{ padding: '6px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'rgba(255,255,255,0.05)' }}>
                          {m.name}
                        </div>
                        {selectedItems.some(i => i.media_id === m.id) && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
                        )}
                        <div style={{ position: 'absolute', bottom: '40px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 4px', borderRadius: '4px' }}>
                          {m.type === 'image' ? 'Imagem' : 'Vídeo'}
                        </div>
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
