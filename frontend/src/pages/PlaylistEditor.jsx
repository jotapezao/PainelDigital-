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

  const applyPreset = (preset) => {
    switch(preset) {
      case 'cinema':
        setLayout('fullscreen'); setFooterPosition('bottom'); setTickerHeight(80); setWidgetPosition('top-right'); setLogoPosition('bottom-right');
        break;
      case 'corporate':
        setLayout('with_footer'); setFooterPosition('top'); setTickerHeight(100); setWidgetPosition('bottom-left'); setLogoPosition('top-right');
        break;
      case 'minimal':
        setLayout('fullscreen'); setFooterText(''); setRssUrl(''); setWidgetPosition('top-right'); setShowClock(true); setShowWeather(false); setShowProgressBar(false);
        break;
      case 'news':
        setLayout('with_footer'); setFooterPosition('bottom'); setTickerHeight(120); setTickerSpeed('fast'); setTickerFontWeight('800');
        break;
      case 'social':
        setLayout('fullscreen'); setShowSocial(true); setSocialPosition('bottom-center'); setSocialCardStyle('style3');
        break;
    }
    addToast('info', 'Preset Aplicado', `Configurações do modo ${preset} aplicadas.`);
  };

  if (loading) return <div className="loading-screen">Sincronizando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header Fixo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <Link to="/playlists" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Planos
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '🎬 Novo Plano' : `✏️ ${name}`}</h2>
             <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--bg-input)', borderRadius: '20px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                ID: {id === 'new' ? 'Rascunho' : id}
             </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/playlists')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px 32px', boxShadow: '0 10px 20px -5px rgba(99,102,241,0.4)' }}>
            {saving ? 'Processando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        {/* Sidebar de Navegação */}
        <div className="card" style={{ width: '280px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, background: 'linear-gradient(180deg, var(--bg-card), rgba(30,41,59,0.5))' }}>
          {[
            { id: 'info', label: '📋 Config. Base', desc: 'Identidade do plano' },
            { id: 'medias', label: '🖼️ Playlist de Mídia', desc: `${selectedItems.length} itens na fila` },
            { id: 'layout', label: '🎨 Design & Widgets', desc: 'Personalização visual' },
            { id: 'presets', label: '🚀 Presets Rápidos', desc: 'Layouts prontos' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                textAlign: 'left', padding: '14px 18px', borderRadius: '14px', 
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                border: 'none', color: activeTab === tab.id ? '#fff' : 'var(--text-muted)', 
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', flexDirection: 'column', gap: '4px',
                boxShadow: activeTab === tab.id ? '0 8px 15px -3px rgba(99,102,241,0.4)' : 'none',
                transform: activeTab === tab.id ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <span style={{ fontWeight: '700', fontSize: '0.9375rem' }}>{tab.label}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{tab.desc}</span>
            </button>
          ))}
          
          <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>RESUMO TÉCNICO</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8125rem', opacity: 0.6 }}>Total Mídias:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: '700' }}>{selectedItems.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', opacity: 0.6 }}>Tempo Ciclo:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--primary)' }}>{totalDuration}s</span>
            </div>
            <div style={{ marginTop: '16px', height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
               <div style={{ width: `${Math.min(100, selectedItems.length * 10)}%`, height: '100%', background: 'var(--primary)' }}></div>
            </div>
          </div>
        </div>

        {/* Área de Conteúdo Scrollable */}
        <div className="card" style={{ flex: 1, overflowY: 'auto', padding: '32px', position: 'relative', background: 'var(--bg-card)' }}>
          {activeTab === 'info' && (
            <div className="animate-fade-in" style={{ maxWidth: '800px' }}>
               <h3 style={{ marginBottom: '32px', fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '8px', height: '32px', background: 'var(--primary)', borderRadius: '4px' }}></span>
                  Configurações do Plano
               </h3>
               
               <div className="input-group">
                 <label>Nome Identificador do Plano *</label>
                 <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: TV Recepção - Matinal" style={{ fontSize: '1.125rem', padding: '16px' }} />
               </div>

               {user?.role === 'admin' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  <div className="input-group">
                    <label>Empresa Vinculada</label>
                    <select value={clientId} onChange={e => { setClientId(e.target.value); if (e.target.value) setGroupId(''); }}>
                      <option value="">— Selecionar Empresa —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Grupo (Multi-empresa)</label>
                    <select value={groupId} onChange={e => { setGroupId(e.target.value); if (e.target.value) setClientId(''); }}>
                      <option value="">— Sem Grupo —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>🏢 {g.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>Notas Internas</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Descreva o propósito deste plano..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', background: 'var(--bg-input)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Orientação Nativa</label>
                  <select value={orientation} onChange={e => setOrientation(e.target.value)}>
                    <option value="horizontal">📺 Horizontal</option>
                    <option value="portrait">📱 Vertical</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Ajuste de Mídia</label>
                  <select value={scaleMode} onChange={e => setScaleMode(e.target.value)}>
                    <option value="cover">Preencher</option>
                    <option value="contain">Ajustar (Bordas)</option>
                    <option value="blur-fill">Blur Fill</option>
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Rotação de Software</label>
                  <select value={rotation} onChange={e => setRotation(e.target.value)}>
                    <option value="0">0° (Padrão)</option>
                    <option value="90">90° (Direita)</option>
                    <option value="270">270° (Esquerda)</option>
                    <option value="180">180° (Invertido)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medias' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', flex: 1, minHeight: 0 }}>
                {/* Lista de Selecionados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Fila de Exibição</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', padding: '6px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: '20px' }}>
                       ⏱️ Ciclo Total: {totalDuration}s
                    </div>
                  </div>
                  
                  {selectedItems.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', borderRadius: '24px', border: '2px dashed var(--border)', color: 'var(--text-dim)', gap: '16px' }}>
                      <span style={{ fontSize: '3rem' }}>📁</span>
                      <span>Selecione mídias na biblioteca para começar</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                      {selectedItems.map((item, idx) => (
                        <div key={`${item.media_id}-${idx}`} className="item-row" style={{ 
                          display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', 
                          borderRadius: '18px', border: '1px solid var(--border)', transition: 'all 0.2s'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ width: '32px', height: '32px', background: 'var(--bg-input)', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: idx === 0 ? 0.2 : 1, color: '#fff' }}>▲</button>
                            <button onClick={() => moveDown(idx)} disabled={idx === selectedItems.length - 1} style={{ width: '32px', height: '32px', background: 'var(--bg-input)', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: idx === selectedItems.length - 1 ? 0.2 : 1, color: '#fff' }}>▼</button>
                          </div>
                          
                          <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', background: '#000', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>
                            {item.media?.type === 'image' ? <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', fontSize: '10px', color: 'var(--primary)' }}>VÍDEO</div>}
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '800', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{item.media?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.media?.type === 'video' ? '📺 Reprodução de vídeo' : `🖼️ Imagem estática`}</div>
                          </div>
                          
                          {item.media?.type !== 'video' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                               <input type="number" value={item.duration} onChange={e => updateDuration(item.media_id, e.target.value)} style={{ width: '50px', background: 'none', border: 'none', textAlign: 'center', fontWeight: '800', color: 'var(--primary)', fontSize: '1rem' }} />
                               <span style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.5 }}>SEG</span>
                            </div>
                          )}
                          
                          <button onClick={() => toggleMedia(item.media)} style={{ width: '40px', height: '40px', color: 'var(--error)', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Biblioteca Lateral */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Biblioteca</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', overflowY: 'auto', paddingRight: '8px' }}>
                    {medias.map(m => (
                      <div key={m.id} onClick={() => toggleMedia(m)} style={{ 
                        borderRadius: '18px', overflow: 'hidden', border: selectedItems.some(i => i.media_id === m.id) ? '3px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer', transition: 'all 0.3s', position: 'relative', height: '140px', background: 'var(--bg-input)'
                      }}>
                        <div style={{ height: '100px', background: '#000' }}>
                           {m.type === 'image' ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '800' }}>VÍDEO</div>}
                        </div>
                        <div style={{ padding: '10px', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </div>
                        {selectedItems.some(i => i.media_id === m.id) && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '48px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                  {/* Seção 1: Notícias */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>📰 Feed de Notícias</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="input-group">
                        <label>Fonte RSS Automática (URL)</label>
                        <input value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="Ex: https://g1.globo.com/rss/g1/" />
                      </div>
                      <div className="input-group">
                        <label>Texto Manual (Fixo)</label>
                        <input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Ou digite o texto aqui..." />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '10px' }}>
                       <div className="input-group">
                        <label>Modo de Camada</label>
                        <select value={layout} onChange={e => setLayout(e.target.value)}>
                          <option value="fullscreen">Sobreposto (Overlay)</option>
                          <option value="with_footer">Margem Reservada</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Etiqueta (Label)</label>
                        <input value={tickerLabel} onChange={e => setTickerLabel(e.target.value)} placeholder="NOTÍCIAS" />
                      </div>
                      <div className="input-group">
                        <label>Posição Vertical</label>
                        <select value={footerPosition} onChange={e => setFooterPosition(e.target.value)}>
                          <option value="bottom">Rodapé</option>
                          <option value="top">Topo da Tela</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Seção 2: Widgets de Utilidades */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>⌚ Utilidades & Widgets</h4>
                    <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                       <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: '700' }}>
                          <input type="checkbox" checked={showClock} onChange={e => setShowClock(e.target.checked)} /> Exibir Relógio
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: '700' }}>
                          <input type="checkbox" checked={showWeather} onChange={e => setShowWeather(e.target.checked)} /> Exibir Clima (Previsão)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: '700' }}>
                          <input type="checkbox" checked={showProgressBar} onChange={e => setShowProgressBar(e.target.checked)} /> Barra de Progresso
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Posição dos Widgets</label>
                          <select value={widgetPosition} onChange={e => setWidgetPosition(e.target.value)}>
                            <option value="top-right">Canto Superior Direito</option>
                            <option value="top-left">Canto Superior Esquerdo</option>
                            <option value="bottom-right">Canto Inferior Direito</option>
                            <option value="bottom-left">Canto Inferior Esquerdo</option>
                            <option value="top-center">Superior Centralizado</option>
                          </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Transparência Geral (Cards)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input type="range" min="0" max="1" step="0.1" value={cardTransparency} onChange={e => setCardTransparency(e.target.value)} style={{ flex: 1 }} />
                            <span style={{ fontWeight: '800', color: 'var(--primary)', width: '40px' }}>{Math.round(cardTransparency * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Seção 3: Redes Sociais & QR Code */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>🤳 Redes Sociais & Conexão</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: '800', padding: '12px 20px', background: showSocial ? 'var(--primary)' : 'var(--bg-input)', borderRadius: '12px', transition: 'all 0.3s' }}>
                            <input type="checkbox" checked={showSocial} onChange={e => setShowSocial(e.target.checked)} /> {showSocial ? 'Card Social Ativo' : 'Ativar Card Social'}
                         </label>
                         {showSocial && (
                           <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: '700' }}>
                             <input type="checkbox" checked={socialQrcode} onChange={e => setSocialQrcode(e.target.checked)} /> Gerar QR Code Automático
                           </label>
                         )}
                      </div>

                      {showSocial && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: 'var(--bg-input)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                          <div className="input-group">
                            <label>Plataforma</label>
                            <select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)}>
                              <option value="instagram">Instagram</option>
                              <option value="facebook">Facebook</option>
                              <option value="youtube">YouTube</option>
                              <option value="twitter">X (Twitter)</option>
                              <option value="website">🌐 Website Próprio</option>
                            </select>
                          </div>
                          <div className="input-group">
                            <label>Link ou @Usuário</label>
                            <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="@seu_perfil ou https://..." />
                          </div>
                          <div className="input-group">
                            <label>Posição do Card</label>
                            <select value={socialPosition} onChange={e => setSocialPosition(e.target.value)}>
                              <option value="bottom-right">Inferior Direito</option>
                              <option value="bottom-left">Inferior Esquerdo</option>
                              <option value="bottom-center">Inferior Central</option>
                              <option value="top-center">Superior Central</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Seção 4: Marca & Estilo */}
                  <section>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>✨ Identidade Visual</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div className="input-group">
                        <label>Cor do Tema (Identidade)</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '70px', height: '54px', padding: '6px', cursor: 'pointer' }} />
                          <input value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ flex: 1, fontSize: '1.1rem', fontWeight: '700' }} />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>URL da Logomarca</label>
                        <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://link-da-sua-logo.png" />
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '10px' }}>
                       <div className="input-group">
                        <label>Posição da Logo</label>
                        <select value={logoPosition} onChange={e => setLogoPosition(e.target.value)}>
                          <option value="bottom-right">Inferior Direito</option>
                          <option value="bottom-left">Inferior Esquerdo</option>
                          <option value="top-right">Superior Direito</option>
                          <option value="top-left">Superior Esquerdo</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Tamanho da Logo (px)</label>
                        <input type="number" value={logoSizePx} onChange={e => setLogoSizePx(e.target.value)} />
                      </div>
                      <div className="input-group">
                        <label>Opacidade Logo</label>
                        <input type="range" min="0.1" max="1" step="0.1" value={logoOpacity} onChange={e => setLogoOpacity(e.target.value)} />
                      </div>
                    </div>
                  </section>
               </div>

               {/* Preview Panel Sticky */}
               <div style={{ position: 'sticky', top: '0' }}>
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <h4 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>👁️ Visualização em Tempo Real</h4>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #22c55e' }}></span>
                        <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '800' }}>LIVE PREVIEW</span>
                     </div>
                  </div>
                  
                  <div style={{ 
                    width: '100%', 
                    height: orientation === 'horizontal' ? '220px' : '440px',
                    perspective: '1000px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ 
                      width: orientation === 'horizontal' ? '100%' : '248px',
                      height: orientation === 'horizontal' ? '100%' : '100%',
                      background: '#000', borderRadius: '20px', overflow: 'hidden', position: 'relative',
                      boxShadow: '0 30px 60px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.05)',
                      transform: `rotate(${rotation}deg)`, transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                      {/* Mock Content */}
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #0f172a, #1e293b)' }}>
                         <span style={{ fontSize: '1rem', fontWeight: '900', opacity: 0.1, letterSpacing: '5px' }}>CONTEÚDO</span>
                      </div>

                      {/* Logo Mock */}
                      {logoUrl && (
                        <img src={logoUrl} style={{ position: 'absolute', [logoPosition.split('-')[0]]: '12px', [logoPosition.split('-')[1]]: '12px', width: `${logoSizePx / 4}px`, opacity: logoOpacity, zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                      )}

                      {/* Widgets Mock */}
                      {(showClock || showWeather) && (
                        <div style={{
                          position: 'absolute', [widgetPosition.split('-')[0]]: '12px', [widgetPosition.split('-')[1]]: widgetPosition.includes('center') ? '50%' : '12px',
                          transform: widgetPosition.includes('center') ? 'translateX(-50%)' : 'none',
                          background: `rgba(0,0,0,${cardTransparency})`, padding: '8px 14px', borderRadius: '12px', color: '#fff', fontSize: '0.6rem', zIndex: 10,
                          backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {showClock && <div style={{ fontWeight: '900', textAlign: 'center' }}>14:55</div>}
                          {showWeather && <div style={{ textAlign: 'center' }}>⛅ 28°C</div>}
                        </div>
                      )}

                      {/* Social Mock */}
                      {showSocial && (
                        <div style={{
                          position: 'absolute', [socialPosition.split('-')[0]]: '12px', [socialPosition.split('-')[1]]: socialPosition.includes('center') ? '50%' : '12px',
                          transform: socialPosition.includes('center') ? 'translateX(-50%)' : 'none',
                          background: `rgba(0,0,0,${cardTransparency})`, padding: '8px 12px', borderRadius: '12px', color: '#fff', fontSize: '0.55rem', zIndex: 10,
                          backdropFilter: 'blur(5px)', border: `1px solid ${themeColor}44`, display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                          {socialQrcode && <div style={{ width: '24px', height: '24px', background: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '6px' }}>QR</div>}
                          <span style={{ fontWeight: '700' }}>{socialHandle || '@perfil'}</span>
                        </div>
                      )}

                      {/* Ticker Mock */}
                      {(footerText || rssUrl || layout === 'with_footer') && (
                        <div style={{
                          position: 'absolute', [footerPosition === 'top' ? 'top' : 'bottom']: 0,
                          width: '100%', height: `${tickerHeight / 4}px`, background: themeColor, opacity: footerOpacity,
                          display: 'flex', alignItems: 'center', padding: '0 12px', zIndex: 20,
                          boxShadow: footerPosition === 'top' ? '0 5px 15px rgba(0,0,0,0.3)' : '0 -5px 15px rgba(0,0,0,0.3)'
                        }}>
                          <span style={{ fontSize: '0.5rem', fontWeight: '900', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', marginRight: '10px' }}>{tickerLabel}</span>
                          <span style={{ fontSize: '0.6rem', color: footerFontColor, whiteSpace: 'nowrap', fontWeight: '600' }}>{footerText || 'As notícias aparecerão aqui em movimento...'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '32px', padding: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(99,102,241,0.01))', borderRadius: '18px', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <p style={{ marginBottom: '10px', fontWeight: '800', color: 'var(--primary)', fontSize: '0.9rem' }}>💡 Sugestão de Layout</p>
                    <p style={{ opacity: 0.7, fontSize: '0.8rem', lineHeight: '1.5' }}>Para telas verticais em vitrines, use o modo **Vertical (9:16)** com o rodapé na posição **Topo** para melhor visibilidade dos pedestres.</p>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="animate-fade-in">
               <h3 style={{ marginBottom: '32px', fontSize: '1.5rem', fontWeight: '800' }}>Presets Profissionais</h3>
               <p style={{ marginBottom: '32px', color: 'var(--text-muted)' }}>Escolha um layout pré-configurado para economizar tempo. Você ainda poderá ajustar cada detalhe depois.</p>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {[
                    { id: 'cinema', label: '🎬 Modo Cinema', icon: '🍿', desc: 'Fullscreen com ticker discreto embaixo. Ideal para vídeos promocionais.' },
                    { id: 'corporate', label: '🏢 Corporativo', icon: '📈', desc: 'Ticker no topo com widgets informativos no rodapé. Ideal para recepções.' },
                    { id: 'news', label: '🔴 Breaking News', icon: '📺', desc: 'Ticker grande e rápido com cores vibrantes para avisos urgentes.' },
                    { id: 'minimal', label: '✨ Minimalista', icon: '💎', desc: 'Sem ticker. Apenas relógio e logo. Foco total na imagem.' },
                    { id: 'social', label: '🤳 Social Media', icon: '📸', desc: 'Destaque para o QR Code e redes sociais. Ideal para engajamento.' },
                  ].map(p => (
                    <div key={p.id} className="card" onClick={() => applyPreset(p.id)} style={{ 
                      padding: '24px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.3s',
                      background: 'rgba(255,255,255,0.02)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{p.icon}</div>
                      <h4 style={{ fontWeight: '800', marginBottom: '8px', fontSize: '1.1rem' }}>{p.label}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{p.desc}</p>
                      <button className="btn btn-outline" style={{ marginTop: '20px', width: '100%', fontSize: '0.8rem' }}>Aplicar este Modo</button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistEditor;


export default PlaylistEditor;
