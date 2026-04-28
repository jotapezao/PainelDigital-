import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';


const Player = () => {
  const [searchParams] = useSearchParams();
  const previewId = searchParams.get('preview');
  const { user, logout } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const logoutTimerRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchPlaylist();
    
    // Skip heartbeat if in preview mode
    let heartbeat;
    if (!previewId) {
      const sendHeartbeat = async () => {
        try {
          await api.post('/devices/heartbeat');
        } catch (e) {
          console.error('Falha no sinal de vida');
        }
      };
      sendHeartbeat(); // Immediate heartbeat
      heartbeat = setInterval(sendHeartbeat, 30000);
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

  // Show logout hint on triple-click anywhere on the player
  const handleTripleClick = (() => {
    let clicks = 0;
    let timer;
    return () => {
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 600);
      if (clicks >= 3) {
        clicks = 0;
        setShowLogout(true);
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = setTimeout(() => setShowLogout(false), 6000);
      }
    };
  })();

  if (!isStarted && !previewId) {
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
  const mediaUrl = currentItem.url || currentItem.filename;

  return (
    <div
      ref={containerRef}
      onClick={handleTripleClick}
      style={{
        background: '#000',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: playlist?.layout === 'with_header' ? 'column' : (playlist?.footer_position === 'top' ? 'column-reverse' : 'column'),
        fontFamily: `${playlist?.footer_font_family || 'Inter'}, sans-serif`,
        cursor: 'default',
      }}
    >
      {/* Floating logout button — revealed on triple-click */}
      {showLogout && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          display: 'flex', gap: '8px', alignItems: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Clique 3x para sair</span>
          <button
            onClick={e => { e.stopPropagation(); logout(); }}
            style={{
              background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '10px',
              color: '#fff', padding: '10px 18px', fontWeight: '700', cursor: 'pointer',
              fontSize: '0.875rem', backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            🚪 Sair
          </button>
        </div>
      )}
      {/* Header Layout Component */}
      {playlist.layout === 'with_header' && (
        <div style={{
          height: '100px',
          background: `linear-gradient(90deg, ${playlist.theme_color || '#818cf8'}, var(--accent))`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          color: '#fff',
          zIndex: 30,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, fontFamily: 'Outfit' }}>{playlist.name}</h1>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</div>
          </div>
        </div>
      )}

      {/* Main Container for Media and Optional Side Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: playlist.layout === 'split' ? 'row' : 'column',
        position: 'relative' 
      }}>
        {/* MEDIA AREA */}
        <div style={{ 
          flex: playlist.layout === 'split' ? 0.7 : 1, 
          position: 'relative', 
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000'
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

          {/* Clock/Weather overlay (only if not in split/header layout to avoid clutter) */}
          {playlist.layout !== 'split' && playlist.layout !== 'with_header' && (playlist.show_clock || playlist.show_weather) && (
            <div className="player-widget" style={{
              position: 'absolute', top: '40px', right: '40px', padding: '24px 32px',
              background: `rgba(0,0,0,${playlist.card_transparency ?? 0.4})`, backdropFilter: 'blur(16px)', borderRadius: '24px',
              color: '#fff', border: `1px solid rgba(255,255,255,0.05)`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'right', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              {playlist.show_clock && (
                <div style={{ borderBottom: playlist.show_weather ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingBottom: playlist.show_weather ? '16px' : '0' }}>
                  <div className="player-widget-clock" style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: 1, fontFamily: 'Outfit' }}>
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '1.2rem', opacity: 0.8, marginTop: '8px' }}>
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              )}
              {playlist.show_weather && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', paddingTop: playlist.show_clock ? '8px' : '0' }}>
                  <span className="player-widget-weather" style={{ fontSize: '2.5rem' }}>⛅</span>
                  <span className="player-widget-weather" style={{ fontSize: '2.5rem', fontWeight: '700', fontFamily: 'Outfit' }}>24°C</span>
                </div>
              )}
            </div>
          )}

          {/* Social Media Overlay */}
          {playlist.layout !== 'split' && playlist.show_social && (
            <div className="player-social-widget" style={{
              position: 'absolute', bottom: playlist.footer_text || playlist.layout === 'with_footer' ? `${(playlist.ticker_height || 80) + 40}px` : '40px', 
              right: '40px', padding: '20px 30px',
              background: `rgba(255,255,255,0.1)`, backdropFilter: 'blur(16px)', borderRadius: '20px',
              color: '#fff', border: `1px solid rgba(255,255,255,0.1)`, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>Siga nossas redes</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {playlist.social_platform === 'instagram' && <span style={{ fontSize: '1.5rem' }}>📸</span>}
                {playlist.social_platform === 'twitter' && <span style={{ fontSize: '1.5rem' }}>🐦</span>}
                {playlist.social_platform === 'facebook' && <span style={{ fontSize: '1.5rem' }}>📘</span>}
                {playlist.social_platform === 'tiktok' && <span style={{ fontSize: '1.5rem' }}>🎵</span>}
                <span className="player-social-text" style={{ fontSize: '1.3rem', fontWeight: '700' }}>{playlist.social_handle || '@sua_empresa'}</span>
              </div>
            </div>
          )}
        </div>

        {/* SIDE CONTENT (Split Layout) */}
        {playlist.layout === 'split' && (
          <div style={{
            flex: 0.3,
            background: 'var(--bg-input)',
            borderLeft: `4px solid ${playlist.theme_color || '#818cf8'}`,
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            color: '#fff',
            zIndex: 10
          }}>
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '4.5rem', fontWeight: '800', fontFamily: 'Outfit' }}>
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '1.5rem', opacity: 0.7 }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px', justifyContent: 'center' }}>
              <div className="card" style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: playlist.theme_color, marginBottom: '10px' }}>Próxima Mídia</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                  {playlist.items[(currentIndex + 1) % playlist.items.length]?.media_name}
                </p>
              </div>
              
              <div className="card" style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: playlist.theme_color, marginBottom: '10px' }}>Informações</h3>
                <p style={{ opacity: 0.8 }}>{playlist.description || 'Confira nosso conteúdo especial preparado para você.'}</p>
              </div>
            </div>

            <div style={{ marginTop: 'auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{playlist.client_name}</h2>
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
          <div className="player-ticker-label" style={{
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
            {playlist.ticker_label || 'NOTÍCIAS'}
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
      
      <div className="player-client-name" style={{ position: 'absolute', bottom: (playlist.footer_text || playlist.layout === 'with_footer') ? `${(playlist.ticker_height || 80) + 30}px` : '30px', left: '40px', zIndex: 5 }}>
        <h2 style={{ color: '#fff', opacity: 0.8, fontSize: '1.8rem', margin: 0, fontWeight: '800', fontFamily: 'Outfit' }}>{playlist.client_name}</h2>
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
