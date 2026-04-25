import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Player = () => {
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('preview');
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchPlaylist();
    
    // Skip heartbeat if in preview mode
    let heartbeat;
    if (!previewId) {
      heartbeat = setInterval(async () => {
        try {
          await api.post('/devices/heartbeat');
        } catch (e) {
          console.error('Falha no sinal de vida');
        }
      }, 30000);
    }

    const interval = setInterval(fetchPlaylist, 2 * 60 * 1000);
    
    return () => {
      if (heartbeat) clearInterval(heartbeat);
      clearInterval(interval);
    };
  }, [previewId]);

  const fetchPlaylist = async () => {
    try {
      let response;
      if (previewId) {
        response = await api.get(`/playlists/${previewId}`);
      } else {
        response = await api.get('/playlists/active'); 
      }
      
      if (response.data && (response.data.items || response.data.media)) {
        const data = response.data;
        if (!data.items && data.media) data.items = data.media;
        
        // Fetch RSS if provided
        if (data.rss_url) {
          try {
            // Using a public RSS to JSON proxy for demonstration
            const rssRes = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(data.rss_url)}`);
            const rssData = await rssRes.json();
            if (rssData.items) {
              data.footer_text = rssData.items.map(item => item.title).join(' • ');
            }
          } catch (e) {
            console.error('RSS fetch error:', e);
          }
        }
        
        setPlaylist(data);
      } else {
        setPlaylist(null);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar playlist:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;

    const currentItem = playlist.items[currentIndex];
    
    if (currentItem.type === 'image') {
      const duration = (currentItem.duration_seconds || 10) * 1000;
      timerRef.current = setTimeout(nextMedia, duration);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, playlist]);

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % playlist.items.length);
  };

  const handleVideoEnd = () => {
    nextMedia();
  };

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

  if (!isStarted && !previewId) {
    return (
      <div style={{ 
        background: '#000', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '20px', fontFamily: 'Outfit, sans-serif' }}>Painel Digital</h1>
        <button 
          onClick={handleStart}
          className="btn btn-primary"
          style={{ padding: '20px 40px', fontSize: '1.25rem' }}
        >
          🚀 Iniciar Exibição em Tela Cheia
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
  const mediaUrl = currentItem.url || currentItem.filename;

  return (
    <div 
      ref={containerRef}
      style={{ 
        background: '#000', 
        height: '100vh', 
        width: '100vw', 
        overflow: 'hidden', 
        position: 'relative',
        display: 'flex',
        flexDirection: playlist?.footer_position === 'top' ? 'column-reverse' : 'column',
        fontFamily: `${playlist?.footer_font_family || 'Inter'}, sans-serif`
      }}
    >
      {/* Preload hidden container */}
      <div style={{ display: 'none' }}>
        {playlist.items.map((item, idx) => {
          const nextIdx = (idx + 1) % playlist.items.length;
          const nextItem = playlist.items[nextIdx];
          const nextUrl = nextItem.url || nextItem.filename;
          return nextItem.type === 'image' ? (
            <img key={`preload-${idx}`} src={nextUrl} />
          ) : (
            <video key={`preload-${idx}`} src={nextUrl} preload="auto" muted />
          );
        })}
      </div>

      {/* Hidden Logout Button (Top Right) */}
      {!previewId && (
        <button 
          onClick={() => { if(window.confirm('Deseja sair do player?')) { localStorage.clear(); sessionStorage.clear(); window.location.href = '/login'; } }}
          style={{
            position: 'absolute', top: 0, right: 0, width: '50px', height: '50px',
            background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1000,
            opacity: 0
          }}
          title="Sair"
        />
      )}
      
      <style>{`
        @keyframes scrollTextLTR {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scrollTextRTL {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .transition-fade { animation: fadeEffect 1000ms forwards; }
        .transition-slide-left { animation: slideLeftEffect 800ms ease-out forwards; }
        .transition-slide-right { animation: slideRightEffect 800ms ease-out forwards; }
        .transition-zoom { animation: zoomEffect 1000ms ease-out forwards; }

        @keyframes fadeEffect { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideLeftEffect { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideRightEffect { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes zoomEffect { from { transform: scale(1.1); opacity: 0.5; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div style={{ 
        flex: 1, 
        position: 'relative', 
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {currentItem.type === 'image' ? (
          <img 
            key={`${currentItem.id}-${currentIndex}`}
            src={mediaUrl} 
            className={`transition-${playlist.transition_effect || 'fade'}`}
            style={{ width: '100%', height: '100%', objectFit: playlist.scale_mode || 'cover' }}
          />
        ) : (
          <video
            key={`${currentItem.id}-${currentIndex}`}
            ref={videoRef}
            src={mediaUrl}
            autoPlay
            muted
            onEnded={handleVideoEnd}
            className={`transition-${playlist.transition_effect || 'fade'}`}
            style={{ width: '100%', height: '100%', objectFit: playlist.scale_mode || 'cover' }}
          />
        )}

        {(playlist.show_clock || playlist.show_weather) && (
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '40px',
            padding: '20px 30px',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            borderRadius: '24px',
            color: '#fff',
            border: `1px solid rgba(255,255,255,0.1)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            textAlign: 'right',
            zIndex: 10
          }}>
            <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1 }}>
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '1.2rem', opacity: 0.8, marginTop: '5px' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        )}
      </div>

      {(playlist.layout === 'with_footer' || playlist.footer_text) && (
        <div style={{
          height: `${playlist.ticker_height || 80}px`,
          backgroundColor: `rgba(${hexToRgb(playlist.theme_color || '#818cf8')}, ${playlist.footer_opacity ?? 0.8})`,
          color: playlist.footer_font_color || '#fff',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          position: 'relative',
          zIndex: 20,
          backdropFilter: playlist.ticker_blur !== false ? 'blur(10px)' : 'none',
          boxShadow: playlist.footer_position === 'top' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 -10px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            padding: '0 30px',
            background: 'rgba(0,0,0,0.2)',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontWeight: '800',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            zIndex: 21
          }}>
            NOTÍCIAS
          </div>
          <div style={{
            display: 'inline-block',
            paddingLeft: playlist.ticker_direction === 'rtl' ? '100%' : '0',
            paddingRight: playlist.ticker_direction === 'ltr' ? '100%' : '0',
            animation: `scrollText${(playlist.ticker_direction || 'rtl').toUpperCase()} ${
              playlist.ticker_speed === 'slow' ? '45s' : playlist.ticker_speed === 'fast' ? '15s' : '30s'
            } linear infinite`,
            fontSize: playlist.footer_font_size || '2rem',
            fontWeight: playlist.ticker_font_weight || '600',
            fontFamily: playlist.footer_font_family || 'inherit'
          }}>
            {playlist.footer_text || 'Painel Digital • Sua comunicação em outro nível • ' + (playlist.client_name || '')}
          </div>
        </div>
      )}
      
      <div style={{ position: 'absolute', bottom: (playlist.footer_text || playlist.layout === 'with_footer') ? `${(playlist.ticker_height || 80) + 20}px` : '30px', left: '40px', opacity: 0.4, zIndex: 5 }}>
        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0, fontWeight: '500' }}>{playlist.client_name}</h2>
      </div>
    </div>
  );
};

const hexToRgb = (hex) => {
  if (!hex) return '129, 140, 248';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '129, 140, 248';
};

export default Player;
