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
  const [activeTab, setActiveTab] = useState('medias');
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
  
  // V3 - Visual Editor States
  const [themePremium, setThemePremium] = useState('minimalist');
  const [overlayStyle, setOverlayStyle] = useState('none');
  const [animationStyle, setAnimationStyle] = useState('fade');
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [selectedElement, setSelectedElement] = useState(null);
  const [medias, setMedias] = useState([]);
  const [clients, setClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Widget sizes
  const [clockSize, setClockSize] = useState(100);
  const [weatherSize, setWeatherSize] = useState(100);
  const [socialSize, setSocialSize] = useState(100);
  // Widget display timing (minutes, 0=always)
  const [clockInterval, setClockInterval] = useState(0);
  const [weatherInterval, setWeatherInterval] = useState(0);
  const [socialInterval, setSocialInterval] = useState(0);
  // Widget entrance effect
  const [clockEffect, setClockEffect] = useState('fade');
  const [weatherEffect, setWeatherEffect] = useState('fade');
  const [socialEffect, setSocialEffect] = useState('fade');
  const [clockStyle, setClockStyle] = useState('digital_transparent');
  // Ticker/Notícias state (moved here from separate tab)
  const [showTicker, setShowTicker] = useState(false);
  const [tickerInterval, setTickerInterval] = useState(0);
  const [tickerDuration, setTickerDuration] = useState(0);
  const [clockDuration, setClockDuration] = useState(0);
  const [weatherDuration, setWeatherDuration] = useState(0);
  const [socialDuration, setSocialDuration] = useState(0);
  const [clockX, setClockX] = useState(0);
  const [clockY, setClockY] = useState(0);
  const [weatherX, setWeatherX] = useState(0);
  const [weatherY, setWeatherY] = useState(0);
  const [socialX, setSocialX] = useState(0);
  const [socialY, setSocialY] = useState(0);
  const [useCustomPos, setUseCustomPos] = useState(false);
  const [dragging, setDragging] = useState(null);

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

          // V3 Visual Editor States
          setClockSize(p.clock_size || 100);
          setWeatherSize(p.weather_size || 100);
          setSocialSize(p.social_size || 100);
          setClockInterval(p.clock_interval || 0);
          setWeatherInterval(p.weather_interval || 0);
          setSocialInterval(p.social_interval || 0);
          setClockDuration(p.clock_duration || 0);
          setWeatherDuration(p.weather_duration || 0);
          setSocialDuration(p.social_duration || 0);
          setTickerInterval(p.ticker_interval || 0);
          setTickerDuration(p.ticker_duration || 0);
          setClockEffect(p.clock_effect || 'fade');
          setWeatherEffect(p.weather_effect || 'fade');
          setSocialEffect(p.social_effect || 'fade');
          setClockStyle(p.clock_style || 'digital_transparent');
          setClockX(p.clock_x || 0);
          setClockY(p.clock_y || 0);
          setWeatherX(p.weather_x || 0);
          setWeatherY(p.weather_y || 0);
          setSocialX(p.social_x || 0);
          setSocialY(p.social_y || 0);
          setUseCustomPos(p.use_custom_pos || false);
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do plano.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  const addMedia = (media) => {
    setSelectedItems(prev => [...prev, {
      media_id: media.id,
      media: media,
      duration: media.type === 'video' ? 0 : 10,
      transition: 'fade'
    }]);
  };

  const updateTransition = (idx, transition) => {
    setSelectedItems(prev => {
      const copy = [...prev];
      copy[idx].transition = transition;
      return copy;
    });
  };

  const updateDuration = (idx, duration) => {
    setSelectedItems(prev => {
      const copy = [...prev];
      copy[idx].duration = Math.max(1, parseInt(duration) || 1);
      return copy;
    });
  };

  const removeMedia = (idx) => {
    setSelectedItems(prev => {
      const copy = [...prev];
      copy.splice(idx, 1);
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
        clock_size: clockSize,
        weather_size: weatherSize,
        social_size: socialSize,
        clock_interval: clockInterval,
        weather_interval: weatherInterval,
        social_interval: socialInterval,
        clock_duration: clockDuration,
        weather_duration: weatherDuration,
        social_duration: socialDuration,
        ticker_interval: tickerInterval,
        ticker_duration: tickerDuration,
        clock_effect: clockEffect,
        weather_effect: weatherEffect,
        social_effect: socialEffect,
        clock_style: clockStyle,
        clock_x: Math.round(clockX), clock_y: Math.round(clockY), 
        weather_x: Math.round(weatherX), weather_y: Math.round(weatherY), 
        social_x: Math.round(socialX), social_y: Math.round(socialY), 
        use_custom_pos: useCustomPos,
        items: selectedItems.map((item, i) => ({
          media_id: item.media_id,
          duration_seconds: item.media?.type === 'video' ? 0 : (item.duration || 10),
          position: i,
          transition: item.transition || 'fade'
        }))
      };
      if (id && id !== 'new') {
        await api.put(`/playlists/${id}`, payload);
      } else {
        await api.post('/playlists', payload);
      }
      addToast('success', 'Sucesso', '✅ Plano salvo com sucesso!');
      if (id === 'new') navigate('/playlists');
    } catch (err) {
      console.error('Save error:', err.response?.data || err.message);
      addToast('error', 'Erro', err.response?.data?.error || 'Falha ao salvar o plano.');
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

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    setDragging({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialX: type === 'clock' ? clockX : type === 'weather' ? weatherX : socialX,
      initialY: type === 'clock' ? clockY : type === 'weather' ? weatherY : socialY,
    });
    setUseCustomPos(true);
    setSelectedElement(type);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / canvasZoom;
    const dy = (e.clientY - dragging.startY) / canvasZoom;

    if (dragging.type === 'clock') {
      setClockX(dragging.initialX + dx);
      setClockY(dragging.initialY + dy);
    } else if (dragging.type === 'weather') {
      setWeatherX(dragging.initialX + dx);
      setWeatherY(dragging.initialY + dy);
    } else if (dragging.type === 'social') {
      setSocialX(dragging.initialX + dx);
      setSocialY(dragging.initialY + dy);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };



  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', background: '#09090b', color: '#fff', margin: '-24px', overflow: 'hidden' }}>
      
      {/* HEADER TIPO FIGMA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 24px', background: '#18181b', borderBottom: '1px solid #27272a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/playlists" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
            <span style={{ fontSize: '1.2rem' }}>←</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span style={{ background: 'var(--primary)', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1px' }}>PRO EDITOR</span>
             <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Cena / Playlist" style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '700', outline: 'none', width: '300px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Salvamento Automático Ativado</span>
          <button className="btn btn-outline" style={{ background: '#27272a', borderColor: '#3f3f46', color: '#fff' }} onClick={() => navigate('/playlists')}>Descartar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)', border: 'none', boxShadow: '0 0 15px rgba(99,102,241,0.4)', padding: '8px 24px' }}>
            {saving ? 'Publicando...' : 'Publicar na TV 🚀'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        
        {/* LEFT SIDEBAR - TOOLS */}
        <div style={{ width: '80px', background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '16px', zIndex: 10 }}>
          {[
            { id: 'medias', icon: '🖼️', label: 'Mídias' },
            { id: 'themes', icon: '✨', label: 'Temas' },
            { id: 'widgets', icon: '🧩', label: 'Widgets' },
            { id: 'overlays', icon: '🌘', label: 'Efeitos' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedElement(null); }} style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', padding: '12px 0',
              background: activeTab === tab.id ? '#27272a' : 'transparent', border: 'none', color: activeTab === tab.id ? '#fff' : '#a1a1aa',
              cursor: 'pointer', transition: 'all 0.2s', borderLeft: activeTab === tab.id ? '3px solid #6366f1' : '3px solid transparent'
            }}>
              <span style={{ fontSize: '1.4rem', fontFamily: 'Outfit, sans-serif' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: '600', textTransform: 'uppercase' }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* SUB-SIDEBAR - TOOL OPTIONS */}
        <div style={{ width: '280px', background: '#121214', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', zIndex: 9, overflowY: 'auto' }}>
          
          {activeTab === 'themes' && (
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Temas Premium</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {['Corporate', 'Cyberpunk', 'Luxury Gold', 'Minimalist', 'Neon Vibrant', 'Fast Food', 'Supermercado'].map(t => (
                  <div key={t} onClick={() => setThemePremium(t)} style={{ 
                    padding: '16px', borderRadius: '12px', background: themePremium === t ? 'rgba(99,102,241,0.1)' : '#18181b', 
                    border: themePremium === t ? '1px solid #6366f1' : '1px solid #27272a', cursor: 'pointer',
                    boxShadow: themePremium === t ? '0 0 20px rgba(99,102,241,0.2)' : 'none', transition: 'all 0.2s'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '4px' }}>{t}</div>
                    <div style={{ fontSize: '0.7rem', color: '#71717a' }}>Aplica paleta, fontes e animações automáticas.</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'medias' && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Biblioteca Visual</h3>
              <input type="text" placeholder="Buscar mídias..." style={{ width: '100%', padding: '10px 14px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', marginBottom: '16px' }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', overflowY: 'auto' }}>
                {medias.map(m => (
                  <div key={m.id} onClick={() => addMedia(m)} style={{ 
                    position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'grab',
                    border: selectedItems.some(i => i.media_id === m.id) ? '2px solid #6366f1' : '1px solid #27272a',
                    aspectRatio: '16/9', background: '#000'
                  }}>
                    {m.type === 'image' ? <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '0.7rem', fontWeight: '800' }}>VÍDEO</div>}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 8px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', fontSize: '0.65rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'widgets' && (
            <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '16px' }}>Widgets Dinâmicos</h3>
              
              {/* Relógio */}
              <div style={{ marginBottom: '12px', padding: '14px', background: '#18181b', borderRadius: '12px', border: showClock ? '1px solid #6366f1' : '1px solid #27272a' }}>
                <div onClick={() => { setShowClock(!showClock); setSelectedElement('clock'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: showClock ? '12px' : '0' }}>
                  <span style={{ fontSize: '1.3rem' }}>⌚</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Relógio Digital</div>
                    <div style={{ fontSize: '0.68rem', color: '#71717a' }}>Vários estilos e fontes</div>
                  </div>
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: showClock ? '#6366f1' : '#3f3f46', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2px', left: showClock ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }}></div>
                  </div>
                </div>
                {showClock && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Estilo do Relógio:</label>
                      <select value={clockStyle} onChange={e => setClockStyle(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                        <option value="digital_transparent">Digital Transparente</option>
                        <option value="digital_glass">Digital Glass (Blur)</option>
                        <option value="digital_solid">Digital Sólido</option>
                        <option value="analog_modern">Analógico Minimalista</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Tamanho: {clockSize}%</label>
                      <input type="range" min="10" max="200" value={clockSize} onChange={e => setClockSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>A cada (min):</label>
                        <input type="number" value={clockInterval} onChange={e => setClockInterval(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Exibir por (min):</label>
                        <input type="number" value={clockDuration} onChange={e => setClockDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ticker / Notícias (Substitui Zonas) */}
              <div style={{ marginBottom: '12px', padding: '14px', background: '#18181b', borderRadius: '12px', border: layout !== 'fullscreen' ? '1px solid #6366f1' : '1px solid #27272a' }}>
                <div onClick={() => { setLayout(layout === 'fullscreen' ? 'with_footer' : 'fullscreen'); setSelectedElement('ticker'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: layout !== 'fullscreen' ? '12px' : '0' }}>
                  <span style={{ fontSize: '1.3rem' }}>📰</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Barra de Notícias / Ticker</div>
                    <div style={{ fontSize: '0.68rem', color: '#71717a' }}>Rodapé informativo</div>
                  </div>
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: layout !== 'fullscreen' ? '#6366f1' : '#3f3f46', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2px', left: layout !== 'fullscreen' ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }}></div>
                  </div>
                </div>
                {layout !== 'fullscreen' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Tipo de Exibição:</label>
                      <select value={layout} onChange={e => setLayout(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                        <option value="with_footer">Barra Fixa (Rodapé)</option>
                        <option value="floating">Aviso Flutuante (Overlay)</option>
                      </select>
                    </div>
                    <textarea value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Texto do ticker..." rows={2} style={{ width: '100%', padding: '8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', resize: 'none', fontSize: '0.8rem' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>A cada (min):</label>
                        <input type="number" value={tickerInterval} onChange={e => setTickerInterval(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Exibir por (min):</label>
                        <input type="number" value={tickerDuration} onChange={e => setTickerDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Clima */}
              <div style={{ marginBottom: '12px', padding: '14px', background: '#18181b', borderRadius: '12px', border: showWeather ? '1px solid #6366f1' : '1px solid #27272a' }}>
                <div onClick={() => { setShowWeather(!showWeather); setSelectedElement('weather'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: showWeather ? '12px' : '0' }}>
                  <span style={{ fontSize: '1.3rem' }}>⛅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Previsão do Tempo</div>
                    <div style={{ fontSize: '0.68rem', color: '#71717a' }}>Dados em tempo real</div>
                  </div>
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: showWeather ? '#6366f1' : '#3f3f46', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2px', left: showWeather ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }}></div>
                  </div>
                </div>
                {showWeather && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Tamanho: {weatherSize}%</label>
                      <input type="range" min="10" max="200" value={weatherSize} onChange={e => setWeatherSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>A cada (min):</label>
                        <input type="number" value={weatherInterval} onChange={e => setWeatherInterval(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Exibir por (min):</label>
                        <input type="number" value={weatherDuration} onChange={e => setWeatherDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Social */}
              <div style={{ marginBottom: '12px', padding: '14px', background: '#18181b', borderRadius: '12px', border: showSocial ? '1px solid #6366f1' : '1px solid #27272a' }}>
                <div onClick={() => { setShowSocial(!showSocial); setSelectedElement('social'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: showSocial ? '12px' : '0' }}>
                  <span style={{ fontSize: '1.3rem' }}>📱</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>Redes Sociais</div>
                    <div style={{ fontSize: '0.68rem', color: '#71717a' }}>Instagram, TikTok, etc</div>
                  </div>
                  <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: showSocial ? '#6366f1' : '#3f3f46', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2px', left: showSocial ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: '0.2s' }}></div>
                  </div>
                </div>
                {showSocial && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Tamanho: {socialSize}%</label>
                      <input type="range" min="10" max="200" value={socialSize} onChange={e => setSocialSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>A cada (min):</label>
                        <input type="number" value={socialInterval} onChange={e => setSocialInterval(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Exibir por (min):</label>
                        <input type="number" value={socialDuration} onChange={e => setSocialDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overlays' && (
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Efeitos Visuais</h3>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff', marginBottom: '12px', display: 'block' }}>Estilo de Overlay Global</label>
                <select value={overlayStyle} onChange={e => setOverlayStyle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                  <option value="none">Nenhum</option>
                  <option value="vignette">Vinheta Escura (Bordas)</option>
                  <option value="gradient">Gradiente Inferior Escuro</option>
                  <option value="noise">Textura de Ruído (Film)</option>
                  <option value="glass">Glassmorphism Blur</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff', marginBottom: '12px', display: 'block' }}>Transições Cinematográficas</label>
                <select value={transitionEffect} onChange={e => setTransitionEffect(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                  <option value="fade">Fade Suave</option>
                  <option value="slide">Slide Inteligente</option>
                  <option value="zoom">Zoom Parallax</option>
                  <option value="cinematic">Cinematic Blur Cross</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Textos / Rodapé</h3>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Fonte do Rodapé</label>
                <select value={footerFontFamily} onChange={e => setFooterFontFamily(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', marginBottom: '16px' }}>
                  <option value="Inter">Inter (Moderna)</option>
                  <option value="Outfit">Outfit (Geométrica)</option>
                  <option value="Roboto">Roboto (Clássica)</option>
                  <option value="Playfair Display">Playfair (Elegante)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Tamanho da Fonte (CSS)</label>
                <input type="text" value={footerFontSize} onChange={e => setFooterFontSize(e.target.value)} placeholder="Ex: 1.5rem ou 24px" style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', marginBottom: '16px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Cor do Texto</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input type="color" value={footerFontColor} onChange={e => setFooterFontColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
                  <input value={footerFontColor} onChange={e => setFooterFontColor(e.target.value)} style={{ flex: 1, padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'zones' && (
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Layout / Zonas</h3>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Estrutura da Tela</label>
                <select value={layout} onChange={e => setLayout(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', marginBottom: '16px' }}>
                  <option value="fullscreen">Tela Cheia (Sem Textos)</option>
                  <option value="with_footer">Com Barra Inferior (Fixa)</option>
                  <option value="floating">Aviso Flutuante (Sobre a Mídia)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Posição do Rodapé</label>
                <select value={footerPosition} onChange={e => setFooterPosition(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', marginBottom: '16px' }}>
                  <option value="bottom">Abaixo da Mídia</option>
                  <option value="top">Acima da Mídia</option>
                </select>
              </div>
            </div>
          )}

        </div>

        {/* CENTER CANVA - LIVE PREVIEW & TIMELINE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          
          {/* Toolbar Top Center */}
          <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', background: 'rgba(24,24,27,0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #27272a', zIndex: 5 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Orientação:</span>
              <button onClick={() => setOrientation('horizontal')} style={{ background: orientation === 'horizontal' ? '#3f3f46' : 'transparent', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>📺 HZ</button>
              <button onClick={() => setOrientation('portrait')} style={{ background: orientation === 'portrait' ? '#3f3f46' : 'transparent', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>📱 VT</button>
            </div>
            <div style={{ width: '1px', height: '20px', background: '#3f3f46' }}></div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Zoom:</span>
              <button onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.1))} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>-</button>
              <span style={{ fontSize: '0.75rem', width: '40px', textAlign: 'center' }}>{Math.round(canvasZoom * 100)}%</span>
              <button onClick={() => setCanvasZoom(z => Math.min(2, z + 0.1))} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>+</button>
            </div>
          </div>

          {/* Canvas Area */}
          <div 
            style={{ flex: 1, background: '#09090b', backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', backgroundSize: '30px 30px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '40px' }} 
            onClick={() => setSelectedElement(null)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
             <div style={{ 
               width: orientation === 'horizontal' ? '960px' : '540px',
               height: orientation === 'horizontal' ? '540px' : '960px',
               background: '#000', position: 'relative', overflow: 'hidden',
               boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px #27272a',
               transform: `scale(${canvasZoom})`, transformOrigin: 'center center',
               transition: 'width 0.3s, height 0.3s'
             }} onClick={e => e.stopPropagation()}>
                
                {/* Imagem de Fundo (Simulação do primeiro item) */}
                {selectedItems.length > 0 ? (
                  <img src={selectedItems[0].media?.url || ''} style={{ width: '100%', height: '100%', objectFit: scaleMode, opacity: 0.8 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '1.2rem', fontWeight: '800' }}>ARRASTE UMA MÍDIA PARA O FUNDO</div>
                )}

                {/* Overlays */}
                {overlayStyle === 'vignette' && <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 150px rgba(0,0,0,0.9)', pointerEvents: 'none' }}></div>}
                {overlayStyle === 'gradient' && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.8))', pointerEvents: 'none' }}></div>}

                {/* Clock Widget */}
                {showClock && (
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'clock')}
                    style={{ 
                    position: 'absolute', 
                    left: useCustomPos ? `${clockX}px` : (widgetPosition.split('-')[1] === 'right' ? 'auto' : widgetPosition.includes('center') ? '50%' : '40px'),
                    top: useCustomPos ? `${clockY}px` : (widgetPosition.split('-')[0] === 'bottom' ? 'auto' : '40px'),
                    right: !useCustomPos && widgetPosition.split('-')[1] === 'right' ? '40px' : 'auto',
                    bottom: !useCustomPos && widgetPosition.split('-')[0] === 'bottom' ? '40px' : 'auto',
                    transform: `${!useCustomPos && widgetPosition.includes('center') ? 'translateX(-50%) ' : ''}scale(${clockSize / 100})`,
                    transformOrigin: useCustomPos ? 'top left' : `${widgetPosition.split('-')[0]} ${widgetPosition.split('-')[1]}`,
                    background: `rgba(0,0,0,${cardTransparency})`, padding: '24px 36px', borderRadius: '24px', color: '#fff', backdropFilter: 'blur(20px)',
                    border: selectedElement === 'clock' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', cursor: 'move',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    userSelect: 'none'
                  }}>
                    <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, fontFamily: 'Outfit' }}>14:55</div>
                    <div style={{ fontSize: '1rem', opacity: 0.8, marginTop: '4px' }}>Segunda, 24 Out</div>
                  </div>
                )}

                {/* Social Widget */}
                {showSocial && (
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'social')}
                    style={{ 
                    position: 'absolute', 
                    left: useCustomPos ? `${socialX}px` : (socialPosition.split('-')[1] === 'right' ? 'auto' : socialPosition.includes('center') ? '50%' : '40px'),
                    top: useCustomPos ? `${socialY}px` : (socialPosition.split('-')[0] === 'bottom' ? 'auto' : '40px'),
                    right: !useCustomPos && socialPosition.split('-')[1] === 'right' ? '40px' : 'auto',
                    bottom: !useCustomPos && socialPosition.split('-')[0] === 'bottom' ? '40px' : 'auto',
                    transform: `${!useCustomPos && socialPosition.includes('center') ? 'translateX(-50%) ' : ''}scale(${socialSize / 100})`,
                    transformOrigin: useCustomPos ? 'top left' : `${socialPosition.split('-')[0]} ${socialPosition.split('-')[1]}`,
                    background: socialCardStyle === 'style2' ? '#fff' : socialCardStyle === 'style3' ? 'transparent' : `rgba(0,0,0,${cardTransparency})`, 
                    padding: '16px 24px', borderRadius: '20px', 
                    color: socialCardStyle === 'style2' ? '#000' : '#fff', 
                    backdropFilter: socialCardStyle === 'style3' ? 'none' : 'blur(20px)',
                    border: selectedElement === 'social' ? '2px solid #6366f1' : (socialCardStyle === 'style3' ? 'none' : '1px solid rgba(255,255,255,0.1)'), 
                    cursor: 'move', display: 'flex', alignItems: 'center', gap: '16px', 
                    boxShadow: socialCardStyle === 'style3' ? 'none' : '0 20px 40px rgba(0,0,0,0.4)',
                    userSelect: 'none'
                  }}>
                    {socialQrcode && <div style={{ width: '60px', height: '60px', background: socialCardStyle === 'style2' ? '#f4f4f5' : '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.6rem', fontWeight: '900' }}>QR</div>}
                    <div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Siga-nos no {socialPlatform}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '900', fontFamily: 'Outfit' }}>{socialHandle || '@instagram'}</div>
                    </div>
                  </div>
                )}

                {/* Weather Widget */}
                {showWeather && (
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'weather')}
                    style={{ 
                    position: 'absolute', 
                    left: useCustomPos ? `${weatherX}px` : '40px',
                    top: useCustomPos ? `${weatherY}px` : '40px',
                    transform: `scale(${weatherSize / 100})`, 
                    transformOrigin: 'top left',
                    background: `rgba(0,0,0,${cardTransparency})`, padding: '20px', borderRadius: '24px', color: '#fff', backdropFilter: 'blur(20px)',
                    border: selectedElement === 'weather' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', cursor: 'move',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '20px',
                    userSelect: 'none'
                  }}>
                    <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}>⛅</span>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1, fontFamily: 'Outfit' }}>24°C</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '4px' }}>Ensolarado</div>
                    </div>
                  </div>
                )}

                {/* Footer / Ticker */}
                {(layout === 'with_footer' || layout === 'floating') && (
                  <div onClick={() => setSelectedElement('ticker')} style={{ 
                    position: 'absolute', 
                    bottom: footerPosition === 'bottom' ? (layout === 'floating' ? '40px' : 0) : 'auto', 
                    top: footerPosition === 'top' ? (layout === 'floating' ? '40px' : 0) : 'auto', 
                    width: layout === 'floating' ? '90%' : '100%', 
                    left: layout === 'floating' ? '5%' : '0',
                    height: `${tickerHeight}px`,
                    borderRadius: layout === 'floating' ? '24px' : '0',
                    overflow: 'hidden',
                    background: `rgba(0,0,0,${footerOpacity})`, backdropFilter: tickerBlur ? 'blur(16px)' : 'none', border: layout === 'floating' ? '1px solid rgba(255,255,255,0.1)' : 'borderTop: 1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', zIndex: 20, boxShadow: layout === 'floating' ? '0 20px 40px rgba(0,0,0,0.5)' : 'none', cursor: 'pointer',
                    outline: selectedElement === 'ticker' ? '2px solid #6366f1' : 'none'
                  }}>
                    {tickerLabel && <div style={{ padding: '0 30px', background: themeColor, height: '100%', display: 'flex', alignItems: 'center', fontWeight: '900', fontSize: '1.2rem', color: '#fff' }}>{tickerLabel}</div>}
                    <div style={{ flex: 1, padding: '0 30px', fontSize: footerFontSize, color: footerFontColor, fontWeight: tickerFontWeight, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <div style={{ display: 'inline-block', animation: `marquee ${tickerSpeed === 'fast' ? '10s' : tickerSpeed === 'slow' ? '30s' : '20s'} linear infinite` }}>
                        {footerText || 'Aviso importante! Digite seu texto nas propriedades e ele irá rolar aqui...'}
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* TIMELINE ESTILO PREMIERE/EDITOR DE VÍDEO */}
          <div style={{ height: '220px', background: '#18181b', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa' }}>Timeline Visual</h3>
              <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '700' }}>{totalDuration} SEG TOTAL</span>
            </div>
            
            <div style={{ flex: 1, padding: '20px', display: 'flex', gap: '12px', overflowX: 'auto', alignItems: 'center' }}>
              {selectedItems.map((item, idx) => (
                <div key={`${item.media_id}-${idx}`} 
                     draggable 
                     onDragStart={(e) => e.dataTransfer.setData('text/plain', idx)} 
                     onDragOver={(e) => e.preventDefault()} 
                     onDrop={(e) => {
                       e.preventDefault();
                       const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                       if (isNaN(fromIdx)) return;
                       const newItems = [...selectedItems];
                       const [moved] = newItems.splice(fromIdx, 1);
                       newItems.splice(idx, 0, moved);
                       setSelectedItems(newItems);
                     }}
                     style={{ 
                  height: '100px', width: `${Math.max(120, item.duration * 15)}px`, minWidth: '120px',
                  background: '#27272a', borderRadius: '8px', overflow: 'hidden', position: 'relative',
                  border: '1px solid #3f3f46', flexShrink: 0, cursor: 'grab'
                }}>
                  {item.media?.type === 'image' ? <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} /> : <div style={{ height: '100%', background: '#111' }}></div>}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', background: 'rgba(0,0,0,0.8)', fontSize: '0.65rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.media?.name}
                  </div>
                    <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' }}>
                      <select 
                        value={item.transition || 'fade'} 
                        onChange={(e) => updateTransition(idx, e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.6rem', padding: '2px 4px' }}
                      >
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                        <option value="none">None</option>
                      </select>
                      {item.media?.type !== 'video' && (
                        <input 
                          type="number" 
                          min="1" 
                          value={item.duration} 
                          onChange={(e) => updateDuration(idx, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '40px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '4px', color: '#6366f1', fontSize: '0.65rem', fontWeight: '800', textAlign: 'center' }} 
                        />
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeMedia(idx); }} 
                        style={{ background: 'rgba(255,0,0,0.8)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer', padding: '2px 6px' }}>
                        X
                      </button>
                    </div>
                  {/* Pseudo-transição */}
                  {idx < selectedItems.length - 1 && (
                     <div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', width: '24px', height: '24px', background: '#3f3f46', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, fontSize: '0.5rem', border: '2px solid #18181b' }}>▶</div>
                  )}
                </div>
              ))}
              <div onClick={() => setActiveTab('medias')} style={{ height: '100px', width: '100px', border: '2px dashed #3f3f46', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a1a1aa', flexShrink: 0 }}>
                + Mídia
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - PROPERTIES */}
        <div style={{ width: '320px', background: '#18181b', borderLeft: '1px solid #27272a', display: 'flex', flexDirection: 'column', zIndex: 10, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', color: '#fff' }}>
              {selectedElement === 'clock' ? '⌚ Propriedades: Relógio' :
               selectedElement === 'weather' ? '⛅ Propriedades: Clima' :
               selectedElement === 'social' ? '📱 Propriedades: Social' :
               selectedElement === 'ticker' ? '📰 Propriedades: Notícias' :
               '⚙️ Config. da Cena'}
            </h3>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {!selectedElement && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Empresa / Cliente</label>
                  <select value={clientId} onChange={e => { setClientId(e.target.value); setGroupId(''); }} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="">— Selecionar Empresa —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {groups.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>ou Grupo de Clientes</label>
                    <select value={groupId} onChange={e => { setGroupId(e.target.value); if (e.target.value) setClientId(''); }} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                      <option value="">— Selecionar Grupo —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}
                
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Cor da Marca (Global)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
                    <input value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ flex: 1, padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Ajuste de Tela</label>
                  <select value={scaleMode} onChange={e => setScaleMode(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="cover">Preencher Corte (Cover)</option>
                    <option value="contain">Ajustar Inteiro (Contain)</option>
                    <option value="blur-fill">Fundo Blur Inteligente</option>
                  </select>
                </div>
              </>
            )}

            {selectedElement === 'clock' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Posição na Tela</label>
                  <select value={widgetPosition} onChange={e => setWidgetPosition(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="top-right">Superior Direito</option>
                    <option value="top-left">Superior Esquerdo</option>
                    <option value="bottom-right">Inferior Direito</option>
                    <option value="top-center">Centro Topo</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Efeito Glassmorphism (Blur)</label>
                  <input type="range" min="0" max="1" step="0.1" value={cardTransparency} onChange={e => setCardTransparency(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>Tamanho: {clockSize}%</label>
                  <input type="range" min="10" max="200" value={clockSize} onChange={e => setClockSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                </div>
                {useCustomPos && (
                  <button onClick={() => setUseCustomPos(false)} style={{ padding: '8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>
                    🔄 Resetar para Posição Automática
                  </button>
                )}
              </>
            )}

            {selectedElement === 'weather' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Transparência do Card</label>
                  <input type="range" min="0" max="1" step="0.1" value={cardTransparency} onChange={e => setCardTransparency(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>Tamanho: {weatherSize}%</label>
                  <input type="range" min="10" max="200" value={weatherSize} onChange={e => setWeatherSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                </div>
                {useCustomPos && (
                  <button onClick={() => setUseCustomPos(false)} style={{ padding: '8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>
                    🔄 Resetar para Posição Automática
                  </button>
                )}
              </>
            )}

            {selectedElement === 'social' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Plataforma</label>
                  <select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Estilo do Card</label>
                  <select value={socialCardStyle} onChange={e => setSocialCardStyle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="style1">Escuro Glassmorphism</option>
                    <option value="style2">Claro Opaco</option>
                    <option value="style3">Minimalista (Sem Fundo)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Posição na Tela</label>
                  <select value={socialPosition} onChange={e => setSocialPosition(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="bottom-right">Inferior Direito</option>
                    <option value="bottom-left">Inferior Esquerdo</option>
                    <option value="top-right">Superior Direito</option>
                    <option value="top-left">Superior Esquerdo</option>
                    <option value="bottom-center">Inferior Centro</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>@ Usuário</label>
                  <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={socialQrcode} onChange={e => setSocialQrcode(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  Gerar QR Code Automático
                </label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>Tamanho: {socialSize}%</label>
                  <input type="range" min="10" max="200" value={socialSize} onChange={e => setSocialSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>A cada (min):</label>
                    <input type="number" value={socialInterval} onChange={e => setSocialInterval(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Exibir por (min):</label>
                    <input type="number" value={socialDuration} onChange={e => setSocialDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                </div>
                {useCustomPos && (
                  <button onClick={() => setUseCustomPos(false)} style={{ padding: '8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', marginTop: '12px' }}>
                    🔄 Resetar para Posição Automática
                  </button>
                )}
              </>
            )}

            {selectedElement === 'ticker' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Título da Barra</label>
                  <input value={tickerLabel} onChange={e => setTickerLabel(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Texto Principal</label>
                  <textarea value={footerText} onChange={e => setFooterText(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', resize: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Velocidade (Animação)</label>
                  <select value={tickerSpeed} onChange={e => setTickerSpeed(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="slow">Lento (Suave)</option>
                    <option value="medium">Normal</option>
                    <option value="fast">Rápido (Breaking News)</option>
                  </select>
                </div>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default PlaylistEditor;
