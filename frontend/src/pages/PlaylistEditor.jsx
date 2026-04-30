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
  const [groupId, setGroupId] = useState('');
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
  const [socialCardStyle, setSocialCardStyle] = useState('style1');
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [rotation, setRotation] = useState(0);
  
  // V2 — Logo persistente e estilos de feed
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPosition, setLogoPosition] = useState('bottom-right');
  const [logoSizePx, setLogoSizePx] = useState(80);
  const [logoOpacity, setLogoOpacity] = useState(0.85);
  const [newsStyle, setNewsStyle] = useState('ticker-classic');
  
  const [medias, setMedias] = useState([]);
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mediasRes, clientsRes, groupsRes] = await Promise.all([
          api.get('/medias'),
          user?.role === 'admin' ? api.get('/clients') : Promise.resolve({ data: [] }),
          user?.role === 'admin' ? api.get('/client-groups') : Promise.resolve({ data: [] })
        ]);
        setMedias(mediasRes.data);
        setClients(clientsRes.data);
        setGroups(groupsRes.data);

        if (id && id !== 'new') {
          const playlistRes = await api.get(`/playlists/${id}`);
          const p = playlistRes.data;
          setName(p.name || '');
          setDescription(p.description || '');
          setClientId(p.client_id || '');
          setGroupId(p.group_id || '');
          setRotation(p.rotation || 0);

          // Normalizar itens: transformar o formato "flat" do backend no formato "nested" esperado pelo editor
          const normalizedItems = (p.items || []).map(item => ({
            ...item,
            duration: item.duration_seconds,
            media: item.media || {
              id: item.media_id,
              name: item.media_name,
              type: item.media_type,
              url: item.url,
              filename: item.media_filename
            }
          }));
          setSelectedItems(normalizedItems);
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
          setSocialCardStyle(p.social_card_style || 'style1');
          setShowProgressBar(p.show_progress_bar !== false);
          // V2 fields
          setLogoUrl(p.logo_url || '');
          setLogoPosition(p.logo_position || 'bottom-right');
          setLogoSizePx(p.logo_size_px || 80);
          setLogoOpacity(p.logo_opacity !== undefined ? parseFloat(p.logo_opacity) : 0.85);
          setNewsStyle(p.news_style || 'ticker-classic');
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
        name, description, client_id: clientId || null, group_id: groupId || null, layout,
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
        social_card_style: socialCardStyle,
        show_progress_bar: showProgressBar,
        rotation: parseInt(rotation) || 0,
        // V2
        logo_url: logoUrl || null,
        logo_position: logoPosition,
        logo_size_px: parseInt(logoSizePx) || 80,
        logo_opacity: parseFloat(logoOpacity) || 0.85,
        news_style: newsStyle,
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
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header Fixo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <Link to="/playlists" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Planos
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '🎬 Criar Novo Plano' : `✏️ Editando: ${name}`}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/playlists')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px 32px' }}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        {/* Sidebar de Navegação */}
        <div className="card" style={{ width: '280px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          {[
            { id: 'info', label: '📋 Informações Gerais', desc: 'Nome, cliente e grupo' },
            { id: 'medias', label: '🖼️ Seleção de Mídias', desc: `${selectedItems.length} itens selecionados` },
            { id: 'layout', label: '🎨 Visual e Layout', desc: 'Cores, ticker e widgets' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                textAlign: 'left', padding: '16px', borderRadius: '12px', background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                border: 'none', color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: '4px'
              }}
            >
              <span style={{ fontWeight: '700', fontSize: '0.9375rem' }}>{tab.label}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{tab.desc}</span>
            </button>
          ))}
          
          <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px' }}>RESUMO DA PLAYLIST</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8125rem' }}>Mídias:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>{selectedItems.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem' }}>Duração:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--primary)' }}>{totalDuration}s</span>
            </div>
          </div>
        </div>

        {/* Área de Conteúdo Scrollable */}
        <div className="card" style={{ flex: 1, overflowY: 'auto', padding: '32px', position: 'relative' }}>
          {activeTab === 'info' && (
            <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
               <h3 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: '700' }}>Informações do Plano</h3>
               
               <div className="input-group">
                 <label>Nome do Plano de Exibição *</label>
                 <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Menu Digital Almoço" style={{ fontSize: '1.1rem' }} />
               </div>

               {user?.role === 'admin' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="input-group">
                    <label>Vincular à Empresa</label>
                    <select value={clientId} onChange={e => { setClientId(e.target.value); if (e.target.value) setGroupId(''); }}>
                      <option value="">— Selecione —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Ou Vincular ao Grupo</label>
                    <select value={groupId} onChange={e => { setGroupId(e.target.value); if (e.target.value) setClientId(''); }}>
                      <option value="">— Sem Grupo —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>🏢 {g.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>Descrição Opcional</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Notas sobre este plano..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>Orientação</label>
                  <select value={orientation} onChange={e => setOrientation(e.target.value)}>
                    <option value="horizontal">Horizontal</option>
                    <option value="portrait">Vertical</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Escala de Mídia</label>
                  <select value={scaleMode} onChange={e => setScaleMode(e.target.value)}>
                    <option value="cover">Preencher</option>
                    <option value="contain">Ajustar</option>
                    <option value="blur-fill">Blur Fill</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Girar Tela (TV de pé)</label>
                  <select value={rotation} onChange={e => setRotation(e.target.value)}>
                    <option value="0">0°</option>
                    <option value="90">90°</option>
                    <option value="270">270°</option>
                    <option value="180">180°</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medias' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', flex: 1, minHeight: 0 }}>
                {/* Lista de Selecionados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Itens na Fila ({selectedItems.length})</h3>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Ordene e defina o tempo</span>
                  </div>
                  
                  {selectedItems.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', borderRadius: '16px', border: '2px dashed var(--border)', color: 'var(--text-dim)' }}>
                      Nenhuma mídia selecionada. Escolha ao lado →
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '8px' }}>
                      {selectedItems.map((item, idx) => (
                        <div key={`${item.media_id}-${idx}`} style={{ 
                          display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-card)', 
                          borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.2 : 0.6 }}>▲</button>
                            <button onClick={() => moveDown(idx)} disabled={idx === selectedItems.length - 1} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', opacity: idx === selectedItems.length - 1 ? 0.2 : 0.6 }}>▼</button>
                          </div>
                          
                          <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                            {item.media?.type === 'image' ? <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', fontSize: '10px' }}>VÍDEO</div>}
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.media?.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{item.media?.type === 'video' ? 'Reprodução completa' : `Duração fixa`}</div>
                          </div>
                          
                          {item.media?.type !== 'video' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: '10px' }}>
                               <input type="number" value={item.duration} onChange={e => updateDuration(item.media_id, e.target.value)} style={{ width: '50px', background: 'none', border: 'none', textAlign: 'center', fontWeight: '700' }} />
                               <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>seg</span>
                            </div>
                          )}
                          
                          <button onClick={() => toggleMedia(item.media)} style={{ padding: '10px', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Biblioteca Lateral */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Biblioteca</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                    {medias.map(m => (
                      <div key={m.id} onClick={() => toggleMedia(m)} style={{ 
                        borderRadius: '16px', overflow: 'hidden', border: selectedItems.some(i => i.media_id === m.id) ? '3px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                      }}>
                        <div style={{ height: '100px', background: '#000' }}>
                           {m.type === 'image' ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem' }}>▶ VÍDEO</div>}
                        </div>
                        <div style={{ padding: '8px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--bg-card)' }}>
                          {m.name}
                        </div>
                        {selectedItems.some(i => i.media_id === m.id) && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {/* Seção 1: Notícias */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>📰 Feed de Notícias</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="input-group">
                        <label>Fonte RSS (URL)</label>
                        <input value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="Ex: https://g1.globo.com/rss/g1/" />
                      </div>
                      <div className="input-group">
                        <label>Texto Manual</label>
                        <input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Ou digite o texto aqui..." />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                       <div className="input-group">
                        <label>Estilo do Rodapé</label>
                        <select value={layout} onChange={e => setLayout(e.target.value)}>
                          <option value="fullscreen">Sobreposto (Overlay)</option>
                          <option value="with_footer">Reservado (Com Margem)</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Label</label>
                        <input value={tickerLabel} onChange={e => setTickerLabel(e.target.value)} placeholder="NOTÍCIAS" />
                      </div>
                      <div className="input-group">
                        <label>Posição</label>
                        <select value={footerPosition} onChange={e => setFooterPosition(e.target.value)}>
                          <option value="bottom">Rodapé</option>
                          <option value="top">Topo</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Seção 2: Identidade Visual */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🏷️ Identidade e Widgets</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="input-group">
                        <label>Cor do Tema</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '60px', height: '42px', padding: '4px' }} />
                          <input value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ flex: 1 }} />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Logo (URL)</label>
                        <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px', padding: '16px', background: 'var(--bg-input)', borderRadius: '12px' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showClock} onChange={e => setShowClock(e.target.checked)} /> Relógio
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showWeather} onChange={e => setShowWeather(e.target.checked)} /> Clima
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showSocial} onChange={e => setShowSocial(e.target.checked)} /> Redes Sociais
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showProgressBar} onChange={e => setShowProgressBar(e.target.checked)} /> Barra de Progresso
                      </label>
                    </div>
                  </section>

                  {/* Seção 3: Avançado */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>⚙️ Ajustes de Exibição</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div className="input-group">
                        <label>Velocidade Ticker</label>
                        <select value={tickerSpeed} onChange={e => setTickerSpeed(e.target.value)}>
                          <option value="slow">Lento</option>
                          <option value="medium">Médio</option>
                          <option value="fast">Rápido</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Altura do Ticker</label>
                        <input type="number" value={tickerHeight} onChange={e => setTickerHeight(e.target.value)} />
                      </div>
                      <div className="input-group">
                        <label>Transparência</label>
                        <input type="range" min="0.1" max="1" step="0.1" value={footerOpacity} onChange={e => setFooterOpacity(e.target.value)} />
                      </div>
                    </div>
                  </section>
               </div>

               {/* Preview Panel Sticky */}
               <div style={{ position: 'sticky', top: '0' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>👁️ Preview</h4>
                     <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>Tempo Real</span>
                  </div>
                  
                  <div style={{ 
                    width: '100%', height: orientation === 'horizontal' ? '214px' : '428px',
                    background: '#000', borderRadius: '16px', overflow: 'hidden', position: 'relative',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                    transform: `rotate(${rotation}deg)`, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {/* Mock Content */}
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                       <span style={{ fontSize: '1.5rem' }}>PLAYBACK</span>
                    </div>

                    {/* Logo Mock */}
                    {logoUrl && (
                      <img src={logoUrl} style={{ position: 'absolute', [logoPosition.split('-')[0]]: '10px', [logoPosition.split('-')[1]]: '10px', width: '40px', opacity: logoOpacity, zIndex: 10 }} />
                    )}

                    {/* Widgets Mock */}
                    {(showClock || showWeather) && (
                      <div style={{
                        position: 'absolute', [widgetPosition.split('-')[0]]: '10px', [widgetPosition.split('-')[1]]: '10px',
                        background: `rgba(0,0,0,${cardTransparency})`, padding: '6px 10px', borderRadius: '8px', color: '#fff', fontSize: '0.5rem', zIndex: 10
                      }}>
                        {showClock && <div style={{ fontWeight: '800' }}>12:45</div>}
                        {showWeather && <div>⛅ 24°C</div>}
                      </div>
                    )}

                    {/* Ticker Mock */}
                    {(footerText || rssUrl || layout === 'with_footer') && (
                      <div style={{
                        position: 'absolute', [footerPosition === 'top' ? 'top' : 'bottom']: 0,
                        width: '100%', height: `${tickerHeight / 4}px`, background: themeColor, opacity: footerOpacity,
                        display: 'flex', alignItems: 'center', padding: '0 8px', zIndex: 20
                      }}>
                        <span style={{ fontSize: '0.5rem', fontWeight: '800', background: 'rgba(0,0,0,0.2)', padding: '1px 4px', marginRight: '6px' }}>{tickerLabel}</span>
                        <span style={{ fontSize: '0.5rem', color: footerFontColor, whiteSpace: 'nowrap' }}>{footerText || 'Notícias aqui...'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.8125rem' }}>
                    <p style={{ marginBottom: '8px', fontWeight: '700' }}>💡 Dica de Edição</p>
                    <p style={{ opacity: 0.7, fontSize: '0.75rem' }}>Se a TV for instalada de pé, mude a orientação para Vertical e use o ajuste de rotação de 90° ou 270°.</p>
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
