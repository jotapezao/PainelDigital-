import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getTickerVisualConfig, buildTickerText, getTickerSpeedDuration } from '../utils/tickerVisual';
import { limparObjectUrlsDoPlayer, limparCacheLocalDoPlayer, sincronizarPlaylistComCache, carregarPlaylistSalva, carregarPlaylistLocalizadaDaCache } from '../services/playerCache';

function decodificarJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = typeof atob === 'function' ? atob(padded) : window.atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const WeatherIcon = ({ icon, size = 44, color = '#38bdf8' }) => {
  const svgStyle = { display: 'block', flexShrink: 0 };
  const normalizedIcon = `${icon || ''}`.trim();
  
  switch (normalizedIcon) {
    case '☀️': // Sol / Limpo
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <circle cx="12" cy="12" r="4" fill="rgba(253, 224, 71, 0.2)" stroke="#fde047"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="#fde047"></path>
        </svg>
      );
    case '⛅': // Parcialmente nublado
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e4e4e7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M19.07 4.93l-1.41 1.41" stroke="#fde047"></path>
          <path d="M17.5 19A3.5 3.5 0 0 0 13 15.7a5 5 0 0 0-8.9 2.3 3.5 3.5 0 0 0 .4 6.9h13a3.5 3.5 0 0 0 0-7z" fill="rgba(255, 255, 255, 0.15)"></path>
        </svg>
      );
    case '☁️': // Nublado / Encoberto
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <path d="M17.5 19A3.5 3.5 0 0 0 13 15.7a5 5 0 0 0-8.9 2.3 3.5 3.5 0 0 0 .4 6.9h13a3.5 3.5 0 0 0 0-7z" fill="rgba(255, 255, 255, 0.1)"></path>
        </svg>
      );
    case '🌧️': // Chuva / Garoa
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" fill="rgba(255, 255, 255, 0.1)" stroke="#cbd5e1"></path>
          <path d="M8 20v2M12 20v2M16 20v2" stroke={color}></path>
        </svg>
      );
    case '❄️': // Neve
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <path d="m8 2 8 16M20 6H4M4 18l16-12M12 2v20M2 12h20"></path>
        </svg>
      );
    case '⛈️': // Tempestade
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58" fill="rgba(255, 255, 255, 0.1)"></path>
          <path d="m13 16-4 6h3v4l4-6h-3v-4z" fill="#fde047" stroke="#fde047"></path>
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <circle cx="12" cy="12" r="10" fill="rgba(56, 189, 248, 0.1)"></circle>
          <path d="M12 8v4M12 16h.01"></path>
        </svg>
      );
  }
};

const Player = () => {
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('preview');
  const { user, logout } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState('A'); // 'A' ou 'B'
  const [layerA, setLayerA] = useState({ item: null, visible: true, effect: 'none' });
  const [layerB, setLayerB] = useState({ item: null, visible: false, effect: 'none' });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mediaNonce, setMediaNonce] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [deviceCacheEnabled, setDeviceCacheEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('@DigitalSignage:deviceCacheEnabled');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {
      // Mantém o padrão
    }
    return true;
  });
  const [appVersionLabel, setAppVersionLabel] = useState(() => {
    try {
      return localStorage.getItem('@DigitalSignage:appVersionLabel') || '';
    } catch {
      return '';
    }
  });
  const [playerSyncIntervalMinutes, setPlayerSyncIntervalMinutes] = useState(() => {
    try {
      const saved = localStorage.getItem('@DigitalSignage:playerSyncIntervalMinutes');
      const parsed = Number.parseInt(saved, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
    } catch {
      return 2;
    }
  });
  
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);
  const containerRef = useRef(null);
  const currentMediaRef = useRef(null);
  const timerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const clicksRef = useRef(0);
  const clickTimerRef = useRef(null);
  const [showTicker, setShowTicker] = useState(true);
  const tickerTimerRef = useRef(null);
  const mediaFailureTimerRef = useRef(null);

  const [showClockWidget, setShowClockWidget] = useState(true);
  const [showWeatherWidget, setShowWeatherWidget] = useState(true);
  const [showSocialWidget, setShowSocialWidget] = useState(true);
  const [weatherData, setWeatherData] = useState({ temp: '--', icon: '⛅', city: '' });
  const [mediaLoadError, setMediaLoadError] = useState(null);
  const [qrFallbackOffline, setQrFallbackOffline] = useState(false);
  const [qrRetryToken, setQrRetryToken] = useState(0);
  const [qrCachedDataUrl, setQrCachedDataUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date()); // Relógio em tempo real
  const [quotesData, setQuotesData] = useState({}); // Cotações financeiras

  const clockTimerRef = useRef(null);
  const weatherTimerRef = useRef(null);
  const socialTimerRef = useRef(null);
  const weatherCacheRef = useRef(new Map());
  const deviceLocationRef = useRef(null);
  const mediaCacheRef = useRef(new Map());
  const playlistRef = useRef(null);
  const lastManifestVersionRef = useRef(null);
  const qrRetryTimerRef = useRef(null);
  const qrPrefetchAbortRef = useRef(null);
  const MAX_CACHED_VIDEO_BYTES = 45 * 1024 * 1024;
  const DEFAULT_MEDIA_DURATION_SECONDS = 15;

  const getMediaKey = (media) => media?.id || media?.filename || media?.url || media?.name || '';
  const isReusableLocalUrl = (url) => typeof url === 'string' && (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('file:') ||
    url.startsWith('capacitor://') ||
    url.startsWith('content:') ||
    url.startsWith('/')
  );
  const resolveMediaSource = (media) => {
    if (!media) return '';
    const raw = media.url || media.filename || '';
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || isReusableLocalUrl(raw)) return raw;
    
    // Em dispositivos nativos (Android/TV), caminhos relativos como /uploads/ tentam carregar do localhost
    // Resolvemos isso de forma absoluta usando a URL base da nossa API
    const backendHost = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : 'https://midiamais.up.railway.app';
    return `${backendHost}/uploads/${raw.replace(/^\/+/, '')}`;
  };

  const normalizeMediaType = (media) => {
    const typeRaw = `${media?.type || media?.media_type || media?.mime_type || ''}`.toLowerCase();
    const source = `${media?.url || media?.filename || ''}`.toLowerCase();

    if (typeRaw === 'widget') return 'widget';
    if (typeRaw.startsWith('image/') || ['image', 'photo', 'imagem'].includes(typeRaw)) return 'image';
    if (typeRaw.startsWith('video/') || ['video', 'movie', 'vídeo'].includes(typeRaw)) return 'video';

    if (/\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/.test(source)) return 'image';
    if (/\.(mp4|webm|ogg|mov|m4v|avi)(\?|#|$)/.test(source)) return 'video';

    return 'video';
  };

  const getPlayableMediaSource = (media) => {
    if (!media) return '';
    const isVideo = normalizeMediaType(media) === 'video';
    
    if (isVideo && navigator.onLine) {
      // For videos, blob: URLs are extremely unstable on Android TV WebViews.
      // If we are online, we ALWAYS bypass the blob URL and stream directly from the network/server.
      let networkUrl = media.original_url || media.media?.original_url || (media.filename ? `/uploads/${media.filename}` : '');
      if (networkUrl && !networkUrl.startsWith('blob:')) {
        if (!/^https?:\/\//i.test(networkUrl) && !networkUrl.startsWith('data:')) {
          const backendHost = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : 'https://midiamais.up.railway.app';
          const cleanPath = networkUrl.replace(/^\/+/, '');
          networkUrl = `${backendHost}/${cleanPath}`;
        }
        return networkUrl;
      }
    }

    const key = getMediaKey(media);
    const entry = mediaCacheRef.current.get(key);
    if (isVideo && entry?.objectUrl) return entry.objectUrl;
    return resolveMediaSource(media);
  };

  const getOriginalUrl = (media) => media?.original_url || resolveMediaSource(media);
  const getCacheEntry = (media) => mediaCacheRef.current.get(getMediaKey(media));

  const getSocialUrl = () => {
    if (!playlist?.social_handle) return 'https://seusite.com.br';
    if (playlist.social_handle.startsWith('http')) return playlist.social_handle;
    
    let handle = playlist.social_handle?.replace('@', '');
    switch(playlist.social_platform) {
      case 'instagram': return `https://instagram.com/${handle}`;
      case 'twitter': return `https://twitter.com/${handle}`;
      case 'facebook': return `https://facebook.com/${handle}`;
      case 'tiktok': return `https://tiktok.com/@${handle}`;
      case 'youtube': return `https://youtube.com/${handle}`;
      case 'website': return playlist.social_handle.includes('.') ? `https://${playlist.social_handle}` : `https://google.com/search?q=${playlist.social_handle}`;
      default: return `https://${playlist.social_handle}`;
    }
  };

  const socialUrl = getSocialUrl();
  const qrCacheKey = socialUrl ? `@DigitalSignage:lastSocialQrDataUrl:${encodeURIComponent(socialUrl)}` : '';

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('qr_blob_convert_error'));
    reader.readAsDataURL(blob);
  });

  const limparFalhaDeMidiaPendente = () => {
    if (mediaFailureTimerRef.current) {
      clearTimeout(mediaFailureTimerRef.current);
      mediaFailureTimerRef.current = null;
    }
  };

  const limparCacheDeMidiaLocal = () => {
    for (const entry of mediaCacheRef.current.values()) {
      if (entry?.objectUrl) {
        URL.revokeObjectURL(entry.objectUrl);
      }
    }
    mediaCacheRef.current.clear();
  };

  const agendarAvancoPorFalha = (layerId, item, motivo) => {
    const mediaId = item?.media?.id || item?.media_id || item?.id || item?.filename || `layer:${layerId}`;
    if (mediaId && mediaLoadError === mediaId) {
      return;
    }

    setMediaLoadError(mediaId);
    limparFalhaDeMidiaPendente();
    mediaFailureTimerRef.current = setTimeout(() => {
      if (activeLayer === layerId) {
        console.warn('[Player] Avanço automático após falha de mídia:', motivo || mediaId);
        nextMedia();
      }
    }, 1200);
  };

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    let ativo = true;

    const solicitarArmazenamentoPersistente = async () => {
      try {
        if (!navigator?.storage?.persist) return;
        const jaPersistente = typeof navigator.storage.persisted === 'function'
          ? await navigator.storage.persisted()
          : false;
        if (jaPersistente) return;

        const concedido = await navigator.storage.persist();
        if (ativo) {
          console.log(`[Player] Armazenamento persistente ${concedido ? 'ativado' : 'não concedido'}.`);
        }
      } catch (err) {
        if (ativo) {
          console.warn('[Player] Não foi possível ativar armazenamento persistente:', err.message);
        }
      }
    };

    solicitarArmazenamentoPersistente();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const carregarIntervaloSincronizacao = async () => {
      try {
        const response = await api.get('/settings', { timeout: 8000 });
        const intervaloServidor = Number.parseInt(response.data?.player_sync_interval_minutes, 10);
        const versionLabel = `${response.data?.latest_app_version || ''}`.trim();
        const intervaloValido = Number.isFinite(intervaloServidor) && intervaloServidor > 0 ? intervaloServidor : 2;

        if (!active) return;
        setPlayerSyncIntervalMinutes(intervaloValido);
        setAppVersionLabel(versionLabel);
        localStorage.setItem('@DigitalSignage:playerSyncIntervalMinutes', String(intervaloValido));
        if (versionLabel) {
          localStorage.setItem('@DigitalSignage:appVersionLabel', versionLabel);
        }
      } catch (err) {
        const fallback = Number.parseInt(localStorage.getItem('@DigitalSignage:playerSyncIntervalMinutes') || '2', 10);
        if (!active) return;
        setPlayerSyncIntervalMinutes(Number.isFinite(fallback) && fallback > 0 ? fallback : 2);
        setAppVersionLabel(localStorage.getItem('@DigitalSignage:appVersionLabel') || '');
      }
    };

    carregarIntervaloSincronizacao();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (previewId) return;

    let active = true;

    const carregarConfiguracaoDaEmpresa = async () => {
      try {
        const clienteId = user?.client_id || decodificarJwtPayload(localStorage.getItem('pd_device_token') || '')?.client_id || null;
        if (!clienteId) {
          return;
        }

        localStorage.setItem('pd_player_client_id', clienteId);
        const resposta = await api.get(`/clients/${clienteId}`, { timeout: 8000 });
        if (!active) return;
        const cacheAtivo = resposta.data?.cache_enabled !== false;
        setDeviceCacheEnabled(cacheAtivo);
        localStorage.setItem(`@DigitalSignage:clientCacheEnabled:${clienteId}`, String(cacheAtivo));
      } catch (err) {
        if (!active) return;
        console.warn('[Player] Não foi possível carregar a configuração da empresa:', err.message);
      }
    };

    carregarConfiguracaoDaEmpresa();

    return () => {
      active = false;
    };
  }, [previewId, user?.client_id]);

  useEffect(() => {
    if (previewId || deviceCacheEnabled) return;

    let active = true;
    const limpar = async () => {
      try {
        await limparCacheLocalDoPlayer();
        if (!active) return;
        limparCacheDeMidiaLocal();
        limparObjectUrlsDoPlayer();
      } catch (err) {
        console.warn('[Player] Não foi possível limpar o cache local:', err.message);
      }
    };

    limpar();

    return () => {
      active = false;
    };
  }, [previewId, deviceCacheEnabled]);

  useEffect(() => {
    fetchPlaylist();

    // Skip heartbeat if in preview mode
    let heartbeat;
    if (!previewId) {
      const sendHeartbeat = async () => {
        try {
          await api.post('/devices/heartbeat', {
            player_status: isStarted ? 'playing' : 'stopped',
            ip_address: null, 
            current_media: currentMediaRef.current
          });
        } catch (e) {
          console.error('Falha no sinal de vida');
        }
      };
      sendHeartbeat(); 
      heartbeat = setInterval(sendHeartbeat, 20000); 
    }

    const intervalMs = Math.max(1, Number(playerSyncIntervalMinutes) || 2) * 60 * 1000;
    const interval = setInterval(fetchPlaylist, intervalMs);

    const handleOnline = () => {
      console.log('[Player] Conexão restabelecida. Revalidando manifesto...');
      fetchPlaylist();
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      if (heartbeat) clearInterval(heartbeat);
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      limparFalhaDeMidiaPendente();
      limparCacheDeMidiaLocal();
      limparObjectUrlsDoPlayer();
    };
  }, [previewId, isStarted, user, playerSyncIntervalMinutes, deviceCacheEnabled]);

  useEffect(() => {
    let ativo = true;

    const carregarCacheInicial = async () => {
      if (previewId || !deviceCacheEnabled) return;

      const cached = carregarPlaylistSalva();
      if (!cached?.items?.length) return;

      try {
        const playlistLocal = await carregarPlaylistLocalizadaDaCache(cached);
        if (!ativo) return;
        setPlaylist(playlistLocal);
        setLoading(false);
      } catch (erro) {
        console.warn('[Player] Falha ao carregar cache inicial:', erro.message);
      }
    };

    carregarCacheInicial();

    return () => {
      ativo = false;
    };
  }, [previewId, deviceCacheEnabled]);

  // Inicialização da Playlist e Primeira Camada
  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;

    setCurrentIndex(0);
    const firstItem = playlist.items[0];
    setLayerA({ item: firstItem, visible: true, effect: 'none' });
    setLayerB({ item: null, visible: false, effect: 'none' });
    setActiveLayer('A');
    currentMediaRef.current = (firstItem.media || firstItem).name || 'Mídia Inicial';
  }, [playlist?.id, playlist?.manifest?.version]);

  useEffect(() => {
    const currentPlaylist = playlist;
    if (!currentPlaylist || currentPlaylist.items.length === 0) return;
    if (isTransitioning) return;

    const currentItem = activeLayer === 'A' ? layerA.item : layerB.item;
    if (!currentItem) return;

    const itemMedia = currentItem.media || currentItem;
    const type = normalizeMediaType(itemMedia);
    
    currentMediaRef.current = itemMedia.name || currentItem.name || 'Mídia Desconhecida';
    setMediaLoadError(null);
    
    // Configura o timer para a próxima mídia
    // Mesmo quando a mídia é um vídeo sem duração explícita,
    // sempre deixamos um guard rail para evitar travar a reprodução na primeira peça.
    const durationConfigured = Number.parseFloat(currentItem.duration_seconds);
    const isVideo = type === 'video';
    const fallbackDuration = Number.isFinite(durationConfigured) && durationConfigured > 0
      ? durationConfigured
      : (isVideo ? DEFAULT_MEDIA_DURATION_SECONDS : 10);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;

    timerRef.current = setTimeout(nextMedia, fallbackDuration * 1000);
     
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playlist?.id, playlist?.manifest?.version, currentIndex, mediaNonce, activeLayer, isTransitioning, layerA.item, layerB.item]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Controle programático de reprodução/pausa de vídeos para evitar reprodução oculta e garantir carregamento instantâneo
  useEffect(() => {
    if (layerA.visible) {
      if (videoRefA.current) {
        videoRefA.current.play().catch((err) => {
          console.warn('[Player Layer A] Erro ao reproduzir vídeo:', err.message);
        });
      }
    } else {
      if (videoRefA.current) {
        videoRefA.current.pause();
        try {
          if (videoRefA.current.readyState > 0) {
            videoRefA.current.currentTime = 0;
          }
        } catch (e) {
          // Ignora erro se o elemento estiver sem fonte carregada
        }
      }
    }
  }, [layerA.visible, layerA.item]);

  useEffect(() => {
    if (layerB.visible) {
      if (videoRefB.current) {
        videoRefB.current.play().catch((err) => {
          console.warn('[Player Layer B] Erro ao reproduzir vídeo:', err.message);
        });
      }
    } else {
      if (videoRefB.current) {
        videoRefB.current.pause();
        try {
          if (videoRefB.current.readyState > 0) {
            videoRefB.current.currentTime = 0;
          }
        } catch (e) {
          // Ignora erro se o elemento estiver sem fonte carregada
        }
      }
    }
  }, [layerB.visible, layerB.item]);

  // Atualiza o relógio a cada segundo
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Busca cotações financeiras (AwesomeAPI BR — gratuita)
  useEffect(() => {
    if (!playlist?.show_quotes) return;
    const fetchQuotes = async () => {
      try {
        const currencies = (playlist.quotes_currencies || 'USD,EUR,BTC')
          .split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        const pairs = currencies.map(c => `${c}-BRL`).join(',');
        const res = await fetch(`https://economia.awesomeapi.com.br/last/${pairs}`);
        const data = await res.json();
        const parsed = {};
        for (const key of Object.keys(data)) {
          const item = data[key];
          parsed[item.code] = {
            bid: parseFloat(item.bid).toFixed(2),
            pct: parseFloat(item.pctChange).toFixed(2),
            name: item.name,
          };
        }
        setQuotesData(parsed);
      } catch (e) {
        console.error('[Quotes] Erro ao buscar cotações:', e);
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [playlist?.show_quotes, playlist?.quotes_currencies]);

  useEffect(() => {
    if (!playlist || !deviceCacheEnabled) return;
    let cancelled = false;

    const ensureVideoCached = async (media, readyForPlayback = true) => {
      if (!media) return null;
      const type = normalizeMediaType(media);
      const originalUrl = getOriginalUrl(media);
      const cacheKey = getMediaKey(media);
      if (!cacheKey || !originalUrl || type !== 'video') return originalUrl;

      const existing = getCacheEntry(media);
      if (existing?.objectUrl) return existing.objectUrl;
      if (existing?.promise) return existing.promise;

      const task = (async () => {
        try {
          const response = await fetch(originalUrl, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`http_${response.status}`);

          const lengthHeader = response.headers.get('content-length');
          const totalBytes = lengthHeader ? parseInt(lengthHeader, 10) : 0;
          if (totalBytes && totalBytes > MAX_CACHED_VIDEO_BYTES) {
            return originalUrl;
          }

          const blob = await response.blob();
          if (blob.size > MAX_CACHED_VIDEO_BYTES) {
            return originalUrl;
          }

          const objectUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return originalUrl;
          }

          mediaCacheRef.current.set(cacheKey, {
            objectUrl,
            originalUrl,
            readyForPlayback,
          });
          return objectUrl;
        } catch {
          return originalUrl;
        }
      })();

      mediaCacheRef.current.set(cacheKey, {
        promise: task,
        originalUrl,
        readyForPlayback,
      });

      const resolved = await task;
      const entry = mediaCacheRef.current.get(cacheKey);
      if (entry?.promise) {
        delete entry.promise;
        mediaCacheRef.current.set(cacheKey, {
          ...entry,
          objectUrl: resolved,
          readyForPlayback,
        });
      }
      return resolved;
    };

    const pruneCache = (keepKeys) => {
      for (const [key, entry] of mediaCacheRef.current.entries()) {
        if (!keepKeys.has(key) && entry?.objectUrl) {
          URL.revokeObjectURL(entry.objectUrl);
        }
        if (!keepKeys.has(key)) {
          mediaCacheRef.current.delete(key);
        }
      }
    };

    const warmup = async () => {
      const total = playlist.items.length;
      if (total === 0) return;
      const nextIndexes = [currentIndex, currentIndex + 1, currentIndex + 2].map((idx) => idx % total);
      const keepKeys = new Set();

      for (let i = 0; i < nextIndexes.length; i++) {
        const idx = nextIndexes[i];
        const nextItem = playlist.items[idx];
        const nextMedia = nextItem?.media || nextItem;
        const key = getMediaKey(nextMedia);
        if (!key) continue;
        keepKeys.add(key);
        if (i === 0) continue;
        await ensureVideoCached(nextMedia, true);
      }

      pruneCache(keepKeys);

      // Pré-carrega a próxima mídia na camada inativa
      const nextIdx = (currentIndex + 1) % total;
      const nextItem = playlist.items[nextIdx];
      const effect = playlist.transition_effect || 'fade';
      
      if (activeLayer === 'A') {
        setLayerB({ item: nextItem, visible: false, effect: 'none' });
      } else {
        setLayerA({ item: nextItem, visible: false, effect: 'none' });
      }
    };

    warmup();

    return () => {
      cancelled = true;
    };
  }, [playlist, currentIndex, activeLayer, deviceCacheEnabled]);

  useEffect(() => {
    if (!playlist || (playlist.ticker_interval === 0 && playlist.ticker_duration === 0)) {
      setShowTicker(true);
      return;
    }

    const intervalMin = playlist.ticker_interval || 0;
    const durationSec = playlist.ticker_duration || 30; // 30 segundos por padrão

    const intervalMs = (intervalMin || 1) * 60 * 1000;
    const durationMs = durationSec * 1000;

    const runCycle = () => {
      setShowTicker(true);
      tickerTimerRef.current = setTimeout(() => {
        setShowTicker(false);
      }, durationMs);
    };

    runCycle();
    // Inicia um novo ciclo a cada 'intervalMs'
    const cycleInterval = setInterval(runCycle, intervalMs);

    return () => {
      clearInterval(cycleInterval);
      if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current);
    };
  }, [playlist]);

  useEffect(() => {
    if (!playlist) return;

    const setupWidgetCycle = (intervalMin, durationSec, setShow, timerRef) => {
      // Se ambos são 0 ou undefined, o widget fica visível o tempo todo
      if (!intervalMin && !durationSec) {
        setShow(true);
        return () => {};
      }
      
      const intervalMs = (intervalMin || 1) * 60 * 1000;
      const durationMs = (durationSec || 30) * 1000; // 30 segundos padrão
      
      const runCycle = () => {
        setShow(true);
        timerRef.current = setTimeout(() => setShow(false), durationMs);
      };
      
      runCycle();
      const cycleInterval = setInterval(runCycle, intervalMs);
      
      return () => {
        clearInterval(cycleInterval);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    };

    const cleanupClock = setupWidgetCycle(playlist.clock_interval, playlist.clock_duration, setShowClockWidget, clockTimerRef);
    const cleanupWeather = setupWidgetCycle(playlist.weather_interval, playlist.weather_duration, setShowWeatherWidget, weatherTimerRef);
    const cleanupSocial = setupWidgetCycle(playlist.social_interval, playlist.social_duration, setShowSocialWidget, socialTimerRef);

    return () => {
      cleanupClock();
      cleanupWeather();
      cleanupSocial();
    };
  }, [playlist]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!playlist || !playlist.show_weather) return;
      try {
        const fallbackCity = (playlist.weather_city || 'Cuiabá - MT').trim();
        setWeatherData((atual) => ({
          temp: atual?.temp && atual.temp !== '--' ? atual.temp : '--',
          icon: atual?.icon || '⛅',
          city: atual?.city || fallbackCity,
        }));

        const getDevicePosition = () => new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('geolocation_unavailable'));
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            {
              enableHighAccuracy: true,
              timeout: 3500,
              maximumAge: 5 * 60 * 1000,
            }
          );
        });

        let cacheKey = `city:${fallbackCity.toLowerCase()}`;
        const agora = Date.now();
        const cache = weatherCacheRef.current.get(cacheKey);
        if (cache && agora - cache.timestamp < 5 * 60 * 1000) {
          setWeatherData(cache.data);
          return;
        }

        let latitude;
        let longitude;
        let cityLabel = fallbackCity;

        if (!deviceLocationRef.current) {
          try {
            const position = await getDevicePosition();
            deviceLocationRef.current = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
          } catch {
            deviceLocationRef.current = null;
          }
        }

        if (deviceLocationRef.current) {
          latitude = deviceLocationRef.current.latitude;
          longitude = deviceLocationRef.current.longitude;
          cacheKey = `geo:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
          cityLabel = 'Sua localização';
          const cachedGeo = weatherCacheRef.current.get(cacheKey);
          if (cachedGeo && agora - cachedGeo.timestamp < 5 * 60 * 1000) {
            setWeatherData(cachedGeo.data);
            return;
          }
        } else {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(fallbackCity)}&count=5&language=pt&format=json`);
          const geoData = await geoRes.json();
          const bestMatch = geoData.results?.[0];
          if (!bestMatch) {
            setWeatherData({ temp: '--', icon: '⛅', city: fallbackCity });
            return;
          }
          latitude = bestMatch.latitude;
          longitude = bestMatch.longitude;
          cityLabel = [bestMatch.name, bestMatch.admin1 || bestMatch.country].filter(Boolean).join(' - ');
        }

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
        const weatherJson = await weatherRes.json();
        if (weatherJson.current_weather) {
          const code = weatherJson.current_weather.weathercode;
          let icon = '⛅';
          if (code <= 1) icon = '☀️';
          else if (code <= 3) icon = '⛅';
          else if (code <= 45) icon = '☁️';
          else if (code <= 67) icon = '🌧️';
          else if (code <= 77) icon = '❄️';
          else if (code <= 99) icon = '⛈️';

          const dadosClima = {
            temp: Math.round(weatherJson.current_weather.temperature),
            icon,
            city: cityLabel
          };

          weatherCacheRef.current.set(cacheKey, { timestamp: agora, data: dadosClima });
          setWeatherData(dadosClima);
        } else {
          setWeatherData({ temp: '--', icon: '⛅', city: cityLabel || fallbackCity });
        }
      } catch (e) {
        console.error('Weather fetch error:', e);
        const fallbackCity = (playlist?.weather_city || 'Cuiabá - MT').trim();
        setWeatherData({ temp: '--', icon: '⛅', city: fallbackCity });
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [playlist?.weather_city, playlist?.show_weather]);

  useEffect(() => {
    setQrFallbackOffline(false);
    setQrRetryToken((token) => token + 1);
    if (qrRetryTimerRef.current) {
      clearTimeout(qrRetryTimerRef.current);
      qrRetryTimerRef.current = null;
    }
  }, [playlist?.social_handle, playlist?.social_platform, playlist?.social_qrcode]);

  useEffect(() => {
    if (!qrCacheKey) {
      setQrCachedDataUrl('');
      return;
    }

    try {
      const cached = localStorage.getItem(qrCacheKey);
      if (cached) {
        setQrCachedDataUrl(cached);
      } else {
        setQrCachedDataUrl('');
      }
    } catch {
      setQrCachedDataUrl('');
    }
  }, [qrCacheKey]);

  useEffect(() => {
    const handleOnline = () => {
      setQrFallbackOffline(false);
      setQrRetryToken((token) => token + 1);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (!playlist?.social_qrcode || !qrFallbackOffline) return;

    qrRetryTimerRef.current = setTimeout(() => {
      setQrRetryToken((token) => token + 1);
      setQrFallbackOffline(false);
    }, 15000);

    return () => {
      if (qrRetryTimerRef.current) {
        clearTimeout(qrRetryTimerRef.current);
        qrRetryTimerRef.current = null;
      }
    };
  }, [playlist?.social_qrcode, qrFallbackOffline]);

  useEffect(() => {
    if (!playlist?.social_qrcode || !socialUrl || !qrCacheKey) return;

    let ativo = true;
    const controller = new AbortController();
    qrPrefetchAbortRef.current = controller;

    const qrRemoteUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(socialUrl)}&margin=4`;

    const atualizarCacheQr = async () => {
      try {
        const response = await fetch(qrRemoteUrl, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`qr_http_${response.status}`);
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (!ativo || !dataUrl) return;

        setQrCachedDataUrl(dataUrl);
        try {
          localStorage.setItem(qrCacheKey, dataUrl);
        } catch (storageErr) {
          console.warn('[Player] Não foi possível persistir o QR social:', storageErr.message);
        }
      } catch (err) {
        if (!ativo && err.name === 'AbortError') return;
        console.warn('[Player] Não foi possível atualizar o QR social em segundo plano:', err.message);
      }
    };

    atualizarCacheQr();

    return () => {
      ativo = false;
      controller.abort();
    };
  }, [playlist?.social_qrcode, socialUrl, qrCacheKey, qrRetryToken]);

  const fetchPlaylist = async () => {
    try {
      if (!previewId && deviceCacheEnabled && !playlistRef.current) {
        const cached = carregarPlaylistSalva();
        if (cached?.items?.length) {
          try {
            const playlistComUrls = await carregarPlaylistLocalizadaDaCache(cached);
            if (playlistComUrls?.manifest?.version) {
              lastManifestVersionRef.current = playlistComUrls.manifest.version;
            }
            setPlaylist(playlistComUrls);
          } catch (cacheError) {
            console.warn('[Player] Falha ao restaurar cache antes da sincronização:', cacheError.message);
          }
        }
      }

      let response;
      if (previewId) {
        response = await api.get(`/playlists/${previewId}`, { timeout: 8000 });
      } else {
        response = await api.get('/playlists/active/manifest', { timeout: 10000 });
      }
      
      if (response.data && (response.data.items || response.data.media)) {
        let data = response.data;
        if (!data.items && data.media) data.items = data.media;
        const manifestVersion = data.manifest?.version || null;
        if (data.manifest?.version) {
          lastManifestVersionRef.current = data.manifest.version;
        }

        if (!previewId && manifestVersion && playlistRef.current?.manifest?.version === manifestVersion) {
          console.log('[Player] Manifesto sem alterações. Mantendo reprodução local atual.');
          setLoading(false);
          return;
        }
        
        // Fetch RSS if provided
        if (data.rss_url) {
          try {
            // Using a public RSS to JSON proxy for demonstration
            const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(data.rss_url)}`);
            const rssData = await rssRes.json();
            if (rssData.items && rssData.items.length > 0) {
              data.footer_text = rssData.items.map(item => item.title).join(' • ');
            } else {
              data.footer_text = 'Nenhuma notícia disponível no momento.';
            }
          } catch (e) {
            console.error('RSS fetch error:', e);
            data.footer_text = 'Erro ao carregar notícias (Feed indisponível).';
          }
        }
        
        if (!previewId && deviceCacheEnabled) {
          const playlistInicial = await carregarPlaylistLocalizadaDaCache(data);
          // Preserva a versão do manifesto na playlist inicial
          if (!playlistInicial.manifest) playlistInicial.manifest = {};
          playlistInicial.manifest.version = data.manifest?.version || playlistInicial.manifest.version;
          playlistInicial.id = data.id || playlistInicial.id;
          setPlaylist(playlistInicial);
          
          sincronizarPlaylistComCache(data, (playlistCompleta) => {
            console.log('[Player] Cache em segundo plano concluído. Atualizando fontes de mídia para locais.');
            // Preserva a mesma versão do manifesto para não reiniciar a playlist
            if (!playlistCompleta.manifest) playlistCompleta.manifest = {};
            playlistCompleta.manifest.version = data.manifest?.version || playlistCompleta.manifest.version;
            playlistCompleta.id = data.id || playlistCompleta.id;
            lastManifestVersionRef.current = playlistCompleta.manifest.version;
            setPlaylist(playlistCompleta);
          }).catch((syncError) => {
            console.warn('[Player] Falha ao sincronizar cache em segundo plano:', syncError.message);
          });
        } else {
          setPlaylist(data);
        }
      } else if (!playlistRef.current) {
        if (deviceCacheEnabled) {
          const cached = carregarPlaylistSalva();
          if (cached?.items?.length) {
            const playlistComUrls = await carregarPlaylistLocalizadaDaCache(cached);
            setPlaylist(playlistComUrls);
          } else {
            setPlaylist(null);
          }
        } else {
          setPlaylist(null);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar playlist:', error);
      if (!playlistRef.current && !previewId && deviceCacheEnabled) {
        const cached = carregarPlaylistSalva();
        if (cached && (cached.items || cached.media)) {
          console.log('[Player] Sem conexão. Carregando playlist armazenada no cache...');
          const playlistComUrls = await carregarPlaylistLocalizadaDaCache(cached);
          if (playlistComUrls?.manifest?.version) {
            lastManifestVersionRef.current = playlistComUrls.manifest.version;
          }
          setPlaylist(playlistComUrls);
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    }
  };

  const nextMedia = () => {
    if (!playlist || playlist.items.length === 0 || isTransitioning) return;

    const nextIndex = (currentIndex + 1) % playlist.items.length;
    const nextItem = playlist.items[nextIndex];
    const effect = playlist.transition_effect || 'fade';
    
    setIsTransitioning(true);

    const outgoingLayer = activeLayer; // Salva qual camada está saindo ('A' ou 'B')

    if (activeLayer === 'A') {
      // Inicia o vídeo na camada B imediatamente para evitar atraso/tela preta
      if (videoRefB.current) {
        videoRefB.current.play().catch(err => {
          console.warn('[Player] Falha ao iniciar play no B:', err.message);
        });
      }
      // Torna B visível e inicia a transição, mas MANTÉM A visível (para continuar reproduzindo o vídeo/imagem no fade)
      setLayerB({ item: nextItem, visible: true, effect: `${effect}-in` });
      setLayerA(prev => ({ ...prev, effect: `${effect}-out` }));
      setActiveLayer('B');
    } else {
      // Inicia o vídeo na camada A imediatamente para evitar atraso/tela preta
      if (videoRefA.current) {
        videoRefA.current.play().catch(err => {
          console.warn('[Player] Falha ao iniciar play no A:', err.message);
        });
      }
      // Torna A visível e inicia a transição, mas MANTÉM B visível
      setLayerA({ item: nextItem, visible: true, effect: `${effect}-in` });
      setLayerB(prev => ({ ...prev, effect: `${effect}-out` }));
      setActiveLayer('A');
    }

    setCurrentIndex(nextIndex);
    if (nextIndex === currentIndex) setMediaNonce(n => n + 1);

    // Tempo da transição CSS (respeita a configuração da playlist ou padrão 0.8s)
    const transitionDur = parseFloat(playlist.transition_duration) || 0.8;
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      
      // Apenas apaga/pausa a camada que saiu DEPOIS que a transição visual completou totalmente!
      if (outgoingLayer === 'A') {
        setLayerA(prev => ({ ...prev, visible: false, effect: 'none' }));
      } else {
        setLayerB(prev => ({ ...prev, visible: false, effect: 'none' }));
      }
    }, (transitionDur * 1000) + 50); 
  };

  const handleVideoEnd = (layer) => {
    // Só avança se o vídeo que terminou for o da camada ativa
    if (layer === activeLayer) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      nextMedia();
    }
  };


  const isImageMedia = (media) => normalizeMediaType(media) === 'image';

  if (loading) {
    return (
      <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        Carregando Player...
      </div>
    );
  }

  const handleStart = () => {
    setIsStarted(true);
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  // Show logout hint on triple-click anywhere on the player
  const handleTripleClick = () => {
    clicksRef.current++;
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => { clicksRef.current = 0; }, 600);
    
    if (clicksRef.current >= 3) {
      clicksRef.current = 0;
      setShowLogout(true);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => setShowLogout(false), 6000);
    }
  };

  const autoStart = searchParams.get('autoStart') === 'true';
  const isClient = user?.role === 'client';

  // Se for preview, tem que apertar o botão, ou se não for client e não tiver autoStart
  if (!isStarted && !previewId && !autoStart && !isClient) {
    return (
      <div style={{
        background: '#000', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '8px', fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem' }}>Painel Digital</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '40px', fontSize: '0.95rem' }}>
          {user?.name} &mdash; {user?.client_name || 'Cliente'}
        </p>
        <button
          onClick={handleStart}
          className="btn btn-primary"
          style={{ padding: '20px 48px', fontSize: '1.25rem', borderRadius: '16px' }}
        >
          🚀 Iniciar Exibição em Tela Cheia
        </button>
        <button
          onClick={logout}
          style={{ marginTop: '24px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
        >
          Sair da conta
        </button>
      </div>
    );
  }

  if (!playlist || playlist.items.length === 0) {
    return (
      <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '20px' }}>
        Nenhuma mídia programada para este cliente.
      </div>
    );
  }

  const currentItem = playlist.items[currentIndex];
  const itemMedia = currentItem.media || currentItem;
  const mediaUrl = resolveMediaSource(itemMedia);
  const mediaType = normalizeMediaType(itemMedia);
  const transitionEffect = playlist.transition_effect || 'fade';
  const getPlayableMediaSourceStub = (media) => getPlayableMediaSource(media);

  const renderMediaLayer = (layerId, layerData, videoRef) => {
    if (!layerData.item) return null;

    const item = layerData.item;
    const media = item.media || item;
    const type = normalizeMediaType(media);
    const source = getPlayableMediaSource(media);
    const isVisible = layerData.visible;
    const effectClass = layerData.effect !== 'none' ? `effect-${layerData.effect}` : '';
    const layerClass = isVisible ? 'layer-visible' : 'layer-hidden';

    const durSec = parseFloat(playlist.transition_duration) ?? 0.8;
    const transitionDur = `${durSec}s`;

    const mediaStyle = {
      width: '100%',
      height: '100%',
      objectFit: playlist.scale_mode === 'blur-fill' ? 'contain' : (playlist.scale_mode || 'cover'),
      backgroundColor: '#000',
      position: 'absolute',
      top: 0,
      left: 0,
      animationDuration: transitionDur,
    };

    return (
      <div className={`media-layer ${layerClass} ${effectClass}`} key={layerId}>
        {playlist.scale_mode === 'blur-fill' && (
          type === 'image' ? (
            <img src={source} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.6)', transform: 'scale(1.15)', zIndex: 0 }} />
          ) : (
            <video src={source} muted autoPlay={isVisible} preload="auto" playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(40px) brightness(0.6)', transform: 'scale(1.15)', zIndex: 0 }} />
          )
        )}
        
        {type === 'image' ? (
          <img 
            src={source} 
            alt="" 
            style={{ ...mediaStyle, zIndex: 1 }} 
            onLoad={() => {
              if (mediaLoadError === (item.id || currentIndex)) {
                setMediaLoadError(null);
              }
            }}
            onError={() => {
              if (layerId === activeLayer) {
                agendarAvancoPorFalha(layerId, item, 'image_error');
              } else {
                setMediaLoadError(item.id || currentIndex);
              }
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src={source}
            preload="auto"
            autoPlay={isVisible}
            muted 
            playsInline
            onEnded={() => handleVideoEnd(layerId)}
            style={{ ...mediaStyle, zIndex: 1 }}
            onPlaying={() => {
              if (mediaLoadError === (item.id || currentIndex)) {
                setMediaLoadError(null);
              }
            }}
            onLoadedData={() => {
              if (mediaLoadError === (item.id || currentIndex)) {
                setMediaLoadError(null);
              }
            }}
            onError={() => {
              if (layerId === activeLayer) {
                agendarAvancoPorFalha(layerId, item, 'video_error');
              } else {
                setMediaLoadError(item.id || currentIndex);
              }
            }}
          />
        )}
      </div>
    );
  };

  const getScreenRatio = () => {
    if (!playlist) return 1;
    const editorW = playlist.orientation === 'portrait' ? 540 : 960;
    const editorH = playlist.orientation === 'portrait' ? 960 : 540;
    const scaleX = windowWidth / editorW;
    const scaleY = window.innerHeight / editorH;
    return Math.min(scaleX, scaleY);
  };

  const defaultOffsetPx = isMobile ? 20 : (40 * getScreenRatio());
  const defaultOffset = `${defaultOffsetPx}px`;

  const bottomOffsetPx = (playlist?.footer_text || playlist?.layout === 'with_footer') 
    ? ((playlist.ticker_height || 80) + 40) * getScreenRatio() 
    : defaultOffsetPx;
  const bottomOffset = `${bottomOffsetPx}px`;

  const getPositionStyles = (posStr, offset = defaultOffset, bOffset = bottomOffset) => {
    const styles = { position: 'absolute', zIndex: 10 };
    if (!posStr) posStr = 'top-right';
    
    if (posStr.includes('top')) styles.top = offset;
    if (posStr.includes('bottom')) styles.bottom = bOffset;
    
    if (posStr.includes('left')) styles.left = offset;
    if (posStr.includes('right')) styles.right = offset;
    
    if (posStr.includes('center')) {
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
    }
    
    return styles;
  };

  // Helper para estilos de Cards padronizados (6 ESTILOS PREMIUM)
  const getWidgetBaseStyle = (styleType, transparency = 0.5, themeColor = '#818cf8', widgetType = 'default') => {
    const alpha = 0.34 + transparency * 0.4;
    const base = {
      padding: isMobile ? '14px 18px' : '22px 28px',
      borderRadius: '26px',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '12px' : '18px',
      zIndex: 25,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    };
    const tonalidade = {
      clock: `linear-gradient(135deg, rgba(255,255,255,0.12), ${themeColor}22)`,
      weather: `linear-gradient(135deg, ${themeColor}26, rgba(56,189,248,0.18))`,
      social: `linear-gradient(135deg, rgba(255,255,255,0.1), ${themeColor}20)`,
      default: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))`
    };

    switch (styleType) {
      case 'minimalist':
        return { ...base, background: 'none', border: 'none', boxShadow: 'none', backdropFilter: 'none', textShadow: '0 2px 12px rgba(0,0,0,0.8)' };
      case 'light':
        return { ...base, background: `linear-gradient(135deg, rgba(255,255,255,${0.96 - transparency * 0.1}), rgba(255,255,255,${0.84 - transparency * 0.08}))`, color: '#18181b', border: '1px solid rgba(255,255,255,0.72)', boxShadow: '0 18px 42px rgba(15,23,42,0.18)', backdropFilter: 'blur(20px)' };
      case 'dark':
        return { ...base, background: `linear-gradient(135deg, rgba(2,6,23,${alpha + 0.18}), rgba(15,23,42,${alpha}))`, color: '#fff', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' };
      case 'glass_pro':
        return { ...base, background: tonalidade[widgetType] || tonalidade.default, color: '#fff', backdropFilter: 'blur(32px) saturate(180%)', border: '1px solid rgba(255,255,255,0.24)', boxShadow: `0 10px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px ${themeColor}18` };
      case 'neon':
        return { ...base, background: 'linear-gradient(135deg, rgba(2,6,23,0.82), rgba(15,23,42,0.76))', color: '#fff', border: `1px solid ${themeColor}`, boxShadow: `0 0 15px ${themeColor}66, 0 0 45px ${themeColor}22, inset 0 0 20px ${themeColor}10`, backdropFilter: 'blur(8px)', borderRadius: '16px' };
      case 'border_classic':
        return { ...base, background: `linear-gradient(135deg, rgba(0,0,0,${0.72 + transparency * 0.2}), rgba(30,41,59,${0.64 + transparency * 0.14}))`, color: '#fff', border: '2px solid rgba(255,255,255,0.88)', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
      default:
        return { ...base, background: `linear-gradient(135deg, rgba(0,0,0,${0.5 + transparency * 0.4}), rgba(15,23,42,${0.42 + transparency * 0.28}))`, backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' };
    }
  };

  const renderClock = () => {
    const time = currentTime; // usa estado em tempo real
    const clockStyle = playlist?.clock_style || 'digital_solid';
    const themeColor = playlist?.theme_color || '#6366f1';

    if (clockStyle === 'analog_modern') {
      const seconds = time.getSeconds() * 6;
      const minutes = time.getMinutes() * 6;
      const hours = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;

      return (
        <div style={{ width: isMobile ? '120px' : '200px', height: isMobile ? '120px' : '200px', borderRadius: '50%', border: `4px solid ${themeColor}`, position: 'relative', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}>
          <div style={{ position: 'absolute', width: '4px', height: '35%', background: '#fff', left: '50%', top: '15%', transformOrigin: 'bottom', transform: `translateX(-50%) rotate(${hours}deg)`, borderRadius: '4px' }} />
          <div style={{ position: 'absolute', width: '3px', height: '45%', background: '#fff', left: '50%', top: '5%', transformOrigin: 'bottom', transform: `translateX(-50%) rotate(${minutes}deg)`, borderRadius: '3px' }} />
          <div style={{ position: 'absolute', width: '2px', height: '48%', background: themeColor, left: '50%', top: '2%', transformOrigin: 'bottom', transform: `translateX(-50%) rotate(${seconds}deg)` }} />
          <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#fff', borderRadius: '50%', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
      );
    }

    const isBold = clockStyle === 'big_bold';
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: isBold ? (isMobile ? '3.5rem' : '7rem') : (isMobile ? '2.5rem' : '5rem'), fontWeight: isBold ? '900' : '800', lineHeight: 1, fontFamily: 'Outfit', letterSpacing: '-2px' }}>
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ fontSize: isBold ? '1.2rem' : '1rem', opacity: 0.8, marginTop: '6px', fontWeight: '600' }}>
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </div>
      </div>
    );
  };

  const getSocialIcon = (platform, styleType) => {
    const size = 34;
    const color = styleType === 'style4' ? '#111' : '#fff';
    switch (platform) {
      case 'instagram':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
      case 'twitter':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>;
      case 'facebook':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>;
      case 'youtube':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122 2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
      case 'tiktok':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.95v7.4c-.01 2.98-1.73 5.82-4.5 6.94-2.77 1.13-6.1.48-8.19-1.57-2.1-2.05-2.7-5.46-1.4-8.16 1.3-2.7 4.54-4.25 7.49-3.55v4.07c-1.3-.12-2.65.34-3.48 1.34-.84 1.01-.98 2.5-.32 3.65.65 1.15 2.16 1.7 3.44 1.25 1.28-.46 2.06-1.8 2.05-3.16V.02z"/></svg>;
      case 'website':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
      case 'whatsapp':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>;
      case 'custom':
        return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
      default:
        return null;
    }
  };

  const isPortrait = playlist?.orientation === 'portrait';
  const rotation = playlist?.rotation || 0;

  // Responsive scale factor for widgets on mobile
  // Base resolution of the PlaylistEditor canvas
  const responsiveScale = (originalSize) => {
    const baseScale = (originalSize || 100) / 100;
    return baseScale * getScreenRatio();
  };

  const getScaledPos = (x, y) => {
    if (!playlist) return { x: 0, y: 0 };
    const editorW = playlist.orientation === 'portrait' ? 540 : 960;
    const editorH = playlist.orientation === 'portrait' ? 960 : 540;
    
    // Convert coordinate to percentage based on editor dimensions, then apply to current viewport
    const scaleX = windowWidth / editorW;
    const scaleY = window.innerHeight / editorH;
    
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  };

  const rotationStyles = rotation !== 0 ? {
    width: (rotation === 90 || rotation === 270) ? '100vh' : '100vw',
    height: (rotation === 90 || rotation === 270) ? '100vw' : '100vh',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    transformOrigin: 'center center',
  } : {
    height: '100vh',
    width: '100vw',
  };

  return (
    <div
      ref={containerRef}
      onClick={handleTripleClick}
      style={{
        background: '#000',
        ...rotationStyles,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: playlist?.layout === 'with_header' ? 'column' : (playlist?.footer_position === 'top' ? 'column-reverse' : 'column'),
        fontFamily: `${playlist?.footer_font_family || 'Inter'}, sans-serif`,
        fontSize: isPortrait ? (isMobile ? '1rem' : '1.25rem') : (isMobile ? '0.85rem' : '1rem'),
        cursor: 'none',
      }}
    >
      <style>{`
        video::-webkit-media-controls { display: none !important; }
        video::-webkit-media-controls-start-playback-button { display: none !important; -webkit-appearance: none; }
        
        @media (max-width: 768px) {
          .player-widget-clock {
            padding: 16px 24px !important;
            border-radius: 20px !important;
          }
          .player-widget-clock > div:first-child {
            font-size: 2.5rem !important;
          }
          .player-widget-clock > div:last-child {
            font-size: 0.9rem !important;
          }
          .player-widget-weather {
            padding: 12px 20px !important;
            border-radius: 20px !important;
            gap: 10px !important;
          }
          .player-widget-weather span {
            font-size: 1.8rem !important;
          }
          .player-social-widget {
            padding: 12px 18px !important;
            border-radius: 18px !important;
            gap: 12px !important;
          }
          .player-social-widget span {
            font-size: 1.1rem !important;
          }
          .player-social-widget svg {
            width: 24px !important;
            height: 24px !important;
          }
          .player-social-widget img {
            width: 70px !important;
            height: 70px !important;
          }
        }
      `}</style>

      {/* Botão de Logout — triplo clique */}
      {showLogout && (
        <div style={{
          position: 'fixed', top: '30px', right: '30px', zIndex: 9999,
          display: 'flex', gap: '12px', alignItems: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <button
            onClick={e => { e.stopPropagation(); logout(); }}
            style={{
              background: 'rgba(239,68,68,0.95)', border: 'none', borderRadius: '14px',
              color: '#fff', padding: '14px 24px', fontWeight: '800', cursor: 'pointer',
              fontSize: '1rem', backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          >
            🚪 Sair do Sistema
          </button>
        </div>
      )}

      {playlist.layout === 'with_header' && (
        <div style={{
          height: isMobile ? '80px' : '120px',
          background: `linear-gradient(90deg, ${playlist.theme_color || '#818cf8'}, var(--accent))`,
          display: 'flex', alignItems: 'center', padding: isMobile ? '0 20px' : '0 50px',
          color: '#fff', zIndex: 30, boxShadow: '0 5px 30px rgba(0,0,0,0.6)'
        }}>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '3rem', fontWeight: '900', margin: 0, fontFamily: 'Outfit' }}>{playlist.name}</h1>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: isMobile ? '1.2rem' : '2.5rem', fontWeight: '800' }}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            {!isMobile && <div style={{ fontSize: '1.2rem', opacity: 0.9 }}>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
          </div>
        </div>
      )}

      <div style={{ 
        flex: 1, display: 'flex', 
        flexDirection: playlist.layout === 'split' ? 'row' : 'column',
        position: 'relative' 
      }}>
        <div style={{ 
          flex: playlist.layout === 'split' ? (isMobile ? 0.6 : 0.7) : 1, 
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000'
        }}>
          {renderMediaLayer('A', layerA, videoRefA)}
          {renderMediaLayer('B', layerB, videoRefB)}

          {/* Relógio Widget */}
          {playlist.layout !== 'split' && playlist.layout !== 'with_header' && playlist.show_clock && showClockWidget && (
            <div className={`player-widget-clock ${playlist.clock_style || 'digital_transparent'}`} style={{
              ...getWidgetBaseStyle(playlist.clock_card_style || 'dark', playlist.card_transparency, playlist.clock_accent_color || playlist.theme_color, 'clock'),
              ...(playlist.use_custom_pos ? { position: 'absolute', left: `${getScaledPos(playlist.clock_x || 0, playlist.clock_y || 0).x}px`, top: `${getScaledPos(playlist.clock_x || 0, playlist.clock_y || 0).y}px` } : getPositionStyles(playlist.widget_position || 'top-right', isMobile ? '20px' : '40px')),
              transform: `${!playlist.use_custom_pos && (playlist.widget_position || 'top-right').includes('center') ? 'translateX(-50%) ' : ''}scale(${responsiveScale(playlist.clock_size)})`,
              transformOrigin: playlist.use_custom_pos ? 'top left' : `${(playlist.widget_position || 'top-right').split('-')[0]} ${(playlist.widget_position || 'top-right').split('-')[1]}`,
            }}>
              {renderClock()}
            </div>
          )}

          {/* Clima Widget */}
          {playlist.layout !== 'split' && playlist.layout !== 'with_header' && playlist.show_weather && showWeatherWidget && (
            <div className="player-widget-weather" style={{
              ...getWidgetBaseStyle(playlist.weather_card_style || 'dark', playlist.card_transparency, playlist.weather_accent_color || playlist.theme_color, 'weather'),
              ...(playlist.use_custom_pos ? { position: 'absolute', left: `${getScaledPos(playlist.weather_x || 0, playlist.weather_y || 0).x}px`, top: `${getScaledPos(playlist.weather_x || 0, playlist.weather_y || 0).y}px` } : getPositionStyles(playlist.weather_position || 'top-left', isMobile ? '20px' : '40px')),
              transform: `scale(${responsiveScale(playlist.weather_size)})`,
              transformOrigin: 'top left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <WeatherIcon icon={weatherData.icon} size={isMobile ? 32 : 48} color={playlist.weather_accent_color || playlist.theme_color || '#38bdf8'} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: '800', fontFamily: 'Outfit', lineHeight: 1 }}>{weatherData.temp}°C</span>
                <span style={{ fontSize: '1rem', opacity: 0.8, fontWeight: '600' }}>{weatherData.city || playlist.weather_city || 'Cuiabá - MT'}</span>
              </div>
            </div>
          )}

          {/* Card de Redes Sociais */}
          {playlist.layout !== 'split' && playlist.show_social && showSocialWidget && (
            <div className="player-social-widget" style={{
              ...getWidgetBaseStyle(playlist.social_card_style || 'dark', playlist.card_transparency, playlist.social_accent_color || playlist.theme_color, 'social'),
              ...(playlist.use_custom_pos ? { position: 'absolute', left: `${getScaledPos(playlist.social_x || 0, playlist.social_y || 0).x}px`, top: `${getScaledPos(playlist.social_x || 0, playlist.social_y || 0).y}px` } : getPositionStyles(playlist.social_position || 'bottom-right', isMobile ? '20px' : '40px')),
              transform: `${!playlist.use_custom_pos && (playlist.social_position || 'bottom-right').includes('center') ? 'translateX(-50%) ' : ''}scale(${responsiveScale(playlist.social_size)})`,
              transformOrigin: playlist.use_custom_pos ? 'top left' : `${(playlist.social_position || 'bottom-right').split('-')[0]} ${(playlist.social_position || 'bottom-right').split('-')[1]}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.1rem', opacity: 0.8, fontWeight: '700', letterSpacing: '0.5px' }}>
                  {playlist.social_platform === 'instagram' ? 'Siga no Instagram:' :
                   playlist.social_platform === 'tiktok' ? 'Siga no TikTok:' :
                   playlist.social_platform === 'youtube' ? 'Siga no YouTube:' :
                   playlist.social_platform === 'facebook' ? 'Curta no Facebook:' :
                   playlist.social_platform === 'whatsapp' ? 'Fale pelo WhatsApp:' :
                   playlist.social_platform === 'website' ? 'Acesse nosso Site:' :
                   playlist.social_platform === 'custom' ? 'Acesse o Link:' : 'Conecte-se conosco:'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {getSocialIcon(playlist.social_platform, playlist.social_card_style)}
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', fontFamily: 'Outfit', letterSpacing: '0.5px' }}>
                    {playlist.social_handle || (playlist.social_platform === 'custom' ? 'Saiba mais' : '@seu_negocio')}
                  </span>
                </div>
              </div>
              {playlist.social_qrcode && (
                <div style={{ 
                  padding: '8px', background: '#fff', borderRadius: '16px', 
                  boxShadow: '0 8px 25px rgba(0,0,0,0.2)', marginLeft: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `3px solid ${playlist.theme_color || '#818cf8'}22`
                }}>
                  {qrCachedDataUrl || !qrFallbackOffline ? (
                    <img
                      key={`${qrRetryToken}-${socialUrl}`}
                      src={qrCachedDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(socialUrl)}&margin=4`}
                      alt="QR Code"
                      style={{ width: '110px', height: '110px', display: 'block' }}
                      onLoad={() => setQrFallbackOffline(false)}
                      onError={() => setQrFallbackOffline(true)}
                    />
                  ) : (
                    <div style={{
                      width: '110px',
                      height: '110px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: '#111',
                      textAlign: 'center',
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'linear-gradient(180deg, #fff, #f3f4f6)',
                    }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: '900', lineHeight: 1.1 }}>QR offline</div>
                      <div style={{ fontSize: '0.58rem', lineHeight: 1.2, wordBreak: 'break-word' }}>
                        {socialUrl.replace(/^https?:\/\//i, '')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Widget de Cotações Financeiras */}
          {playlist.show_quotes && (
            <div style={{
              ...getWidgetBaseStyle('glass_pro', playlist.card_transparency || 0.4, playlist.theme_color || '#22c55e', 'default'),
              ...getPositionStyles('bottom-left', isMobile ? '20px' : '40px', isMobile ? '20px' : '40px'),
              flexDirection: 'column',
              gap: '8px',
              minWidth: isMobile ? '160px' : '200px',
              transform: `scale(${responsiveScale(80)})`,
              transformOrigin: 'bottom left',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.6, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Cotações</div>
              {(playlist.quotes_currencies || 'USD,EUR,BTC').split(',').map(c => c.trim().toUpperCase()).filter(Boolean).map(cur => {
                const q = quotesData[cur];
                const pct = q ? parseFloat(q.pct) : 0;
                const isPos = pct >= 0;
                const icons = { USD: '$', EUR: '€', GBP: '£', BTC: '₿', ETH: 'Ξ', BRL: 'R$' };
                return (
                  <div key={cur} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ fontSize: isMobile ? '0.85rem' : '1rem', fontWeight: '800', opacity: 0.9 }}>
                      {icons[cur] || cur} {cur}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '900', fontFamily: 'Outfit', lineHeight: 1 }}>
                        {q ? `R$ ${q.bid}` : '...'}
                      </div>
                      {q && (
                        <div style={{ fontSize: '0.65rem', color: isPos ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                          {isPos ? '▲' : '▼'} {Math.abs(pct)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de Progresso */}
          {playlist.show_progress_bar !== false && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '8px', background: 'rgba(255,255,255,0.1)', width: '100%', zIndex: 15 }}>
              <div 
                key={`${currentIndex}-${mediaNonce}`}
                style={{ 
                  height: '100%', background: playlist.theme_color || '#818cf8', width: '100%', 
                  animation: `progressAnim ${currentItem.duration_seconds || 10}s linear forwards` 
                }} 
              />
            </div>
          )}
        </div>

        {/* CONTEÚDO LATERAL (Split) */}
        {playlist.layout === 'split' && (
          <div style={{
            flex: isMobile ? 0.4 : 0.3, background: 'var(--bg-sidebar)', borderLeft: `${isMobile ? '3px' : '6px'} solid ${playlist.theme_color || '#818cf8'}`,
            display: 'flex', flexDirection: 'column', padding: isMobile ? '20px' : '50px 40px', color: '#fff', zIndex: 10, boxShadow: '-10px 0 40px rgba(0,0,0,0.4)'
          }}>
            <div style={{ marginBottom: isMobile ? '20px' : '50px', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '2rem' : '5rem', fontWeight: '900', fontFamily: 'Outfit', letterSpacing: '-1px' }}>
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {!isMobile && (
                <div style={{ fontSize: '1.6rem', opacity: 0.7, fontWeight: '600' }}>
                  {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              )}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '15px' : '35px', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: isMobile ? '15px' : '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ color: playlist.theme_color, marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px' }}>Próxima</h3>
                <p style={{ fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: '800', margin: 0 }}>
                  {playlist.items[(currentIndex + 1) % playlist.items.length]?.media_name || 'Reiniciando playlist'}
                </p>
              </div>
              
              {!isMobile && (
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ color: playlist.theme_color, marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '2px' }}>Avisos</h3>
                  <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.5 }}>{playlist.description || 'Bem-vindo ao nosso sistema de sinalização digital.'}</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'center', padding: isMobile ? '10px' : '20px', background: `${playlist.theme_color}11`, borderRadius: '16px' }}>
              <h2 style={{ fontSize: isMobile ? '1rem' : '1.8rem', margin: 0, fontWeight: '900' }}>{playlist.client_name}</h2>
            </div>
          </div>
        )}
      </div>

      {/* Logomarca Flutuante */}
      {playlist.logo_url && (
        <img src={playlist.logo_url} alt="Logo" style={{
          ...getPositionStyles(playlist.logo_position || 'bottom-right', isMobile ? '20px' : '40px'),
          width: `${isMobile ? (playlist.logo_size_px || 100) * 0.6 : (playlist.logo_size_px || 100)}px`, height: 'auto',
          opacity: playlist.logo_opacity ?? 0.85, objectFit: 'contain', zIndex: 12,
          filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.5))'
        }} onError={e => e.target.style.display = 'none'} />
      )}

      {/* Faixa de Notícias / Ticker */}
      {(playlist.footer_text || playlist.rss_url || playlist.layout === 'with_footer') && playlist.layout !== 'split' && (() => {
        const text = buildTickerText(playlist.footer_text);
        const label = (playlist.ticker_label !== undefined && playlist.ticker_label !== null) ? playlist.ticker_label : ''; // respeita label vazio
        const speed = getTickerSpeedDuration(playlist.ticker_speed);
        const direction = playlist.ticker_direction || 'rtl';
        const color = playlist.theme_color || '#818cf8';
        const fontColor = playlist.footer_font_color || '#fff';
        const height = isMobile ? (playlist.ticker_height || 85) * 0.6 : (playlist.ticker_height || 85);
        const isVisible = showTicker || playlist.ticker_interval === 0;
        const styleName = playlist.news_style || 'classic';
        const isTop = playlist.footer_position === 'top';
        const tickerVisual = getTickerVisualConfig({
          styleName,
          themeColor: playlist.ticker_accent_color || color,
          footerOpacity: playlist.footer_opacity ?? 0.85,
          fontColor,
          isTop,
          isMobile,
          layout: playlist.layout,
        });
        const tickerScrollStyle = {
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '28px' : '44px',
          paddingLeft: direction === 'rtl' ? '10px' : '0',
          paddingRight: direction === 'ltr' ? '10px' : '0',
          animation: `scrollText${direction.toUpperCase()} ${speed} linear infinite`,
          fontSize: isMobile ? (parseFloat(playlist.footer_font_size) || 2.2) * 0.5 + 'rem' : playlist.footer_font_size || '2.2rem',
          fontWeight: playlist.ticker_font_weight || '700',
          zIndex: 100,
          minWidth: 'max-content',
          width: 'max-content',
          willChange: 'transform',
          textShadow: styleName === 'news_channel' ? 'none' : '0 1px 2px rgba(0,0,0,0.18)',
        };
        const tickerMessageStyle = {
          ...tickerVisual.messageStyle,
          color: styleName === 'news_channel' ? '#111827' : fontColor,
        };

        return (
          <div style={{
            height: `${height}px`, 
            width: playlist.use_custom_pos ? (playlist.layout === 'floating' ? '90%' : '100%') : '100%',
            color: styleName === 'news_channel' ? '#000' : fontColor, 
            display: isVisible ? 'flex' : 'none', 
            alignItems: 'center', overflow: 'hidden',
            whiteSpace: 'nowrap', 
            position: 'absolute',
            left: playlist.use_custom_pos ? `${getScaledPos(playlist.ticker_x || 0, playlist.ticker_y || 0).x}px` : (playlist.layout === 'floating' ? '5%' : 0),
            top: playlist.use_custom_pos ? `${getScaledPos(playlist.ticker_x || 0, playlist.ticker_y || 0).y}px` : (isTop ? 0 : 'auto'),
            bottom: !playlist.use_custom_pos && !isTop ? 0 : 'auto',
            zIndex: 100, backdropFilter: 'blur(12px)',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.5s ease',
            padding: '0',
            ...tickerVisual.containerStyle
          }}>
            <div style={tickerVisual.accentStyle} />
            <div style={tickerVisual.topLineStyle} />
            {label && label.trim() !== "" && (
              <div style={{
                ...tickerVisual.labelStyle,
                minWidth: isMobile ? '128px' : '160px',
                boxShadow: styleName === 'news_channel' ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.18)',
              }}>
                <span style={tickerVisual.labelDotStyle} />
                {label}
              </div>
            )}
            <div style={tickerScrollStyle}>
              <span style={{ ...tickerVisual.messageStyle, color: tickerMessageStyle.color }}>
                <span style={tickerVisual.labelDotStyle} />
                {text}
              </span>
              <span style={{ ...tickerVisual.messageStyle, color: tickerMessageStyle.color }}>
                <span style={tickerVisual.labelDotStyle} />
                {text}
              </span>
            </div>
          </div>
        );
      })()}
      
      {/* Versão para controle de Build */}
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', zIndex: 9999 }}>
        BUILD {appVersionLabel || 'offline'}
      </div>
    </div>
  );
};

const hexToRgb = (hex) => {
  if (!hex) return '129, 140, 248';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '129, 140, 248';
};

export default Player;
