import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const getWidgetBaseStyle = (style, transparency) => {
  const base = {
    padding: '24px 32px',
    borderRadius: '28px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    zIndex: 25,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  switch (style) {
    case 'minimalist':
      return { ...base, background: 'transparent', backdropFilter: 'none', border: 'none', boxShadow: 'none', padding: '10px', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)' };
    case 'light':
      return { ...base, background: `rgba(255,255,255,${0.85 + (transparency || 0) * 0.15})`, color: '#18181b', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.1)', backdropFilter: 'blur(20px)' };
    case 'glass_pro':
      return { ...base, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)', backdropFilter: 'blur(40px) saturate(180%)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' };
    case 'neon':
      return { ...base, border: '2px solid #22d3ee', boxShadow: '0 0 15px rgba(34,211,238,0.5), 0 0 45px rgba(34,211,238,0.2), inset 0 0 20px rgba(34,211,238,0.1)', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', borderRadius: '16px' };
    case 'border_classic':
      return { ...base, borderRadius: '6px', border: '3px solid rgba(255,255,255,0.9)', background: `rgba(0,0,0,${0.7 + (transparency || 0) * 0.3})`, padding: '20px 28px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
    default: // dark
      return { ...base, background: `rgba(0,0,0,${0.5 + (transparency || 0) * 0.4})`, backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' };
  }
};

// Preview visual para os estilos de card no editor
const CARD_STYLE_PREVIEWS = [
  { value: 'dark', label: 'Escuro', desc: 'Fundo escuro com blur', color: '#18181b', border: '1px solid #3f3f46', textColor: '#fff' },
  { value: 'light', label: 'Claro', desc: 'Fundo branco translúcido', color: '#f4f4f5', border: '1px solid #e4e4e7', textColor: '#18181b' },
  { value: 'minimalist', label: 'Sem fundo', desc: 'Texto direto na mídia', color: 'transparent', border: '2px dashed #52525b', textColor: '#a1a1aa' },
  { value: 'glass_pro', label: 'Glass Pro', desc: 'Vidro premium com blur', color: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.3)', textColor: '#c4b5fd' },
  { value: 'neon', label: 'Neon Glow', desc: 'Brilho neon ciano', color: '#0a0a0a', border: '2px solid #22d3ee', textColor: '#22d3ee' },
  { value: 'border_classic', label: 'Moldura', desc: 'Borda sólida clássica', color: '#0a0a0a', border: '3px solid #fff', textColor: '#fff' },
];

const PlaylistEditor = () => {
  const renderClockPreview = () => {
    switch (clockStyle) {
      case 'analog_modern':
        return (
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #fff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '2px', height: '40px', background: '#fff', top: '20px', transformOrigin: 'bottom', transform: 'rotate(45deg)' }}></div>
            <div style={{ position: 'absolute', width: '3px', height: '30px', background: '#818cf8', top: '30px', transformOrigin: 'bottom', transform: 'rotate(180deg)' }}></div>
            <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', zIndex: 2 }}></div>
          </div>
        );
      case 'big_bold':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '6rem', fontWeight: '900', letterSpacing: '-4px', lineHeight: 0.8 }}>14:55</div>
            <div style={{ fontSize: '1.2rem', textTransform: 'uppercase', marginTop: '10px', letterSpacing: '2px', opacity: 0.6 }}>Segunda-Feira</div>
          </div>
        );
      default: // digital_solid
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1, fontFamily: 'Outfit' }}>14:55</div>
            <div style={{ fontSize: '1.1rem', opacity: 0.8, marginTop: '4px', fontWeight: '600' }}>Segunda, 24 Out</div>
          </div>
        );
    }
  };
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
  const [transitionDuration, setTransitionDuration] = useState('1s');
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
  const [clockCardStyle, setClockCardStyle] = useState('dark');
  const [weatherCardStyle, setWeatherCardStyle] = useState('dark');
  const [socialCardStyle, setSocialCardStyle] = useState('dark');
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
  const [tickerX, setTickerX] = useState(0);
  const [tickerY, setTickerY] = useState(640);
  const [useCustomPos, setUseCustomPos] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [weatherCity, setWeatherCity] = useState('Cuiabá - MT');
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [timelineHeight, setTimelineHeight] = useState(240);
  const [resizingMedia, setResizingMedia] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [timeInput, setTimeInput] = useState(null);

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
          setTransitionDuration(p.transition_duration || '1s');
          setTickerSpeed(p.ticker_speed || 'medium');
          setTickerDirection(p.ticker_direction || 'ltr');
          setTickerHeight(p.ticker_height || 80);
          setTickerBlur(p.ticker_blur !== false);
          setTickerFontWeight(p.ticker_font_weight || '600');
          setShowSocial(p.show_social || false);
          setSocialHandle(p.social_handle || '');
          setSocialPlatform(p.social_platform || 'instagram');
          setCardTransparency(p.card_transparency !== undefined && p.card_transparency !== null ? parseFloat(p.card_transparency) : 0.4);
          setTickerLabel(p.ticker_label || '');
          setSocialQrcode(p.social_qrcode || false);
          setWidgetPosition(p.widget_position || 'top-right');
          setSocialPosition(p.social_position || 'bottom-right');
          setSocialCardStyle(p.social_card_style || 'dark');
          setClockCardStyle(p.clock_card_style || 'dark');
          setWeatherCardStyle(p.weather_card_style || 'dark');
          setWeatherCity(p.weather_city || 'Cuiabá - MT');
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
          setTickerX(p.ticker_x || 0);
          setTickerY(p.ticker_y || 640);
          setTickerHeight(p.ticker_height || 85);
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
    if (media.type === 'video') {
      const vid = document.createElement('video');
      vid.src = media.url;
      let durationSet = false;
      
      vid.onloadedmetadata = () => {
        if (durationSet) return;
        durationSet = true;
        const dur = Math.min(Math.round(vid.duration), 3600); // max 60 min
        setSelectedItems(prev => [...prev, {
          media_id: media.id,
          media: media,
          duration: dur || 10,
          transition: 'fade'
        }]);
      };
      
      // Fallback timeout in case metadata fails to load (CORS, etc)
      setTimeout(() => {
        if (durationSet) return;
        durationSet = true;
        setSelectedItems(prev => [...prev, {
          media_id: media.id,
          media: media,
          duration: media.duration || 60, // Default to 60s fallback
          transition: 'fade'
        }]);
      }, 2000);
    } else {
      setSelectedItems(prev => [...prev, {
        media_id: media.id,
        media: media,
        duration: 10, // Default 10s for images
        transition: 'fade'
      }]);
    }
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

  const duplicateMedia = (idx) => {
    setSelectedItems(prev => {
      const copy = [...prev];
      const item = { ...copy[idx], media: { ...copy[idx].media } };
      copy.splice(idx + 1, 0, item);
      return copy;
    });
  };

  const copyMedia = (idx) => {
    setClipboard({ ...selectedItems[idx], media: { ...selectedItems[idx].media } });
  };

  const pasteMedia = (afterIdx) => {
    if (!clipboard) return;
    setSelectedItems(prev => {
      const copy = [...prev];
      const item = { ...clipboard, media: { ...clipboard.media } };
      copy.splice(afterIdx + 1, 0, item);
      return copy;
    });
  };

  const setAllDurations = (seconds) => {
    setSelectedItems(prev => prev.map(item => ({ ...item, duration: seconds })));
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
        transition_duration: transitionDuration,
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
        clock_card_style: clockCardStyle,
        weather_card_style: weatherCardStyle,
        weather_city: weatherCity,
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
        ticker_x: Math.round(tickerX), ticker_y: Math.round(tickerY),
        use_custom_pos: useCustomPos,
        items: selectedItems.map((item, i) => ({
          media_id: item.media_id,
          duration_seconds: item.duration || (item.media?.type === 'video' ? 0 : 10),
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
      initialX: type === 'clock' ? clockX : type === 'weather' ? weatherX : type === 'social' ? socialX : tickerX,
      initialY: type === 'clock' ? clockY : type === 'weather' ? weatherY : type === 'social' ? socialY : tickerY,
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
    } else if (dragging.type === 'ticker') {
      setTickerX(dragging.initialX + dx);
      setTickerY(dragging.initialY + dy);
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Destaque da Barra:</label>
                        <input value={tickerLabel} onChange={e => setTickerLabel(e.target.value)} placeholder="Vazio por padrão" style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Cor do Destaque:</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '30px', height: '30px', border: 'none', background: 'none', cursor: 'pointer' }} />
                          <input value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ flex: 1, padding: '4px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.7rem' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Estilo da Faixa:</label>
                        <select value={newsStyle} onChange={e => setNewsStyle(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          <option value="classic">Clássico (Opaco)</option>
                          <option value="modern">Moderno (Pílula/Arredondado)</option>
                          <option value="minimal">Minimalista (Transparente)</option>
                          <option value="neon">Neon (Glow)</option>
                          <option value="news_channel">Canal de Notícias (CNN)</option>
                          <option value="elegant">Elegante (Fino/Premium)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Posição:</label>
                        <select value={footerPosition} onChange={e => setFooterPosition(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          <option value="bottom">Rodapé (Embaixo)</option>
                          <option value="top">Cabeçalho (Em cima)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Velocidade do Texto:</label>
                      <select value={tickerSpeed} onChange={e => setTickerSpeed(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                        <option value="slow">Lento</option>
                        <option value="medium">Normal</option>
                        <option value="fast">Rápido</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Cor do Texto:</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="color" value={footerFontColor} onChange={e => setFooterFontColor(e.target.value)} style={{ width: '30px', height: '30px', border: 'none', background: 'none', cursor: 'pointer' }} />
                        <input value={footerFontColor} onChange={e => setFooterFontColor(e.target.value)} style={{ flex: 1, padding: '4px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.7rem' }} />
                      </div>
                    </div>
                    <textarea value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Texto informativo ou link RSS..." rows={2} style={{ width: '100%', padding: '8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff', resize: 'none', fontSize: '0.8rem' }} />
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <select value={transitionEffect} onChange={e => setTransitionEffect(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                    <option value="fade">Fade Suave</option>
                    <option value="slide">Slide Inteligente</option>
                    <option value="zoom">Zoom Parallax</option>
                    <option value="cinematic">Cinematic Blur Cross</option>
                  </select>
                  <select value={transitionDuration} onChange={e => setTransitionDuration(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                    <option value="0.2s">Rápido 0.2s</option>
                    <option value="0.5s">Normal 0.5s</option>
                    <option value="1s">Suave 1.0s</option>
                    <option value="1.5s">Lento 1.5s</option>
                    <option value="2.5s">Cinema 2.5s</option>
                  </select>
                </div>
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
               transition: 'width 0.3s, height 0.3s',
               aspectRatio: orientation === 'horizontal' ? '16/9' : '9/16'
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
                      ...getWidgetBaseStyle(clockCardStyle, cardTransparency),
                      position: 'absolute', 
                      left: useCustomPos ? `${clockX}px` : (widgetPosition.split('-')[1] === 'right' ? 'auto' : widgetPosition.includes('center') ? '50%' : '40px'),
                      top: useCustomPos ? `${clockY}px` : (widgetPosition.split('-')[0] === 'bottom' ? 'auto' : '40px'),
                      right: !useCustomPos && widgetPosition.split('-')[1] === 'right' ? '40px' : 'auto',
                      bottom: !useCustomPos && widgetPosition.split('-')[0] === 'bottom' ? '40px' : 'auto',
                      transform: `${!useCustomPos && widgetPosition.includes('center') ? 'translateX(-50%) ' : ''}scale(${clockSize / 100})`,
                      transformOrigin: useCustomPos ? 'top left' : `${widgetPosition.split('-')[0]} ${widgetPosition.split('-')[1]}`,
                      border: selectedElement === 'clock' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'move',
                      userSelect: 'none'
                    }}>
                    {renderClockPreview()}
                  </div>
                )}

                {/* Social Widget */}
                {showSocial && (
                  <div 
                    onMouseDown={(e) => handleMouseDown(e, 'social')}
                    style={{ 
                      ...getWidgetBaseStyle(socialCardStyle, cardTransparency),
                      position: 'absolute', 
                      left: useCustomPos ? `${socialX}px` : (socialPosition.split('-')[1] === 'right' ? 'auto' : socialPosition.includes('center') ? '50%' : '40px'),
                      top: useCustomPos ? `${socialY}px` : (socialPosition.split('-')[0] === 'bottom' ? 'auto' : '40px'),
                      right: !useCustomPos && socialPosition.split('-')[1] === 'right' ? '40px' : 'auto',
                      bottom: !useCustomPos && socialPosition.split('-')[0] === 'bottom' ? '40px' : 'auto',
                      transform: `${!useCustomPos && socialPosition.includes('center') ? 'translateX(-50%) ' : ''}scale(${socialSize / 100})`,
                      transformOrigin: useCustomPos ? 'top left' : `${socialPosition.split('-')[0]} ${socialPosition.split('-')[1]}`,
                      border: selectedElement === 'social' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', 
                      cursor: 'move',
                      userSelect: 'none'
                    }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Siga-nos no {socialPlatform}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: '900', fontFamily: 'Outfit' }}>{socialHandle || '@seu_negocio'}</div>
                    </div>
                    {socialQrcode && <div style={{ width: '60px', height: '60px', background: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.6rem', fontWeight: '900' }}>QR</div>}
                  </div>
                )}

                {/* Weather Widget */}
                {showWeather && (
                    <div 
                    onMouseDown={(e) => handleMouseDown(e, 'weather')}
                    style={{ 
                      ...getWidgetBaseStyle(weatherCardStyle, cardTransparency),
                      position: 'absolute', 
                      left: useCustomPos ? `${weatherX}px` : '40px',
                      top: useCustomPos ? `${weatherY}px` : '40px',
                      transform: `scale(${weatherSize / 100})`, 
                      transformOrigin: 'top left',
                      border: selectedElement === 'weather' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', 
                      cursor: 'move',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                    <span style={{ fontSize: '2.8rem' }}>⛅</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '2.8rem', fontWeight: '800', lineHeight: 1, fontFamily: 'Outfit' }}>26°C</div>
                      <div style={{ fontSize: '1rem', opacity: 0.8, fontWeight: '600' }}>{weatherCity}</div>
                    </div>
                  </div>
                )}

                {/* Footer / Ticker - Agora Draggable */}
                {(layout === 'with_footer' || layout === 'floating') && (() => {
                  const styleName = newsStyle || 'classic';
                  const isTop = footerPosition === 'top';
                  const color = themeColor || '#818cf8';
                  
                  let containerStyle = {};
                  let labelStyle = {};

                  switch (styleName) {
                    case 'modern':
                      containerStyle = {
                        backgroundColor: `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)}, ${footerOpacity})`,
                        borderRadius: '50px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        width: 'calc(100% - 40px)',
                        left: useCustomPos ? `${tickerX}px` : '20px',
                        top: useCustomPos ? `${tickerY}px` : (isTop ? '20px' : 'auto'),
                        bottom: !useCustomPos && !isTop ? '20px' : 'auto'
                      };
                      labelStyle = {
                        background: 'linear-gradient(90deg, rgba(0,0,0,0.6), rgba(0,0,0,0.2))',
                        borderRadius: '50px 0 0 50px',
                        color: '#fff'
                      };
                      break;
                    case 'minimal':
                      containerStyle = {
                        backgroundColor: `rgba(0,0,0,${footerOpacity})`,
                        borderTop: isTop ? 'none' : `1px solid rgba(255,255,255,0.2)`,
                        borderBottom: isTop ? `1px solid rgba(255,255,255,0.2)` : 'none',
                        backdropFilter: 'blur(20px)'
                      };
                      labelStyle = {
                        background: 'transparent',
                        color: color,
                        borderRight: `2px solid ${color}`
                      };
                      break;
                    case 'neon':
                      containerStyle = {
                        backgroundColor: `rgba(0,0,0,${footerOpacity})`,
                        boxShadow: `0 0 20px ${color}, inset 0 0 10px ${color}`,
                        borderTop: isTop ? 'none' : `2px solid ${color}`,
                        borderBottom: isTop ? `2px solid ${color}` : 'none'
                      };
                      labelStyle = {
                        background: color,
                        color: '#000',
                        boxShadow: `0 0 15px ${color}`
                      };
                      break;
                    case 'news_channel':
                      containerStyle = {
                        backgroundColor: '#fff',
                        borderTop: isTop ? 'none' : `4px solid ${color}`,
                        borderBottom: isTop ? `4px solid ${color}` : 'none'
                      };
                      labelStyle = {
                        background: color,
                        color: '#fff',
                        clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)',
                        paddingRight: '40px'
                      };
                      break;
                    case 'elegant':
                      containerStyle = {
                        backgroundColor: `rgba(15,15,15,${footerOpacity})`,
                        borderTop: isTop ? 'none' : `1px solid ${color}`,
                        borderBottom: isTop ? `1px solid ${color}` : 'none'
                      };
                      labelStyle = {
                        background: 'transparent',
                        color: color,
                        fontFamily: 'Playfair Display, serif',
                        letterSpacing: '4px'
                      };
                      break;
                    default: // classic
                      containerStyle = {
                        backgroundColor: `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)}, ${footerOpacity})`,
                        boxShadow: isTop ? '0 10px 40px rgba(0,0,0,0.5)' : '0 -10px 40px rgba(0,0,0,0.5)',
                        borderRadius: layout === 'floating' ? '20px' : '0'
                      };
                      labelStyle = {
                        background: 'rgba(0,0,0,0.25)',
                        borderRight: '2px solid rgba(255,255,255,0.1)'
                      };
                      break;
                  }

                  return (
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, 'ticker')}
                      style={{ 
                        position: 'absolute', 
                        left: containerStyle.left || (useCustomPos ? `${tickerX}px` : (layout === 'floating' ? '5%' : '0')),
                        top: containerStyle.top || (useCustomPos ? `${tickerY}px` : (isTop ? (layout === 'floating' ? '40px' : 0) : 'auto')),
                        bottom: containerStyle.bottom || (!useCustomPos && !isTop ? (layout === 'floating' ? '40px' : 0) : 'auto'), 
                        width: containerStyle.width || (layout === 'floating' ? '90%' : '100%'), 
                        height: `${tickerHeight}px`,
                        overflow: 'hidden',
                        color: styleName === 'news_channel' ? '#000' : footerFontColor,
                        display: 'flex', alignItems: 'center', zIndex: 20, 
                        cursor: 'move',
                        outline: selectedElement === 'ticker' ? '2px solid #6366f1' : 'none',
                        ...containerStyle
                      }}
                    >
                      {tickerLabel && (
                        <div style={{ 
                          padding: '0 30px', height: '100%', 
                          display: 'flex', alignItems: 'center', fontWeight: '900', fontSize: '1.2rem', 
                          textTransform: 'uppercase', letterSpacing: '2px',
                          ...labelStyle 
                        }}>
                          {tickerLabel}
                        </div>
                      )}
                      <div style={{ flex: 1, padding: '0 30px', fontSize: footerFontSize, fontWeight: tickerFontWeight, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{ display: 'inline-block', animation: `marquee ${tickerSpeed === 'fast' ? '10s' : tickerSpeed === 'slow' ? '30s' : '20s'} linear infinite` }}>
                          {footerText || 'Aviso importante! Digite seu texto nas propriedades e ele irá rolar aqui...'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
             </div>
          </div>

          {/* TIMELINE CAPCUT-STYLE */}
          <div style={{ height: `${timelineHeight}px`, background: '#111113', borderTop: '2px solid #27272a', display: 'flex', flexDirection: 'column', zIndex: 10, position: 'relative' }}
            onClick={() => setContextMenu(null)}
          >
            {/* Resize handle */}
            <div onMouseDown={(e) => { e.preventDefault(); const sY = e.clientY, sH = timelineHeight; const mv = (ev) => setTimelineHeight(Math.max(140, Math.min(500, sH - (ev.clientY - sY)))); const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); }}
              style={{ height: '5px', cursor: 'ns-resize', position: 'absolute', top: '-2px', left: 0, right: 0, zIndex: 20, background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = '#6366f1'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />

            {/* Header */}
            <div style={{ padding: '4px 16px', background: '#18181b', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minHeight: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Timeline</span>
                <span style={{ fontSize: '0.6rem', color: '#3f3f46', background: '#1a1a1f', padding: '2px 8px', borderRadius: '8px' }}>{selectedItems.length} clips</span>
                {clipboard && <span style={{ fontSize: '0.55rem', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '8px' }}>📋 Copiado</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Batch duration */}
                <select onChange={e => { if(e.target.value) { setAllDurations(parseInt(e.target.value)); e.target.value = ''; }}} style={{ background: '#1a1a1f', border: '1px solid #27272a', borderRadius: '6px', color: '#a1a1aa', fontSize: '0.6rem', padding: '3px 6px', cursor: 'pointer', outline: 'none' }}>
                  <option value="">⏱ Definir todos</option>
                  <option value="5">5s cada</option>
                  <option value="10">10s cada</option>
                  <option value="15">15s cada</option>
                  <option value="30">30s cada</option>
                  <option value="60">60s cada</option>
                </select>
                {/* Zoom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#1a1a1f', borderRadius: '6px', padding: '2px 4px', border: '1px solid #27272a' }}>
                  <button onClick={() => setTimelineZoom(z => Math.max(0.3, +(z - 0.2).toFixed(1)))} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.8rem', padding: '0 5px', lineHeight: 1 }}>−</button>
                  <input type="range" min="0.3" max="3" step="0.1" value={timelineZoom} onChange={e => setTimelineZoom(parseFloat(e.target.value))} style={{ width: '60px', height: '12px', accentColor: '#6366f1' }} />
                  <button onClick={() => setTimelineZoom(z => Math.min(3, +(z + 0.2).toFixed(1)))} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.8rem', padding: '0 5px', lineHeight: 1 }}>+</button>
                  <span style={{ fontSize: '0.55rem', color: '#52525b', minWidth: '28px', textAlign: 'center' }}>{Math.round(timelineZoom * 100)}%</span>
                </div>
                {/* Total */}
                <div style={{ padding: '3px 10px', background: '#1a1a1f', borderRadius: '8px', border: '1px solid #27272a' }}>
                  <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: '800', fontFamily: 'monospace' }}>
                    {totalDuration >= 3600 ? `${Math.floor(totalDuration/3600)}h${Math.floor((totalDuration%3600)/60).toString().padStart(2,'0')}m` : totalDuration >= 60 ? `${Math.floor(totalDuration / 60)}:${(totalDuration % 60).toString().padStart(2, '0')}` : `0:${totalDuration.toString().padStart(2, '0')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Track area */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}
              onMouseMove={(e) => { if (!resizingMedia) return; const dx = e.clientX - resizingMedia.startX; const newDur = Math.max(1, Math.round(resizingMedia.startDur + dx / (8 * timelineZoom))); updateDuration(resizingMedia.idx, newDur); }}
              onMouseUp={() => setResizingMedia(null)}
              onMouseLeave={() => setResizingMedia(null)}
            >
              {/* Ruler */}
              {(() => {
                const pxPerSec = 8 * timelineZoom;
                const totalPx = selectedItems.reduce((a, it) => a + Math.max(60, (it.duration || 10) * pxPerSec), 0) + 100;
                const rulerInterval = timelineZoom >= 1.5 ? 5 : timelineZoom >= 0.8 ? 10 : 30;
                return (
                  <div style={{ height: '24px', borderBottom: '1px solid #1a1a1f', position: 'relative', minWidth: `${Math.max(totalPx, 600)}px` }}>
                    {Array.from({ length: Math.ceil(totalDuration / rulerInterval) + 1 }, (_, i) => {
                      const sec = i * rulerInterval;
                      return (
                        <div key={`tick-${i}`} style={{ position: 'absolute', left: `${16 + sec * pxPerSec}px`, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.5rem', color: '#3f3f46', fontFamily: 'monospace' }}>
                            {sec >= 60 ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`}
                          </span>
                          <div style={{ height: '5px', width: '1px', background: '#27272a' }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Clips Track */}
              <div style={{ display: 'flex', gap: '2px', padding: '8px 16px', minHeight: `${timelineHeight - 76}px`, alignItems: 'stretch' }}>
                {selectedItems.map((item, idx) => {
                  const isImg = item.media?.type === 'image';
                  const dur = item.duration || 10;
                  const w = Math.max(60, dur * 8 * timelineZoom);
                  const sel = selectedElement === `media-${idx}`;
                  return (
                    <div key={`tl-${item.media_id}-${idx}`}
                      draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', idx)}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #6366f1'; }}
                      onDragLeave={(e) => e.currentTarget.style.boxShadow = sel ? '0 0 0 2px #6366f1' : 'none'}
                      onDrop={(e) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'none'; const from = parseInt(e.dataTransfer.getData('text/plain')); if (!isNaN(from)) { const n = [...selectedItems]; const [m] = n.splice(from, 1); n.splice(idx, 0, m); setSelectedItems(n); } }}
                      onClick={(e) => { e.stopPropagation(); setSelectedElement(`media-${idx}`); setContextMenu(null); }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedElement(`media-${idx}`); setContextMenu({ x: e.clientX, y: e.clientY, idx }); }}
                      style={{
                        width: `${w}px`, minWidth: '60px', flexShrink: 0,
                        background: sel ? '#1e1b4b' : '#161618',
                        borderRadius: '6px', overflow: 'visible', position: 'relative',
                        boxShadow: sel ? '0 0 0 2px #6366f1' : 'none',
                        cursor: resizingMedia ? 'ew-resize' : 'grab',
                        display: 'flex', flexDirection: 'column',
                        transition: 'box-shadow 0.1s'
                      }}>
                      {/* Thumbnail */}
                      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '6px 6px 0 0', minHeight: 0 }}>
                        {isImg ? <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                          : <div style={{ height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '1.2rem', opacity: 0.3 }}>🎬</span></div>}
                        {/* Badge */}
                        <div style={{ position: 'absolute', top: '3px', left: '3px', padding: '1px 5px', borderRadius: '3px', fontSize: '0.5rem', fontWeight: '800', background: isImg ? '#16a34a' : '#6366f1', color: '#fff' }}>{isImg ? 'IMG' : 'VID'}</div>
                        {/* Duration badge */}
                        <div
                          onClick={(e) => { e.stopPropagation(); setTimeInput({ idx, value: dur.toString() }); }}
                          style={{ position: 'absolute', bottom: '3px', right: '3px', padding: '1px 6px', borderRadius: '3px', fontSize: '0.58rem', fontWeight: '800', background: 'rgba(0,0,0,0.85)', color: '#818cf8', fontFamily: 'monospace', cursor: 'text', border: '1px solid transparent', transition: 'border-color 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          {timeInput?.idx === idx ? (
                            <input autoFocus type="number" min="1" value={timeInput.value}
                              onChange={e => setTimeInput({ idx, value: e.target.value })}
                              onBlur={() => { updateDuration(idx, parseInt(timeInput.value) || 1); setTimeInput(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') { updateDuration(idx, parseInt(timeInput.value) || 1); setTimeInput(null); } }}
                              onClick={e => e.stopPropagation()}
                              style={{ width: '30px', background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.58rem', fontWeight: '800', textAlign: 'center', outline: 'none', fontFamily: 'monospace' }} />
                          ) : `${dur}s`}
                        </div>
                      </div>
                      {/* Name bar */}
                      <div style={{ padding: '3px 6px', background: '#111113', borderRadius: '0 0 6px 6px', borderTop: '1px solid #1e1e22' }}>
                        <div style={{ fontSize: '0.58rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#a1a1aa' }}>{item.media?.name}</div>
                      </div>
                      {/* RIGHT resize handle */}
                      <div onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizingMedia({ idx, startX: e.clientX, startDur: dur }); }}
                        style={{ position: 'absolute', right: '-1px', top: '8px', bottom: '8px', width: '4px', cursor: 'ew-resize', borderRadius: '2px', background: sel ? '#6366f1' : 'transparent', transition: 'background 0.1s', zIndex: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
                        onMouseLeave={e => { if (!resizingMedia) e.currentTarget.style.background = sel ? '#6366f1' : 'transparent'; }} />
                      {/* LEFT resize handle */}
                      <div onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizingMedia({ idx, startX: e.clientX, startDur: dur, reverse: true }); }}
                        style={{ position: 'absolute', left: '-1px', top: '8px', bottom: '8px', width: '4px', cursor: 'ew-resize', borderRadius: '2px', background: sel ? '#6366f1' : 'transparent', transition: 'background 0.1s', zIndex: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
                        onMouseLeave={e => { if (!resizingMedia) e.currentTarget.style.background = sel ? '#6366f1' : 'transparent'; }} />
                    </div>
                  );
                })}
                {/* Add btn */}
                <div onClick={() => setActiveTab('medias')} style={{ width: '50px', minWidth: '50px', border: '1px dashed #27272a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3f3f46', flexShrink: 0, fontSize: '1.2rem', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#3f3f46'; }}>+</div>
                {/* Paste at end */}
                {clipboard && <div onClick={() => pasteMedia(selectedItems.length - 1)} style={{ width: '50px', minWidth: '50px', border: '1px dashed #22c55e33', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#22c55e55', flexShrink: 0, fontSize: '0.8rem', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#22c55e33'; e.currentTarget.style.color = '#22c55e55'; }}>📋</div>}
              </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: '#1e1e22', border: '1px solid #3f3f46', borderRadius: '8px', padding: '4px 0', zIndex: 9999, boxShadow: '0 10px 40px rgba(0,0,0,0.6)', minWidth: '160px' }}
                onClick={e => e.stopPropagation()}>
                {[
                  { label: '📋 Copiar', action: () => { copyMedia(contextMenu.idx); setContextMenu(null); } },
                  { label: '📄 Colar depois', action: () => { pasteMedia(contextMenu.idx); setContextMenu(null); }, disabled: !clipboard },
                  { label: '✨ Duplicar', action: () => { duplicateMedia(contextMenu.idx); setContextMenu(null); } },
                  null,
                  { label: '⏱ Definir tempo...', action: () => { setTimeInput({ idx: contextMenu.idx, value: (selectedItems[contextMenu.idx]?.duration || 10).toString() }); setContextMenu(null); setSelectedElement(`media-${contextMenu.idx}`); } },
                  null,
                  { label: '🗑️ Remover', action: () => { removeMedia(contextMenu.idx); setContextMenu(null); setSelectedElement(null); }, danger: true },
                ].map((item, i) => item === null ? (
                  <div key={`sep-${i}`} style={{ height: '1px', background: '#27272a', margin: '4px 8px' }} />
                ) : (
                  <button key={item.label} onClick={item.action} disabled={item.disabled}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 16px', background: 'transparent', border: 'none', color: item.disabled ? '#3f3f46' : item.danger ? '#ef4444' : '#e4e4e7', fontSize: '0.75rem', cursor: item.disabled ? 'default' : 'pointer', fontWeight: '600', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = '#27272a'; }}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
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
               selectedElement?.startsWith('media-') ? '🖼️ Propriedades: Mídia' :
               '⚙️ Config. da Cena'}
            </h3>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Media properties panel when timeline item selected */}
            {selectedElement?.startsWith('media-') && (() => {
              const mediaIdx = parseInt(selectedElement.split('-')[1]);
              const mediaItem = selectedItems[mediaIdx];
              if (!mediaItem) return null;
              const isImage = mediaItem.media?.type === 'image';
              return (
                <>
                  {/* Thumbnail preview */}
                  <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16/9', background: '#09090b', border: '1px solid #27272a' }}>
                    {isImage ? (
                      <img src={mediaItem.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                        <span style={{ fontSize: '2.5rem' }}>🎬</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#e4e4e7' }}>{mediaItem.media?.name}</div>
                  
                  {/* Duration */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tempo de Exibição</span>
                      <span style={{ color: '#6366f1' }}>{mediaItem.duration || 10}s</span>
                    </label>
                    <input type="range" min="1" max="120" value={mediaItem.duration || 10} onChange={e => updateDuration(mediaIdx, e.target.value)} style={{ width: '100%', accentColor: '#6366f1' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#52525b', marginTop: '4px' }}>
                      <span>1s</span><span>30s</span><span>60s</span><span>120s</span>
                    </div>
                  </div>

                  {/* Transition */}
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Efeito de Transição</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { v: 'fade', icon: '✦', label: 'Fade' },
                        { v: 'slide', icon: '→', label: 'Slide' },
                        { v: 'zoom', icon: '⊕', label: 'Zoom' },
                        { v: 'cinematic', icon: '◎', label: 'Cinematic' },
                        { v: 'none', icon: '—', label: 'Nenhum' },
                      ].map(t => (
                        <div key={t.v} onClick={() => updateTransition(mediaIdx, t.v)} style={{
                          padding: '10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                          background: (mediaItem.transition || 'fade') === t.v ? 'rgba(99,102,241,0.15)' : '#1a1a1f',
                          border: (mediaItem.transition || 'fade') === t.v ? '2px solid #6366f1' : '1px solid #27272a',
                          transition: 'all 0.2s'
                        }}>
                          <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{t.icon}</div>
                          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: (mediaItem.transition || 'fade') === t.v ? '#818cf8' : '#71717a' }}>{t.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Position */}
                  <div style={{ fontSize: '0.75rem', color: '#52525b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Posição: {mediaIdx + 1} de {selectedItems.length}</span>
                    <span>Tipo: {isImage ? 'Imagem' : 'Vídeo'}</span>
                  </div>

                  <button onClick={() => { removeMedia(mediaIdx); setSelectedElement(null); }} style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
                    🗑️ Remover Mídia
                  </button>
                </>
              );
            })()}
            
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
                 <div>
                   <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Modelo do Relógio</label>
                   <select value={clockStyle} onChange={e => setClockStyle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                     <option value="digital_solid">Digital Moderno</option>
                     <option value="analog_modern">Analógico Classic</option>
                     <option value="big_bold">Big Bold (Focado)</option>
                   </select>
                 </div>
                 <div>
                   <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Estilo do Card</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                     {CARD_STYLE_PREVIEWS.map(s => (
                       <div key={s.value} onClick={() => setClockCardStyle(s.value)} style={{
                         padding: '10px', borderRadius: '10px', cursor: 'pointer',
                         background: s.color, border: clockCardStyle === s.value ? '2px solid #6366f1' : s.border,
                         boxShadow: clockCardStyle === s.value ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                         transition: 'all 0.2s'
                       }}>
                         <div style={{ fontSize: '0.72rem', fontWeight: '800', color: s.textColor }}>{s.label}</div>
                         <div style={{ fontSize: '0.58rem', color: s.textColor, opacity: 0.6, marginTop: '2px' }}>{s.desc}</div>
                       </div>
                     ))}
                   </div>
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
                 <div>
                   <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Estilo do Card</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                     {CARD_STYLE_PREVIEWS.map(s => (
                       <div key={s.value} onClick={() => setWeatherCardStyle(s.value)} style={{
                         padding: '10px', borderRadius: '10px', cursor: 'pointer',
                         background: s.color, border: weatherCardStyle === s.value ? '2px solid #6366f1' : s.border,
                         boxShadow: weatherCardStyle === s.value ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                         transition: 'all 0.2s'
                       }}>
                         <div style={{ fontSize: '0.72rem', fontWeight: '800', color: s.textColor }}>{s.label}</div>
                         <div style={{ fontSize: '0.58rem', color: s.textColor, opacity: 0.6, marginTop: '2px' }}>{s.desc}</div>
                       </div>
                     ))}
                   </div>
                 </div>
                 <div>
                   <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Localização (Cidade/Estado)</label>
                   <input value={weatherCity} onChange={e => setWeatherCity(e.target.value)} placeholder="Ex: Cuiabá - MT" style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
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
                   <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Estilo do Card</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                     {CARD_STYLE_PREVIEWS.map(s => (
                       <div key={s.value} onClick={() => setSocialCardStyle(s.value)} style={{
                         padding: '10px', borderRadius: '10px', cursor: 'pointer',
                         background: s.color, border: socialCardStyle === s.value ? '2px solid #6366f1' : s.border,
                         boxShadow: socialCardStyle === s.value ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                         transition: 'all 0.2s'
                       }}>
                         <div style={{ fontSize: '0.72rem', fontWeight: '800', color: s.textColor }}>{s.label}</div>
                         <div style={{ fontSize: '0.58rem', color: s.textColor, opacity: 0.6, marginTop: '2px' }}>{s.desc}</div>
                       </div>
                     ))}
                   </div>
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
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', display: 'flex', justifyContent: 'space-between' }}>
                    Altura da Barra: <span>{tickerHeight}px</span>
                  </label>
                  <input type="range" min="40" max="250" value={tickerHeight} onChange={e => setTickerHeight(parseInt(e.target.value))} style={{ width: '100%', marginTop: '8px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>A cada (min):</label>
                    <input type="number" value={tickerInterval} onChange={e => setTickerInterval(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Exibir por (min):</label>
                    <input type="number" value={tickerDuration} onChange={e => setTickerDuration(parseInt(e.target.value))} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
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
