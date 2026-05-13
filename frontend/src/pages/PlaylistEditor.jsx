import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getTickerVisualConfig, buildTickerText, getTickerSpeedDuration } from '../utils/tickerVisual';

const THEME_MODELOS = [
  {
    id: 'Corporate',
    titulo: 'Corporate Flow',
    descricao: 'Visual limpo para recepcoes, escritórios e ambientes institucionais.',
    gradiente: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    chip: '#60a5fa',
    widgets: 'Relógio topo direito, clima topo esquerdo, ticker superior',
    cor: '#2563eb',
  },
  {
    id: 'Cyberpunk',
    titulo: 'Cyber Pulse',
    descricao: 'Cores vivas, contraste alto e widgets com personalidade tech.',
    gradiente: 'linear-gradient(135deg, #09090b 0%, #6d28d9 50%, #06b6d4 100%)',
    chip: '#22d3ee',
    widgets: 'Relógio central, clima canto direito, social inferior',
    cor: '#22d3ee',
  },
  {
    id: 'Luxury Gold',
    titulo: 'Luxury Gold',
    descricao: 'Apresentacao premium com contraste escuro e detalhes dourados.',
    gradiente: 'linear-gradient(135deg, #111111 0%, #3f2a0f 100%)',
    chip: '#fbbf24',
    widgets: 'Relógio destaque, clima sutil, social discreto',
    cor: '#d4a017',
  },
  {
    id: 'Minimalist',
    titulo: 'Minimal Frame',
    descricao: 'Tela leve, foco em leitura e poucos elementos visuais.',
    gradiente: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
    chip: '#0f172a',
    widgets: 'Relógio limpo, clima compacto, sem social',
    cor: '#0f172a',
  },
  {
    id: 'Neon Vibrant',
    titulo: 'Neon Vibrant',
    descricao: 'Ideal para varejo, promoções e ambientes com alto impacto visual.',
    gradiente: 'linear-gradient(135deg, #04111d 0%, #0f766e 45%, #f43f5e 100%)',
    chip: '#f43f5e',
    widgets: 'Relógio topo central, clima topo esquerdo, social em destaque',
    cor: '#f43f5e',
  },
  {
    id: 'Fast Food',
    titulo: 'Fast Menu',
    descricao: 'Pensado para cardápios e campanhas com leitura rápida.',
    gradiente: 'linear-gradient(135deg, #7c2d12 0%, #ef4444 100%)',
    chip: '#fde047',
    widgets: 'Ticker forte, social à direita, relógio desligado',
    cor: '#ef4444',
  },
  {
    id: 'Supermercado',
    titulo: 'Market Spotlight',
    descricao: 'Bom para ofertas, mensagens rotativas e conteúdo de alto volume.',
    gradiente: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
    chip: '#bbf7d0',
    widgets: 'Relógio topo direito, ofertas no rodapé, clima oculto',
    cor: '#16a34a',
  },
];

const getWidgetBaseStyle = (style, transparency, themeColor = '#818cf8', widgetType = 'default') => {
  const alpha = 0.35 + (transparency || 0) * 0.45;
  const themeShadow = `${themeColor}40`;
  const base = {
    padding: '20px 24px',
    borderRadius: '26px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    zIndex: 25,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
  };
  const accentByType = {
    clock: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
    weather: `linear-gradient(135deg, ${themeColor}33, rgba(59,130,246,0.12))`,
    social: `linear-gradient(135deg, rgba(255,255,255,0.08), ${themeColor}29)`,
    default: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
  };

  switch (style) {
    case 'minimalist':
      return { ...base, background: 'transparent', backdropFilter: 'none', border: 'none', boxShadow: 'none', padding: '10px 14px', color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.8)' };
    case 'light':
      return { ...base, background: `linear-gradient(135deg, rgba(255,255,255,${0.94 - (transparency || 0) * 0.08}), rgba(255,255,255,${0.8 - (transparency || 0) * 0.06}))`, color: '#18181b', border: '1px solid rgba(255,255,255,0.75)', boxShadow: `0 18px 48px rgba(15,23,42,0.18), 0 0 0 1px ${themeColor}18`, backdropFilter: 'blur(22px)' };
    case 'glass_pro':
      return { ...base, background: accentByType[widgetType] || accentByType.default, backdropFilter: 'blur(36px) saturate(180%)', border: '1px solid rgba(255,255,255,0.24)', boxShadow: `0 18px 48px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px ${themeShadow}` };
    case 'neon':
      return { ...base, border: `1px solid ${themeColor}`, boxShadow: `0 0 20px ${themeShadow}, 0 0 46px ${themeColor}22, inset 0 0 18px ${themeColor}18`, background: 'linear-gradient(135deg, rgba(2,6,23,0.84), rgba(15,23,42,0.72))', backdropFilter: 'blur(10px)', borderRadius: '18px' };
    case 'border_classic':
      return { ...base, borderRadius: '10px', border: '2px solid rgba(255,255,255,0.85)', background: `linear-gradient(135deg, rgba(0,0,0,${alpha + 0.22}), rgba(15,23,42,${alpha + 0.12}))`, padding: '18px 24px', boxShadow: '0 14px 40px rgba(0,0,0,0.45)' };
    default: // dark
      return { ...base, background: `linear-gradient(135deg, rgba(2,6,23,${alpha + 0.16}), rgba(15,23,42,${alpha}))`, backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 22px 52px rgba(0,0,0,0.42), 0 0 0 1px ${themeColor}12` };
  }
};

// Preview visual para os estilos de card no editor
const CARD_STYLE_PREVIEWS = [
  { value: 'dark', label: 'Escuro', desc: 'Fundo escuro com blur', color: '#18181b', border: '1px solid #3f3f46', textColor: '#fff', accent: '#6366f1' },
  { value: 'light', label: 'Claro', desc: 'Fundo branco translúcido', color: '#f4f4f5', border: '1px solid #e4e4e7', textColor: '#18181b', accent: '#0f172a' },
  { value: 'minimalist', label: 'Sem fundo', desc: 'Texto direto na mídia', color: 'transparent', border: '2px dashed #52525b', textColor: '#a1a1aa', accent: '#6366f1' },
  { value: 'glass_pro', label: 'Glass Pro', desc: 'Vidro premium com blur', color: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.3)', textColor: '#e9d5ff', accent: '#a855f7' },
  { value: 'neon', label: 'Neon Glow', desc: 'Brilho neon ciano', color: '#0a0a0a', border: '2px solid #22d3ee', textColor: '#22d3ee', accent: '#22d3ee' },
  { value: 'border_classic', label: 'Moldura', desc: 'Borda sólida clássica', color: '#0a0a0a', border: '3px solid #fff', textColor: '#fff', accent: '#ffffff' },
];

const COLOR_PRESETS = [
  { id: 'royal', nome: 'Royal Ink', cor: '#4f46e5', fundo: '#0f172a', texto: '#e2e8f0', overlay: 'gradient', transparencia: 0.38, estilo: 'modern', cardStyle: 'glass_pro', clockPos: 'top-right', weatherPos: 'top-left', socialPos: 'bottom-right' },
  { id: 'aurora', nome: 'Aurora', cor: '#06b6d4', fundo: '#082f49', texto: '#ecfeff', overlay: 'vignette', transparencia: 0.36, estilo: 'glass_pro', cardStyle: 'glass_pro', clockPos: 'top-center', weatherPos: 'top-left', socialPos: 'bottom-center' },
  { id: 'sunset', nome: 'Sunset', cor: '#f97316', fundo: '#2b1100', texto: '#ffedd5', overlay: 'gradient', transparencia: 0.42, estilo: 'elegant', cardStyle: 'border_classic', clockPos: 'top-right', weatherPos: 'top-right', socialPos: 'bottom-left' },
  { id: 'emerald', nome: 'Emerald', cor: '#10b981', fundo: '#052e16', texto: '#d1fae5', overlay: 'gradient', transparencia: 0.34, estilo: 'minimal', cardStyle: 'minimalist', clockPos: 'top-left', weatherPos: 'top-right', socialPos: 'bottom-right' },
  { id: 'onyx', nome: 'Onyx', cor: '#111827', fundo: '#09090b', texto: '#f8fafc', overlay: 'none', transparencia: 0.48, estilo: 'dark', cardStyle: 'dark', clockPos: 'top-right', weatherPos: 'top-left', socialPos: 'bottom-right' },
  { id: 'gold', nome: 'Gold Stage', cor: '#d4a017', fundo: '#111111', texto: '#fef3c7', overlay: 'vignette', transparencia: 0.34, estilo: 'border_classic', cardStyle: 'border_classic', clockPos: 'top-right', weatherPos: 'top-left', socialPos: 'bottom-center' },
];

const WIDGET_LAYOUT_PRESETS = {
  clock: [
    { id: 'top-right', label: 'Topo direito', position: 'top-right', size: 96, style: 'glass_pro' },
    { id: 'top-center', label: 'Topo central', position: 'top-center', size: 108, style: 'light' },
    { id: 'bottom-right', label: 'Inferior direito', position: 'bottom-right', size: 90, style: 'dark' },
  ],
  weather: [
    { id: 'top-left', label: 'Topo esquerdo', position: 'top-left', size: 92, style: 'glass_pro' },
    { id: 'top-right', label: 'Topo direito', position: 'top-right', size: 88, style: 'light' },
    { id: 'bottom-right', label: 'Inferior direito', position: 'bottom-right', size: 84, style: 'dark' },
  ],
  social: [
    { id: 'bottom-right', label: 'Inferior direito', position: 'bottom-right', size: 92, style: 'neon' },
    { id: 'bottom-left', label: 'Inferior esquerdo', position: 'bottom-left', size: 86, style: 'glass_pro' },
    { id: 'bottom-center', label: 'Centro inferior', position: 'bottom-center', size: 100, style: 'light' },
  ],
  ticker: [
    { id: 'bar-wide', label: 'Barra ampla', height: 92, speed: 'medium', style: 'modern' },
    { id: 'bar-breaking', label: 'Breaking', height: 108, speed: 'fast', style: 'news_channel' },
    { id: 'bar-elegant', label: 'Elegante', height: 84, speed: 'slow', style: 'elegant' },
  ],
};

const WIDGET_SIZE_PRESETS = [
  { id: 'compacto', label: 'Compacto', value: 84 },
  { id: 'equilibrado', label: 'Equilibrado', value: 100 },
  { id: 'impacto', label: 'Impacto', value: 118 },
];

const TICKER_HEIGHT_PRESETS = [
  { id: 'baixo', label: 'Baixa', value: 72 },
  { id: 'padrao', label: 'Padrão', value: 94 },
  { id: 'alta', label: 'Alta', value: 118 },
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
  const [weatherPosition, setWeatherPosition] = useState('top-left');
  const [socialPosition, setSocialPosition] = useState('bottom-right');
  const [clockAccentColor, setClockAccentColor] = useState('#818cf8');
  const [weatherAccentColor, setWeatherAccentColor] = useState('#38bdf8');
  const [socialAccentColor, setSocialAccentColor] = useState('#a855f7');
  const [tickerAccentColor, setTickerAccentColor] = useState('#6366f1');
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
  const [colorPreset, setColorPreset] = useState('royal');
  const [widgetPreset, setWidgetPreset] = useState('clock-top-right');
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
  const [mediaSearch, setMediaSearch] = useState('');
  const clockWidgetRef = useRef(null);
  const weatherWidgetRef = useRef(null);
  const socialWidgetRef = useRef(null);
  const tickerWidgetRef = useRef(null);

  const mediasFiltradas = useMemo(() => {
    if (!mediaSearch.trim()) return medias;
    const termo = mediaSearch.toLowerCase().trim();
    return medias.filter((midia) =>
      [midia.name, midia.original_name, midia.type]
        .filter(Boolean)
        .some((valor) => valor.toLowerCase().includes(termo))
    );
  }, [medias, mediaSearch]);

  const timelineDensity = useMemo(() => Math.max(0.8, Math.min(1.45, timelineHeight / 240)), [timelineHeight]);
  const timelineTrackHeight = useMemo(() => Math.max(70, Math.round(76 * timelineDensity)), [timelineDensity]);
  const timelineThumbHeight = useMemo(() => Math.max(32, Math.round(38 * timelineDensity)), [timelineDensity]);
  const tickerPreviewVisual = useMemo(() => getTickerVisualConfig({
    styleName: newsStyle,
    themeColor: tickerAccentColor || themeColor,
    footerOpacity: footerOpacity ?? 0.85,
    fontColor: footerFontColor,
    isTop: footerPosition === 'top',
    isMobile: false,
    layout,
  }), [newsStyle, tickerAccentColor, themeColor, footerOpacity, footerFontColor, footerPosition, layout]);
  const tickerPreviewText = useMemo(() => buildTickerText(footerText), [footerText]);
  const tickerPreviewSpeed = useMemo(() => getTickerSpeedDuration(tickerSpeed), [tickerSpeed]);

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
          setWeatherPosition(p.weather_position || 'top-left');
          setSocialPosition(p.social_position || 'bottom-right');
          setClockAccentColor(p.clock_accent_color || '#818cf8');
          setWeatherAccentColor(p.weather_accent_color || '#38bdf8');
          setSocialAccentColor(p.social_accent_color || '#a855f7');
          setTickerAccentColor(p.ticker_accent_color || '#6366f1');
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
        weather_position: weatherPosition,
        social_position: socialPosition,
        clock_accent_color: clockAccentColor,
        weather_accent_color: weatherAccentColor,
        social_accent_color: socialAccentColor,
        ticker_accent_color: tickerAccentColor,
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

  const totalDuration = selectedItems.reduce((acc, item) => acc + (item.duration || 10), 0);
  const totalImagens = selectedItems.filter((item) => item.media?.type === 'image').length;
  const totalVideos = selectedItems.filter((item) => item.media?.type === 'video').length;
  const maiorClip = selectedItems.reduce((maior, item) => Math.max(maior, item.duration || 0), 0);

  const formatarTempo = (segundos) => {
    if (segundos >= 3600) {
      return `${Math.floor(segundos / 3600)}h ${Math.floor((segundos % 3600) / 60).toString().padStart(2, '0')}m`;
    }
    if (segundos >= 60) {
      return `${Math.floor(segundos / 60)}:${(segundos % 60).toString().padStart(2, '0')}`;
    }
    return `0:${segundos.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  const applyThemeModel = (preset) => {
    setThemePremium(preset);
    setUseCustomPos(false);

    switch (preset) {
      case 'Corporate':
        setThemeColor('#2563eb');
        setLayout('with_footer');
        setFooterPosition('top');
        setNewsStyle('minimal');
        setFooterFontColor('#e2e8f0');
        setTickerLabel('Comunicados');
        setTickerHeight(86);
        setTickerSpeed('medium');
        setTransitionEffect('fade');
        setTransitionDuration('1.1s');
        setOverlayStyle('gradient');
        setShowClock(true);
        setClockStyle('digital_solid');
        setClockCardStyle('glass_pro');
        setWidgetPosition('top-right');
        setClockSize(94);
        setClockAccentColor('#60a5fa');
        setShowWeather(true);
        setWeatherCardStyle('light');
        setWeatherPosition('top-left');
        setWeatherSize(88);
        setWeatherAccentColor('#38bdf8');
        setWeatherCity('Cuiabá - MT');
        setShowSocial(false);
        setSocialPosition('bottom-right');
        setTickerAccentColor('#2563eb');
        setLogoPosition('top-right');
        break;
      case 'Cyberpunk':
        setThemeColor('#22d3ee');
        setLayout('with_footer');
        setFooterPosition('bottom');
        setNewsStyle('neon');
        setFooterFontColor('#ecfeff');
        setTickerLabel('AO VIVO');
        setTickerHeight(94);
        setTickerSpeed('fast');
        setTransitionEffect('slide');
        setTransitionDuration('0.9s');
        setOverlayStyle('vignette');
        setShowClock(true);
        setClockStyle('big_bold');
        setClockCardStyle('neon');
        setWidgetPosition('top-center');
        setClockSize(110);
        setClockAccentColor('#22d3ee');
        setShowWeather(true);
        setWeatherCardStyle('dark');
        setWeatherPosition('top-right');
        setWeatherSize(92);
        setWeatherAccentColor('#06b6d4');
        setShowSocial(true);
        setSocialCardStyle('neon');
        setSocialPosition('bottom-right');
        setSocialSize(96);
        setSocialAccentColor('#f43f5e');
        setTickerAccentColor('#22d3ee');
        setShowProgressBar(true);
        break;
      case 'Luxury Gold':
        setThemeColor('#d4a017');
        setLayout('floating');
        setFooterPosition('bottom');
        setNewsStyle('elegant');
        setFooterFontColor('#fef3c7');
        setTickerLabel('Destaque');
        setTickerHeight(88);
        setTickerSpeed('slow');
        setTransitionEffect('fade');
        setTransitionDuration('1.4s');
        setOverlayStyle('vignette');
        setShowClock(true);
        setClockStyle('analog_modern');
        setClockCardStyle('border_classic');
        setWidgetPosition('top-right');
        setClockSize(98);
        setClockAccentColor('#d4a017');
        setShowWeather(true);
        setWeatherCardStyle('border_classic');
        setWeatherPosition('top-left');
        setWeatherSize(90);
        setWeatherAccentColor('#fbbf24');
        setShowSocial(true);
        setSocialCardStyle('border_classic');
        setSocialPosition('bottom-left');
        setSocialSize(88);
        setSocialAccentColor('#d4a017');
        break;
      case 'Minimalist':
        setThemeColor('#0f172a');
        setLayout('fullscreen');
        setFooterPosition('bottom');
        setNewsStyle('minimal');
        setFooterFontColor('#f8fafc');
        setTickerLabel('');
        setTickerHeight(68);
        setTickerSpeed('slow');
        setTransitionEffect('fade');
        setTransitionDuration('1s');
        setOverlayStyle('none');
        setShowClock(true);
        setClockStyle('digital_solid');
        setClockCardStyle('minimalist');
        setWidgetPosition('top-right');
        setClockSize(88);
        setClockAccentColor('#0f172a');
        setShowWeather(true);
        setWeatherCardStyle('light');
        setWeatherPosition('top-left');
        setWeatherSize(84);
        setWeatherAccentColor('#64748b');
        setShowSocial(false);
        setShowProgressBar(false);
        break;
      case 'Neon Vibrant':
        setThemeColor('#f43f5e');
        setLayout('with_footer');
        setFooterPosition('bottom');
        setNewsStyle('modern');
        setFooterFontColor('#fff7ed');
        setTickerLabel('Promoções');
        setTickerHeight(102);
        setTickerSpeed('fast');
        setTransitionEffect('zoom');
        setTransitionDuration('0.8s');
        setOverlayStyle('gradient');
        setShowClock(true);
        setClockCardStyle('glass_pro');
        setWidgetPosition('top-center');
        setClockSize(104);
        setClockAccentColor('#22d3ee');
        setShowWeather(true);
        setWeatherCardStyle('glass_pro');
        setWeatherPosition('top-left');
        setWeatherSize(92);
        setWeatherAccentColor('#f43f5e');
        setShowSocial(true);
        setSocialCardStyle('light');
        setSocialPosition('bottom-center');
        setSocialSize(94);
        setSocialAccentColor('#f43f5e');
        break;
      case 'Fast Food':
        setThemeColor('#ef4444');
        setLayout('split');
        setFooterPosition('bottom');
        setNewsStyle('news_channel');
        setFooterFontColor('#111827');
        setTickerLabel('Combo do Dia');
        setTickerHeight(96);
        setTickerSpeed('medium');
        setTransitionEffect('slide');
        setTransitionDuration('0.9s');
        setOverlayStyle('gradient');
        setShowClock(false);
        setShowWeather(false);
        setShowSocial(true);
        setSocialCardStyle('light');
        setSocialPosition('bottom-right');
        setSocialSize(90);
        setSocialAccentColor('#ef4444');
        setShowProgressBar(true);
        break;
      case 'Supermercado':
        setThemeColor('#16a34a');
        setLayout('with_footer');
        setFooterPosition('top');
        setNewsStyle('classic');
        setFooterFontColor('#ffffff');
        setTickerLabel('Ofertas');
        setTickerHeight(90);
        setTickerSpeed('medium');
        setTransitionEffect('fade');
        setTransitionDuration('1s');
        setOverlayStyle('gradient');
        setShowClock(true);
        setClockCardStyle('dark');
        setWidgetPosition('top-right');
        setClockSize(92);
        setClockAccentColor('#16a34a');
        setShowWeather(false);
        setShowSocial(false);
        setShowProgressBar(true);
        break;
      default:
        break;
    }

    addToast('info', 'Tema aplicado', `Layout e identidade visual de ${preset} aplicados automaticamente.`);
  };

  const applyColorPreset = (presetId) => {
    const preset = COLOR_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setColorPreset(preset.id);
    setThemeColor(preset.cor);
    setFooterFontColor(preset.texto);
    setFooterOpacity(preset.transparencia);
    setOverlayStyle(preset.overlay);
    setNewsStyle(preset.estilo);
    setClockCardStyle(preset.cardStyle);
    setWeatherCardStyle(preset.cardStyle);
    setSocialCardStyle(preset.cardStyle);
    setWidgetPosition(preset.clockPos);
    setWeatherPosition(preset.weatherPos);
    setSocialPosition(preset.socialPos);
    setClockAccentColor(preset.cor);
    setWeatherAccentColor(preset.cor);
    setSocialAccentColor(preset.cor);
    setTickerAccentColor(preset.cor);
    addToast('info', 'Paleta aplicada', `A paleta ${preset.nome} foi aplicada ao plano.`);
  };

  const applyWidgetPreset = (widgetType, presetId) => {
    const preset = WIDGET_LAYOUT_PRESETS[widgetType]?.find((item) => item.id === presetId);
    if (!preset) return;
    setWidgetPreset(`${widgetType}-${preset.id}`);
    setUseCustomPos(false);

    if (widgetType === 'clock') {
      setWidgetPosition(preset.position);
      setSelectedElement('clock');
    }

    if (widgetType === 'weather') {
      setWeatherPosition(preset.position);
      setSelectedElement('weather');
    }

    if (widgetType === 'social') {
      setSocialPosition(preset.position);
      setSelectedElement('social');
    }

    if (widgetType === 'ticker') {
      setTickerHeight(preset.height);
      setTickerSpeed(preset.speed);
      setSelectedElement('ticker');
    }
  };

  const getPreviewOffset = (ref) => (
    ref.current
      ? { x: Math.round(ref.current.offsetLeft || 0), y: Math.round(ref.current.offsetTop || 0) }
      : null
  );

  const syncCustomPositionsFromPreview = () => {
    const clock = getPreviewOffset(clockWidgetRef) || { x: clockX, y: clockY };
    const weather = getPreviewOffset(weatherWidgetRef) || { x: weatherX, y: weatherY };
    const social = getPreviewOffset(socialWidgetRef) || { x: socialX, y: socialY };
    const ticker = getPreviewOffset(tickerWidgetRef) || { x: tickerX, y: tickerY };

    setClockX(clock.x);
    setClockY(clock.y);
    setWeatherX(weather.x);
    setWeatherY(weather.y);
    setSocialX(social.x);
    setSocialY(social.y);
    setTickerX(ticker.x);
    setTickerY(ticker.y);

    return { clock, weather, social, ticker };
  };

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    const currentOffset = getPreviewOffset(
      type === 'clock' ? clockWidgetRef :
      type === 'weather' ? weatherWidgetRef :
      type === 'social' ? socialWidgetRef :
      tickerWidgetRef
    );

    setDragging({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialX: useCustomPos
        ? (type === 'clock' ? clockX : type === 'weather' ? weatherX : type === 'social' ? socialX : tickerX)
        : (currentOffset?.x ?? 0),
      initialY: useCustomPos
        ? (type === 'clock' ? clockY : type === 'weather' ? weatherY : type === 'social' ? socialY : tickerY)
        : (currentOffset?.y ?? 0),
      active: false,
    });
    setSelectedElement(type);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / canvasZoom;
    const dy = (e.clientY - dragging.startY) / canvasZoom;
    const shouldStartDrag = dragging.active || Math.hypot(dx, dy) > 4;
    if (!shouldStartDrag) return;

    let initialX = dragging.initialX;
    let initialY = dragging.initialY;
    if (!dragging.active) {
      const offsets = syncCustomPositionsFromPreview();
      initialX = offsets[dragging.type]?.x ?? dragging.initialX;
      initialY = offsets[dragging.type]?.y ?? dragging.initialY;
      setUseCustomPos(true);
      setDragging({ ...dragging, active: true, initialX, initialY });
    }

    if (dragging.type === 'clock') {
      setClockX(initialX + dx);
      setClockY(initialY + dy);
    } else if (dragging.type === 'weather') {
      setWeatherX(initialX + dx);
      setWeatherY(initialY + dy);
    } else if (dragging.type === 'social') {
      setSocialX(initialX + dx);
      setSocialY(initialY + dy);
    } else if (dragging.type === 'ticker') {
      setTickerX(initialX + dx);
      setTickerY(initialY + dy);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <span style={{ fontSize: '1.2rem' }}>🎬</span>
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>{playlist.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
              <span style={{ fontSize: '0.65rem', color: '#71717a', fontWeight: '600', textTransform: 'uppercase' }}>Editor Pro • Nuvem Sincronizada</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#18181b', borderRadius: '20px', border: '1px solid #27272a' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: saving ? '#eab308' : '#22c55e', animation: saving ? 'pulse 1.5s infinite' : 'none' }}></div>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: '600' }}>{saving ? 'Sincronizando...' : 'Alterações Salvas'}</span>
          </div>
          <button className="btn btn-outline" style={{ background: '#27272a', borderColor: '#3f3f46', color: '#fff', borderRadius: '10px' }} onClick={() => navigate('/playlists')}>Descartar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)', border: 'none', boxShadow: '0 8px 20px rgba(99,102,241,0.35)', padding: '10px 24px', borderRadius: '10px', fontWeight: '700' }}>
            {saving ? 'Publicando...' : 'Publicar na TV 🚀'}
          </button>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: '80px', background: '#09090b', borderRight: '1px solid #1a1a1f', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '8px', zIndex: 10 }}>
          {[
            { id: 'medias', icon: '🖼️', label: 'Mídias' },
            { id: 'themes', icon: '✨', label: 'Estilos' },
            { id: 'widgets', icon: '🧩', label: 'Widgets' },
            { id: 'overlays', icon: '🎬', label: 'Efeitos' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedElement(null); }} style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '64px', height: '64px', borderRadius: '16px',
              justifyContent: 'center',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', 
              color: activeTab === tab.id ? '#818cf8' : '#52525b',
              cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent'
            }}>
              <span style={{ fontSize: '1.4rem', filter: activeTab === tab.id ? 'grayscale(0)' : 'grayscale(1) opacity(0.5)' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* SUB-SIDEBAR - TOOL OPTIONS */}
        <div style={{ width: '280px', background: '#121214', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', zIndex: 9, overflowY: 'auto' }}>
          
          {activeTab === 'themes' && (
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '10px' }}>Modelos Prontos</h3>
              <p style={{ fontSize: '0.75rem', lineHeight: 1.5, color: '#71717a', marginBottom: '18px' }}>
                Cada modelo ajusta layout, ticker, widgets, paleta e transições automaticamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {THEME_MODELOS.map((tema) => (
                  <div key={tema.id} onClick={() => applyThemeModel(tema.id)} style={{ 
                    padding: '14px', borderRadius: '16px', background: themePremium === tema.id ? 'rgba(99,102,241,0.12)' : '#18181b', 
                    border: themePremium === tema.id ? '1px solid #6366f1' : '1px solid #27272a', cursor: 'pointer',
                    boxShadow: themePremium === tema.id ? '0 0 20px rgba(99,102,241,0.22)' : 'none', transition: 'all 0.2s',
                    overflow: 'hidden'
                  }}>
                    <div style={{ height: '84px', borderRadius: '14px', background: tema.gradiente, marginBottom: '12px', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12))' }} />
                      <div style={{ position: 'absolute', left: '12px', right: '12px', top: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fff', letterSpacing: '0.4px' }}>{tema.titulo}</span>
                        <span style={{ fontSize: '0.58rem', fontWeight: '800', color: tema.chip, background: 'rgba(255,255,255,0.14)', padding: '4px 8px', borderRadius: '999px' }}>Preset</span>
                      </div>
                      <div style={{ position: 'absolute', left: '12px', right: '12px', bottom: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.55rem', color: '#fff', background: 'rgba(15,23,42,0.38)', padding: '3px 8px', borderRadius: '999px' }}>Cor {tema.cor}</span>
                        <span style={{ fontSize: '0.55rem', color: '#fff', background: 'rgba(15,23,42,0.38)', padding: '3px 8px', borderRadius: '999px' }}>Widgets guiados</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800' }}>{tema.id}</div>
                      <div style={{ width: '34px', height: '34px', borderRadius: '999px', background: tema.cor, boxShadow: `0 0 0 4px ${tema.chip}22` }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#b4b4bb', lineHeight: 1.5, marginBottom: '10px' }}>{tema.descricao}</div>
                    <div style={{ fontSize: '0.63rem', color: '#71717a', background: '#111113', border: '1px solid #27272a', borderRadius: '10px', padding: '8px 10px', lineHeight: 1.45 }}>
                      <strong style={{ color: '#d4d4d8' }}>Widgets sugeridos:</strong> {tema.widgets}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'medias' && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Biblioteca Visual</h3>
              <input type="text" value={mediaSearch} onChange={(e) => setMediaSearch(e.target.value)} placeholder="Buscar mídias..." style={{ width: '100%', padding: '10px 14px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', marginBottom: '16px' }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', overflowY: 'auto' }}>
                {mediasFiltradas.map(m => (
                  <div key={m.id} onClick={() => addMedia(m)} style={{ 
                    position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'grab',
                    border: selectedItems.some(i => i.media_id === m.id) ? '2px solid #6366f1' : '1px solid #27272a',
                    aspectRatio: '16/9', background: '#000'
                  }}>
                    {m.type === 'image' ? (
                      <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <video src={m.url + "#t=0.1"} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 8px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', fontSize: '0.65rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </div>
                  </div>
                ))}
              </div>
              {mediasFiltradas.length === 0 && (
                <div style={{ marginTop: '14px', padding: '18px', borderRadius: '12px', border: '1px dashed #27272a', color: '#71717a', textAlign: 'center', fontSize: '0.75rem' }}>
                  Nenhuma mídia encontrada com esse filtro.
                </div>
              )}
            </div>
          )}

          {activeTab === 'widgets' && (
            <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '10px' }}>Estudio de Widgets</h3>
              <div style={{ fontSize: '0.68rem', color: '#71717a', marginBottom: '16px', lineHeight: 1.5 }}>
                Cada card abaixo resume o estado atual do widget e leva direto para os ajustes detalhados.
              </div>

              <div style={{
                marginBottom: '18px',
                padding: '12px 14px',
                borderRadius: '16px',
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                fontSize: '0.68rem',
                lineHeight: 1.5
              }}>
                Edite cada widget dentro do próprio card abaixo. Assim a posição, o tamanho e o estilo ficam no mesmo lugar, sem duplicar controles.
              </div>
              <div style={{ marginBottom: '12px', padding: '14px', background: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }}>
                <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  Transparência dos cards <span>{Math.round(cardTransparency * 100)}%</span>
                </label>
                <input type="range" min="0" max="1" step="0.05" value={cardTransparency} onChange={e => setCardTransparency(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </div>
              
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Posição:</label>
                        <select value={widgetPosition} onChange={e => { setWidgetPosition(e.target.value); setUseCustomPos(false); }} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          <option value="top-right">Topo direito</option>
                          <option value="top-left">Topo esquerdo</option>
                          <option value="top-center">Topo centro</option>
                          <option value="bottom-right">Inferior direito</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Card:</label>
                        <select value={clockCardStyle} onChange={e => setClockCardStyle(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          {CARD_STYLE_PREVIEWS.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Cor de destaque:</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="color" value={clockAccentColor} onChange={e => setClockAccentColor(e.target.value)} style={{ width: '32px', height: '30px', border: 'none', background: 'none', cursor: 'pointer' }} />
                        <input value={clockAccentColor} onChange={e => setClockAccentColor(e.target.value)} style={{ flex: 1, padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
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
                          <input type="color" value={tickerAccentColor} onChange={e => setTickerAccentColor(e.target.value)} style={{ width: '30px', height: '30px', border: 'none', background: 'none', cursor: 'pointer' }} />
                          <input value={tickerAccentColor} onChange={e => setTickerAccentColor(e.target.value)} style={{ flex: 1, padding: '4px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.7rem' }} />
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
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '8px' }}>Posição:</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { value: 'bottom', label: 'Rodape' },
                            { value: 'top', label: 'Topo' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setFooterPosition(option.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                background: footerPosition === option.value ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                                border: footerPosition === option.value ? '1px solid #6366f1' : '1px solid #27272a',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Altura: {tickerHeight}px</label>
                      <input type="range" min="40" max="180" value={tickerHeight} onChange={e => setTickerHeight(parseInt(e.target.value))} style={{ width: '100px' }} />
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
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Cidade:</label>
                      <input value={weatherCity} onChange={e => setWeatherCity(e.target.value)} placeholder="Ex: Cuiabá - MT" style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Posição:</label>
                        <select value={weatherPosition} onChange={e => { setWeatherPosition(e.target.value); setUseCustomPos(false); }} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          <option value="top-left">Topo esquerdo</option>
                          <option value="top-right">Topo direito</option>
                          <option value="top-center">Topo centro</option>
                          <option value="bottom-right">Inferior direito</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Card:</label>
                        <select value={weatherCardStyle} onChange={e => setWeatherCardStyle(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          {CARD_STYLE_PREVIEWS.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Cor de destaque:</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="color" value={weatherAccentColor} onChange={e => setWeatherAccentColor(e.target.value)} style={{ width: '32px', height: '30px', border: 'none', background: 'none', cursor: 'pointer' }} />
                        <input value={weatherAccentColor} onChange={e => setWeatherAccentColor(e.target.value)} style={{ flex: 1, padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                    </div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Plataforma:</label>
                        <select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          <option value="instagram">Instagram</option>
                          <option value="tiktok">TikTok</option>
                          <option value="youtube">YouTube</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Posição:</label>
                        <select value={socialPosition} onChange={e => { setSocialPosition(e.target.value); setUseCustomPos(false); }} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          <option value="bottom-right">Inferior direito</option>
                          <option value="bottom-left">Inferior esquerdo</option>
                          <option value="bottom-center">Inferior centro</option>
                          <option value="top-right">Topo direito</option>
                          <option value="top-left">Topo esquerdo</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Perfil:</label>
                      <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder="@seu_negocio" style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Card:</label>
                        <select value={socialCardStyle} onChange={e => setSocialCardStyle(e.target.value)} style={{ width: '100%', padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }}>
                          {CARD_STYLE_PREVIEWS.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                        </select>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'end', gap: '8px', cursor: 'pointer', fontSize: '0.72rem', color: '#a1a1aa', paddingBottom: '6px' }}>
                        <input type="checkbox" checked={socialQrcode} onChange={e => setSocialQrcode(e.target.checked)} />
                        QR Code
                      </label>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Cor de destaque:</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="color" value={socialAccentColor} onChange={e => setSocialAccentColor(e.target.value)} style={{ width: '32px', height: '30px', border: 'none', background: 'none', cursor: 'pointer' }} />
                        <input value={socialAccentColor} onChange={e => setSocialAccentColor(e.target.value)} style={{ flex: 1, padding: '6px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem' }} />
                      </div>
                    </div>
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
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '1px', marginBottom: '20px' }}>Efeitos de Transição</h3>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff', marginBottom: '12px', display: 'block' }}>Transição Global</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select value={transitionEffect} onChange={e => setTransitionEffect(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                    <option value="fade">Fade (Crossfade Suave)</option>
                    <option value="slide-h">Slide Horizontal</option>
                    <option value="slide-v">Slide Vertical</option>
                    <option value="zoom">Zoom Suave</option>
                    <option value="dissolve">Dissolve (Cinematográfico)</option>
                    <option value="cut">Corte Rápido</option>
                  </select>
                  <p style={{ fontSize: '0.62rem', color: '#71717a', lineHeight: 1.4 }}>
                    O sistema Dual-Layer garante trocas sem piscadas pretas entre as mídias.
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff', marginBottom: '12px', display: 'block' }}>Overlay de Estilo</label>
                <select value={overlayStyle} onChange={e => setOverlayStyle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                  <option value="none">Nenhum</option>
                  <option value="vignette">Vinheta Escura (Bordas)</option>
                  <option value="gradient">Gradiente Inferior Escuro</option>
                  <option value="noise">Textura de Ruído (Film)</option>
                  <option value="glass">Glassmorphism Blur</option>
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
                    ref={clockWidgetRef}
                    onMouseDown={(e) => handleMouseDown(e, 'clock')}
                    style={{ 
                      ...getWidgetBaseStyle(clockCardStyle, cardTransparency, clockAccentColor || themeColor, 'clock'),
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
                    ref={socialWidgetRef}
                    onMouseDown={(e) => handleMouseDown(e, 'social')}
                    style={{ 
                      ...getWidgetBaseStyle(socialCardStyle, cardTransparency, socialAccentColor || themeColor, 'social'),
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
                    ref={weatherWidgetRef}
                    onMouseDown={(e) => handleMouseDown(e, 'weather')}
                    style={{ 
                      ...getWidgetBaseStyle(weatherCardStyle, cardTransparency, weatherAccentColor || themeColor, 'weather'),
                      position: 'absolute', 
                      left: useCustomPos ? `${weatherX}px` : (weatherPosition.split('-')[1] === 'right' ? 'auto' : weatherPosition.includes('center') ? '50%' : '40px'),
                      top: useCustomPos ? `${weatherY}px` : (weatherPosition.split('-')[0] === 'bottom' ? 'auto' : '40px'),
                      right: !useCustomPos && weatherPosition.split('-')[1] === 'right' ? '40px' : 'auto',
                      bottom: !useCustomPos && weatherPosition.split('-')[0] === 'bottom' ? '40px' : 'auto',
                      transform: `${!useCustomPos && weatherPosition.includes('center') ? 'translateX(-50%) ' : ''}scale(${weatherSize / 100})`, 
                      transformOrigin: useCustomPos ? 'top left' : `${weatherPosition.split('-')[0]} ${weatherPosition.split('-')[1]}`,
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
                  const color = tickerAccentColor || themeColor || '#818cf8';
                  const tickerVisual = getTickerVisualConfig({
                    styleName,
                    themeColor: color,
                    footerOpacity,
                    fontColor: footerFontColor,
                    isTop,
                    isMobile: false,
                    layout,
                  });
                  const tickerScrollStyle = {
                    ...tickerVisual.contentStyle,
                    animation: `scrollText${tickerDirection.toUpperCase()} ${tickerPreviewSpeed} linear infinite`,
                    fontSize: footerFontSize,
                    fontWeight: tickerFontWeight,
                    paddingLeft: tickerDirection === 'rtl' ? '16px' : tickerVisual.contentStyle.paddingLeft,
                    paddingRight: tickerDirection === 'ltr' ? '16px' : tickerVisual.contentStyle.paddingRight,
                    textShadow: styleName === 'news_channel' ? 'none' : '0 1px 2px rgba(0,0,0,0.16)',
                  };
                  const tickerText = buildTickerText(footerText);
                  const tickerWidth = layout === 'floating' ? '90%' : '100%';

                  return (
                    <div 
                      ref={tickerWidgetRef}
                      onMouseDown={(e) => handleMouseDown(e, 'ticker')}
                      style={{ 
                        position: 'absolute', 
                        left: useCustomPos ? `${tickerX}px` : (layout === 'floating' ? '5%' : '0'),
                        top: useCustomPos ? `${tickerY}px` : (isTop ? (layout === 'floating' ? '40px' : 0) : 'auto'),
                        bottom: !useCustomPos && !isTop ? (layout === 'floating' ? '40px' : 0) : 'auto', 
                        width: tickerWidth, 
                        height: `${tickerHeight}px`,
                        overflow: 'hidden',
                        color: styleName === 'news_channel' ? '#111827' : footerFontColor,
                        display: 'flex', alignItems: 'stretch', zIndex: 20, 
                        cursor: 'move',
                        outline: selectedElement === 'ticker' ? '2px solid #6366f1' : 'none',
                        borderRadius: layout === 'floating' ? '24px' : 0,
                        ...tickerVisual.containerStyle
                      }}
                    >
                      <div style={tickerVisual.accentStyle} />
                      <div style={tickerVisual.topLineStyle} />
                      {tickerLabel && tickerLabel.trim() !== "" && (
                        <div style={{ 
                          ...tickerVisual.labelStyle,
                          minWidth: '140px'
                        }}>
                          <span style={tickerVisual.labelDotStyle} />
                          {tickerLabel}
                        </div>
                      )}
                      <div style={{ ...tickerScrollStyle, minHeight: '100%' }}>
                        <div style={tickerVisual.messageStyle}>
                          <span style={tickerVisual.labelDotStyle} />
                          {tickerText}
                        </div>
                        <div style={tickerVisual.messageStyle}>
                          <span style={tickerVisual.labelDotStyle} />
                          {tickerText}
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
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                const sY = e.clientY;
                const sH = timelineHeight;
                const mv = (ev) => setTimelineHeight(Math.max(150, Math.min(560, sH - (ev.clientY - sY))));
                const up = () => {
                  document.removeEventListener('mousemove', mv);
                  document.removeEventListener('mouseup', up);
                };
                document.addEventListener('mousemove', mv);
                document.addEventListener('mouseup', up);
              }}
              title="Arraste para redimensionar a Timeline"
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '180px',
                height: '18px',
                borderRadius: '999px',
                border: '1px solid #27272a',
                background: 'linear-gradient(180deg, rgba(39,39,42,0.92), rgba(17,17,19,0.96))',
                boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
                cursor: 'ns-resize',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span style={{ width: '22px', height: '2px', borderRadius: '999px', background: '#52525b' }} />
              <span style={{ width: '10px', height: '2px', borderRadius: '999px', background: '#6366f1' }} />
              <span style={{ width: '22px', height: '2px', borderRadius: '999px', background: '#52525b' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '8px 16px', background: '#18181b', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, minHeight: '54px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px' }}>Timeline</span>
                <span style={{ fontSize: '0.6rem', color: '#3f3f46', background: '#1a1a1f', padding: '2px 8px', borderRadius: '8px' }}>{selectedItems.length} clips</span>
                <span style={{ fontSize: '0.6rem', color: '#a1a1aa', background: '#111827', padding: '2px 8px', borderRadius: '8px' }}>{totalImagens} imagens</span>
                <span style={{ fontSize: '0.6rem', color: '#a1a1aa', background: '#1e1b4b', padding: '2px 8px', borderRadius: '8px' }}>{totalVideos} vídeos</span>
                <span style={{ fontSize: '0.6rem', color: '#c4b5fd', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: '8px' }}>altura {Math.round(timelineDensity * 100)}%</span>
                {clipboard && <span style={{ fontSize: '0.55rem', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '8px' }}>📋 Copiado</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ padding: '3px 10px', background: '#1a1a1f', borderRadius: '8px', border: '1px solid #27272a' }}>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700' }}>Maior clip: {formatarTempo(maiorClip)}</span>
                </div>
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
                    {formatarTempo(totalDuration)}
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
              <div style={{ display: 'flex', gap: '6px', padding: '10px 16px 12px', minHeight: `${timelineTrackHeight + 28}px`, alignItems: 'center' }}>
                {selectedItems.length === 0 && (
                  <div style={{ minWidth: '100%', minHeight: `${timelineTrackHeight + 20}px`, border: '2px dashed #27272a', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#52525b', background: 'rgba(24,24,27,0.4)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ width: '60px', height: '60px', background: '#1a1a1f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '8px', border: '1px solid #27272a' }}>🎞️</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#e4e4e7' }}>Sua Timeline está vazia</div>
                    <div style={{ fontSize: '0.75rem', maxWidth: '380px', textAlign: 'center', lineHeight: 1.6, color: '#71717a' }}>
                      Arraste mídias da biblioteca para cá ou clique em "Adicionar" para começar a montar sua sequência de exibição profissional.
                    </div>
                  </div>
                )}
              {selectedItems.map((item, idx) => {
                  const isImg = item.media?.type === 'image';
                  const dur = item.duration || 10;
                  const w = Math.max(60, dur * 8 * timelineZoom);
                  const sel = selectedElement === `media-${idx}`;
                  const inicio = selectedItems.slice(0, idx).reduce((acc, clip) => acc + (clip.duration || 10), 0);
                  return (
                    <React.Fragment key={`tl-frag-${item.media_id}-${idx}`}>
                      {idx > 0 && (
                        <div style={{ 
                          width: '24px', height: '24px', borderRadius: '6px', background: '#27272a', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', color: '#71717a', border: '1px solid #3f3f46',
                          flexShrink: 0, margin: '0 -15px', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          cursor: 'pointer'
                        }}
                        title={`Transição: ${item.transition || 'Padrão'}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedElement(`media-${idx}`); setActiveTab('overlays'); }}
                        >
                          {(() => {
                            const t = item.transition || 'fade';
                            if (t === 'fade') return '✦';
                            if (t === 'slide-h') return '↔';
                            if (t === 'slide-v') return '↕';
                            if (t === 'zoom') return '⊕';
                            if (t === 'dissolve') return '◎';
                            return '—';
                          })()}
                        </div>
                      )}
                      <div key={`tl-${item.media_id}-${idx}`}
                        draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', idx)}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #6366f1'; }}
                      onDragLeave={(e) => e.currentTarget.style.boxShadow = sel ? '0 0 0 2px #6366f1' : 'none'}
                      onDrop={(e) => { e.preventDefault(); e.currentTarget.style.boxShadow = 'none'; const from = parseInt(e.dataTransfer.getData('text/plain')); if (!isNaN(from)) { const n = [...selectedItems]; const [m] = n.splice(from, 1); n.splice(idx, 0, m); setSelectedItems(n); } }}
                      onClick={(e) => { e.stopPropagation(); setSelectedElement(`media-${idx}`); setContextMenu(null); }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedElement(`media-${idx}`); setContextMenu({ x: e.clientX, y: e.clientY, idx }); }}
                      style={{
                        width: `${w}px`, minWidth: '80px', flexShrink: 0,
                        background: sel ? 'linear-gradient(180deg, #1e1b4b, #111113)' : '#161618',
                        borderRadius: '16px', overflow: 'hidden', position: 'relative',
                        boxShadow: sel ? '0 0 0 2px #6366f1, 0 12px 24px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.2)',
                        cursor: resizingMedia ? 'ew-resize' : 'grab',
                        display: 'flex', flexDirection: 'column',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        alignSelf: 'center',
                        height: `${timelineTrackHeight}px`,
                        boxSizing: 'border-box',
                        border: sel ? 'none' : '1px solid #27272a'
                      }}>
                      {/* Thumbnail */}
                      <div style={{ flex: `0 0 ${timelineThumbHeight}px`, position: 'relative', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                        {isImg ? (
                          <img src={item.media?.url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                        ) : (
                          <video src={item.media?.url + "#t=0.1"} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                        )}
                        {/* Type Indicator */}
                        <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.5rem', fontWeight: '900', background: isImg ? 'rgba(16,185,129,0.9)' : 'rgba(99,102,241,0.9)', color: '#fff', backdropFilter: 'blur(4px)', textTransform: 'uppercase' }}>{isImg ? 'Imagem' : 'Vídeo'}</div>
                        {/* Duration badge */}
                        <div
                          onClick={(e) => { e.stopPropagation(); setTimeInput({ idx, value: dur.toString() }); }}
                          style={{ position: 'absolute', bottom: '4px', right: '4px', padding: '2px 7px', borderRadius: '999px', fontSize: '0.55rem', fontWeight: '800', background: 'rgba(0,0,0,0.82)', color: '#c4b5fd', fontFamily: 'monospace', cursor: 'text', border: '1px solid transparent', transition: 'border-color 0.1s', backdropFilter: 'blur(8px)' }}
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
                      <div style={{ padding: '6px 9px', background: '#111113', borderRadius: '0 0 12px 12px', borderTop: '1px solid #1e1e22', flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                        <div style={{ fontSize: `${Math.max(0.55, 0.58 * timelineDensity)}rem`, fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#d4d4d8' }}>{item.media?.name}</div>
                        <div style={{ fontSize: `${Math.max(0.48, 0.52 * timelineDensity)}rem`, color: '#71717a', fontFamily: 'monospace' }}>{formatarTempo(inicio)} - {formatarTempo(inicio + dur)}</div>
                      </div>
                      {/* RIGHT resize handle */}
                      <div onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResizingMedia({ idx, startX: e.clientX, startDur: dur }); }}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', borderRadius: '0', background: sel ? 'linear-gradient(180deg, rgba(99,102,241,0.75), rgba(99,102,241,0.25))' : 'transparent', transition: 'background 0.1s', zIndex: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#6366f1'}
                        onMouseLeave={e => { if (!resizingMedia) e.currentTarget.style.background = sel ? '#6366f1' : 'transparent'; }} />
                    </div>
                  </React.Fragment>
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
        <div style={{ width: activeTab === 'widgets' ? '0' : '320px', background: '#18181b', borderLeft: '1px solid #27272a', display: activeTab === 'widgets' ? 'none' : 'flex', flexDirection: 'column', zIndex: 10, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', color: '#fff' }}>
              {activeTab === 'widgets' ? '🧩 Widgets' :
               selectedElement === 'clock' ? '⌚ Propriedades: Relógio' :
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
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Paletas de Cor</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyColorPreset(preset.id)}
                        style={{
                          border: colorPreset === preset.id ? '1px solid #6366f1' : '1px solid #27272a',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          background: '#18181b',
                          color: '#fff',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: colorPreset === preset.id ? '0 0 18px rgba(99,102,241,0.18)' : 'none',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{
                          height: '58px',
                          background: `linear-gradient(135deg, ${preset.cor}, ${preset.fundo})`,
                          position: 'relative'
                        }}>
                          <div style={{ position: 'absolute', inset: 0, background: preset.overlay === 'none' ? 'transparent' : 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)' }} />
                          <div style={{ position: 'absolute', left: '10px', bottom: '8px', width: '26px', height: '26px', borderRadius: '999px', background: preset.texto, boxShadow: `0 0 0 4px rgba(0,0,0,0.18)` }} />
                        </div>
                        <div style={{ padding: '10px 12px 12px' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#fff' }}>{preset.nome}</div>
                          <div style={{ fontSize: '0.58rem', color: '#a1a1aa', marginTop: '3px' }}>{preset.estilo} • overlay {preset.overlay}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

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

            {activeTab !== 'widgets' && selectedElement === 'clock' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posições Rápidas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.clock.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyWidgetPreset('clock', preset.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: widgetPreset === `clock-${preset.id}` ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: widgetPreset === `clock-${preset.id}` ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>pos</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Posição {preset.position.replace('-', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posição na Tela</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.clock.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setWidgetPosition(preset.position);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: widgetPosition === preset.position ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: widgetPosition === preset.position ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>pos</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Toque para mover sem trocar o estilo</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Efeito Glassmorphism (Blur)</label>
                  <input type="range" min="0" max="1" step="0.1" value={cardTransparency} onChange={e => setCardTransparency(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Cor de Destaque</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="color" value={clockAccentColor} onChange={e => setClockAccentColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
                    <input value={clockAccentColor} onChange={e => setClockAccentColor(e.target.value)} style={{ flex: 1, padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </div>
                 <div>
                   <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Tamanho Rápido</label>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                     {WIDGET_SIZE_PRESETS.map((preset) => (
                       <button
                         key={preset.id}
                         onClick={() => setClockSize(preset.value)}
                         style={{
                           padding: '8px 10px',
                           borderRadius: '10px',
                           cursor: 'pointer',
                           background: clockSize === preset.value ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                           border: clockSize === preset.value ? '1px solid #6366f1' : '1px solid #27272a',
                           color: '#fff',
                           fontSize: '0.7rem',
                           fontWeight: '700'
                         }}
                       >
                         {preset.label}
                       </button>
                     ))}
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>Tamanho: {clockSize}%</label>
                     <input type="range" min="10" max="200" value={clockSize} onChange={e => setClockSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                   </div>
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

            {activeTab !== 'widgets' && selectedElement === 'weather' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posições Rápidas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.weather.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyWidgetPreset('weather', preset.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: widgetPreset === `weather-${preset.id}` ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: widgetPreset === `weather-${preset.id}` ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>pos</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Posição {preset.position.replace('-', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Transparência do Card</label>
                  <input type="range" min="0" max="1" step="0.1" value={cardTransparency} onChange={e => setCardTransparency(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Cor de Destaque</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="color" value={weatherAccentColor} onChange={e => setWeatherAccentColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
                    <input value={weatherAccentColor} onChange={e => setWeatherAccentColor(e.target.value)} style={{ flex: 1, padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Posição Sugerida</label>
                  <select value={weatherPosition} onChange={e => setWeatherPosition(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}>
                    <option value="top-left">Superior Esquerdo</option>
                    <option value="top-right">Superior Direito</option>
                    <option value="bottom-right">Inferior Direito</option>
                    <option value="top-center">Centro Topo</option>
                  </select>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posição na Tela</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.weather.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setWeatherPosition(preset.position);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: weatherPosition === preset.position ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: weatherPosition === preset.position ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>pos</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Posição {preset.position.replace('-', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Localização (Cidade/Estado)</label>
                  <input value={weatherCity} onChange={e => setWeatherCity(e.target.value)} placeholder="Ex: Cuiabá - MT" style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Tamanho Rápido</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    {WIDGET_SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setWeatherSize(preset.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: weatherSize === preset.value ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: weatherSize === preset.value ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>Tamanho: {weatherSize}%</label>
                    <input type="range" min="10" max="200" value={weatherSize} onChange={e => setWeatherSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                  </div>
                </div>
                {useCustomPos && (
                  <button onClick={() => setUseCustomPos(false)} style={{ padding: '8px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>
                    🔄 Resetar para Posição Automática
                  </button>
                )}
              </>
            )}

            {activeTab !== 'widgets' && selectedElement === 'social' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posições Rápidas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.social.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyWidgetPreset('social', preset.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: widgetPreset === `social-${preset.id}` ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: widgetPreset === `social-${preset.id}` ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>{preset.size}%</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Posição {preset.position.replace('-', ' ')} • Card {preset.style}</div>
                      </button>
                    ))}
                  </div>
                </div>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Cor de Destaque</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="color" value={socialAccentColor} onChange={e => setSocialAccentColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
                    <input value={socialAccentColor} onChange={e => setSocialAccentColor(e.target.value)} style={{ flex: 1, padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posição na Tela</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.social.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSocialPosition(preset.position);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: socialPosition === preset.position ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: socialPosition === preset.position ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>pos</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Posição {preset.position.replace('-', ' ')}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>@ Usuário</label>
                  <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} style={{ width: '100%', padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={socialQrcode} onChange={e => setSocialQrcode(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  Gerar QR Code Automático
                </label>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Tamanho Rápido</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                    {WIDGET_SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSocialSize(preset.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: socialSize === preset.value ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: socialSize === preset.value ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa' }}>Tamanho: {socialSize}%</label>
                    <input type="range" min="10" max="200" value={socialSize} onChange={e => setSocialSize(parseInt(e.target.value))} style={{ width: '100px' }} />
                  </div>
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

            {activeTab !== 'widgets' && selectedElement === 'ticker' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '10px', display: 'block' }}>Posições Rápidas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {WIDGET_LAYOUT_PRESETS.ticker.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyWidgetPreset('ticker', preset.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          background: widgetPreset === `ticker-${preset.id}` ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: widgetPreset === `ticker-${preset.id}` ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong style={{ fontSize: '0.76rem' }}>{preset.label}</strong>
                          <span style={{ fontSize: '0.58rem', color: '#a1a1aa', background: '#111827', borderRadius: '999px', padding: '2px 8px' }}>{preset.height}px</span>
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: '4px' }}>Velocidade {preset.speed} • Visual {preset.style}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a1a1aa', marginBottom: '8px', display: 'block' }}>Cor de Destaque</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="color" value={tickerAccentColor} onChange={e => setTickerAccentColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }} />
                    <input value={tickerAccentColor} onChange={e => setTickerAccentColor(e.target.value)} style={{ flex: 1, padding: '10px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </div>
                <div style={{
                  border: '1px solid #27272a',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#0f1115',
                  boxShadow: '0 14px 36px rgba(0,0,0,0.28)'
                }}>
                  <div style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '1px' }}>Prévia ao vivo</div>
                      <div style={{ fontSize: '0.62rem', color: '#71717a', marginTop: '2px' }}>A personalização abaixo reflete o resultado final imediatamente.</div>
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      color: '#a1a1aa',
                      background: '#18181b',
                      border: '1px solid #27272a',
                      padding: '4px 8px',
                      borderRadius: '999px'
                    }}>
                      {newsStyle === 'news_channel' ? 'Jornal' : newsStyle === 'elegant' ? 'Elegante' : newsStyle === 'neon' ? 'Neon' : newsStyle === 'minimal' ? 'Minimal' : 'Clássico'}
                    </span>
                  </div>
                  <div style={{
                    position: 'relative',
                    minHeight: '94px',
                    display: 'flex',
                    alignItems: 'stretch',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      ...tickerPreviewVisual.containerStyle,
                      position: 'relative',
                      inset: 'auto',
                      left: 'auto',
                      width: '100%',
                      minHeight: '94px',
                      height: '100%',
                      boxShadow: 'none',
                      borderRadius: 0
                    }}>
                      <div style={tickerPreviewVisual.accentStyle} />
                      <div style={tickerPreviewVisual.topLineStyle} />
                      {tickerLabel && tickerLabel.trim() !== '' && (
                        <div style={{
                          ...tickerPreviewVisual.labelStyle,
                          minWidth: '142px',
                          boxShadow: 'none'
                        }}>
                          <span style={tickerPreviewVisual.labelDotStyle} />
                          {tickerLabel}
                        </div>
                      )}
                      <div style={{
                        ...tickerPreviewVisual.contentStyle,
                        animation: `scrollText${tickerDirection.toUpperCase()} ${tickerPreviewSpeed} linear infinite`,
                        minHeight: '94px'
                      }}>
                        <span style={tickerPreviewVisual.messageStyle}>
                          <span style={tickerPreviewVisual.labelDotStyle} />
                          {tickerPreviewText}
                        </span>
                        <span style={tickerPreviewVisual.messageStyle}>
                          <span style={tickerPreviewVisual.labelDotStyle} />
                          {tickerPreviewText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '8px 0 10px' }}>
                    {TICKER_HEIGHT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setTickerHeight(preset.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: tickerHeight === preset.value ? 'rgba(99,102,241,0.14)' : '#1a1a1f',
                          border: tickerHeight === preset.value ? '1px solid #6366f1' : '1px solid #27272a',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: '700'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
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
                {useCustomPos && (
                  <button onClick={() => setUseCustomPos(false)} style={{ padding: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f1', borderRadius: '8px', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', marginTop: '10px', width: '100%' }}>
                    🔄 Resetar para Posição Padrão
                  </button>
                )}
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default PlaylistEditor;
