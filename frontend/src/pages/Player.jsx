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
  const videoRef = useRef(null);
  const timerRef = useRef(null);

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
    <div style={{ 
      background: '#000', 
      height: '100vh', 
      width: '100vw', 
      overflow: 'hidden', 
      position: 'relative',
      display: 'flex',
      flexDirection: playlist?.footer_position === 'top' ? 'column-reverse' : 'column',
      fontFamily: `${playlist?.footer_font_family || 'Inter'}, sans-serif`
    }}>
      {/* ESTILO PARA ANIMAÇÕES */}
      <style>{`
        @keyframes scrollText {
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

      {/* ÁREA PRINCIPAL DA MÍDIA */}
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
            alt="Media" 
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

        {/* WIDGET DE HORA E CLIMA */}
        {(playlist.show_clock || playlist.show_weather) && (
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '40px',
            padding: '20px 30px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            color: '#fff',
            border: `2px solid ${playlist.theme_color || '#818cf8'}`,
            textAlign: 'right',
            zIndex: 10
          }}>
            <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: 1 }}>
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '1.2rem', opacity: 0.8, marginTop: '5px' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {playlist.show_weather && (
              <div style={{ marginTop: '10px', fontSize: '1.5rem', fontWeight: '600', color: playlist.theme_color }}>
                ⛅ 24°C
              </div>
            )}
          </div>
        )}
      </div>

      {(playlist.layout === 'with_footer' || playlist.footer_text) && (
        <div style={{
          height: '80px',
          background: playlist.theme_color || '#818cf8',
          backgroundColor: `rgba(${hexToRgb(playlist.theme_color || '#818cf8')}, ${playlist.footer_opacity || 0.8})`,
          color: playlist.footer_font_color || '#fff',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          boxShadow: playlist.footer_position === 'top' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 -10px 30px rgba(0,0,0,0.5)',
          zIndex: 20,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            padding: '0 40px',
            background: 'rgba(0,0,0,0.1)',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            borderRight: '2px solid rgba(255,255,255,0.2)',
            fontFamily: 'Outfit, sans-serif'
          }}>
            NOTÍCIAS
          </div>
          <div style={{
            display: 'inline-block',
            paddingLeft: '100%',
            animation: 'scrollText 30s linear infinite',
            fontSize: playlist.footer_font_size || '2rem',
            fontWeight: '600',
            fontFamily: playlist.footer_font_family || 'inherit'
          }}>
            {playlist.footer_text || 'Painel Digital • Sua comunicação em outro nível • ' + playlist.client_name}
          </div>
        </div>
      )}
      
      {/* LOGO DO CLIENTE / SISTEMA */}
      <div style={{ position: 'absolute', bottom: playlist.footer_text ? '120px' : '30px', left: '40px', opacity: 0.5, zIndex: 5 }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', margin: 0 }}>{playlist.client_name}</h2>
      </div>
    </div>
  );
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '129, 140, 248';
};

export default Player;
