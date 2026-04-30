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
          await api.post('/devices/heartbeat', {
            player_status: 'playing',
            ip_address: null, // browser doesn't expose IP directly
          });
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
  const mediaUrl = currentItem.url || currentItem.filename;

  const bottomOffset = (playlist.footer_text || playlist.layout === 'with_footer') ? `${(playlist.ticker_height || 80) + 40}px` : '40px';

  const getPositionStyles = (posStr, offset = '40px', bOffset = bottomOffset) => {
    const styles = { position: 'absolute' };
    if (!posStr) posStr = 'top-right';
    if (posStr.includes('top')) styles.top = offset;
    if (posStr.includes('bottom')) styles.bottom = bOffset;
    if (posStr.includes('left')) styles.left = offset;
    if (posStr.includes('right')) styles.right = offset;
    return styles;
  };

  const getSocialUrl = () => {
    let handle = playlist.social_handle?.replace('@', '');
    switch(playlist.social_platform) {
      case 'instagram': return `https://instagram.com/${handle}`;
      case 'twitter': return `https://twitter.com/${handle}`;
      case 'facebook': return `https://facebook.com/${playlist.social_handle}`;
      case 'tiktok': return `https://tiktok.com/@${handle}`;
      case 'youtube': return `https://youtube.com/${playlist.social_handle}`;
      default: return playlist.social_handle;
    }
  };

  const getSocialStyle = (styleType, platform) => {
    const base = {
      ...getPositionStyles(playlist.social_position || 'bottom-right'), 
      padding: '20px 30px',
      zIndex: 10, display: 'flex', gap: '20px', alignItems: 'center',
      color: '#fff', transition: 'all 0.3s ease'
    };
    
    switch (styleType) {
      case 'style2': // Escuro Minimalista
        return { ...base, background: 'rgba(0,0,0,0.85)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' };
      case 'style3': // Vibrante
        const bg = platform === 'instagram' ? 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' :
                   platform === 'youtube' ? 'linear-gradient(135deg, #ff0000, #cc0000)' :
                   platform === 'twitter' ? 'linear-gradient(135deg, #1da1f2, #0d8bd9)' :
                   platform === 'facebook' ? 'linear-gradient(135deg, #1877f2, #145dbf)' :
                   platform === 'tiktok' ? 'linear-gradient(135deg, #000000, #333333)' :
                   `linear-gradient(135deg, ${playlist.theme_color || '#818cf8'}, #ec4899)`;
        return { ...base, background: bg, borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' };
      case 'style4': // Claro
        return { ...base, background: 'rgba(255,255,255,0.95)', color: '#111', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' };
      case 'style5': // Pílula
        return { ...base, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderRadius: '50px', padding: '12px 30px', border: '1px solid rgba(255,255,255,0.15)' };
      case 'style1': // Vidro Moderno (Default)
      default:
        return { ...base, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' };
    }
  };

  const getSocialIcon = (platform, styleType) => {
    const size = 32;
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
      default:
        return null;
    }
  };

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
          {/* Blurred Background for Blur Fill Mode */}
          {playlist.scale_mode === 'blur-fill' && (
            currentItem.type === 'image' ? (
              <img src={mediaUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px)', opacity: 0.5, transform: 'scale(1.1)', zIndex: 0 }} />
            ) : (
              <video src={mediaUrl} muted autoPlay loop style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px)', opacity: 0.5, transform: 'scale(1.1)', zIndex: 0 }} />
            )
          )}

          {currentItem.type === 'image' ? (
            <img 
              key={`${currentItem.id}-${currentIndex}`}
              src={mediaUrl} 
              className={`transition-${playlist.transition_effect || 'fade'}`}
              style={{ width: '100%', height: '100%', objectFit: playlist.scale_mode === 'blur-fill' ? 'contain' : (playlist.scale_mode || 'cover'), zIndex: 1, position: 'relative' }}
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
              style={{ width: '100%', height: '100%', objectFit: playlist.scale_mode === 'blur-fill' ? 'contain' : (playlist.scale_mode || 'cover'), zIndex: 1, position: 'relative' }}
            />
          )}

          {/* Clock/Weather overlay (only if not in split/header layout to avoid clutter) */}
          {playlist.layout !== 'split' && playlist.layout !== 'with_header' && (playlist.show_clock || playlist.show_weather) && (
            <div className="player-widget" style={{
              ...getPositionStyles(playlist.widget_position || 'top-right'), padding: '24px 32px',
              background: `rgba(0,0,0,${playlist.card_transparency ?? 0.4})`, backdropFilter: 'blur(16px)', borderRadius: '24px',
              color: '#fff', border: `1px solid rgba(255,255,255,0.05)`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: (playlist.widget_position || 'top-right').includes('right') ? 'right' : 'left', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '16px'
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
            <div className="player-social-widget" style={getSocialStyle(playlist.social_card_style, playlist.social_platform)}>
              <div style={{ display: 'flex', flexDirection: playlist.social_card_style === 'style5' ? 'row' : 'column', gap: '8px', alignItems: playlist.social_card_style === 'style5' ? 'center' : 'flex-start' }}>
                {playlist.social_card_style !== 'style5' && (
                  <div style={{ fontSize: '1.05rem', opacity: 0.9, fontWeight: '500' }}>Siga nossas redes sociais</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {getSocialIcon(playlist.social_platform, playlist.social_card_style)}
                  <span className="player-social-text" style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'Outfit' }}>
                    {playlist.social_handle || '@sua_empresa'}
                  </span>
                </div>
              </div>
              {playlist.social_qrcode && (
                <div style={{ 
                  padding: '6px', background: '#fff', borderRadius: '12px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginLeft: playlist.social_card_style === 'style5' ? '12px' : '0' 
                }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(getSocialUrl())}`} alt="QR Code" style={{ width: '80px', height: '80px', display: 'block' }} />
                </div>
              )}
            </div>
          )}

          {/* Progress Bar (Media Time) */}
          {playlist.show_progress_bar !== false && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '6px', background: 'rgba(255,255,255,0.15)', width: '100%', zIndex: 15 }}>
              <div 
                key={`${currentItem.id}-${currentIndex}`} // Forces re-render of animation on new item
                style={{ 
                  height: '100%', background: playlist.theme_color || '#818cf8', width: '100%', 
                  animation: `progressAnim ${currentItem.duration_seconds || 10}s linear forwards` 
                }} 
              />
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

      {/* Persistent Logo Overlay */}
      {playlist.logo_url && (
        <img
          src={playlist.logo_url}
          alt="Logo"
          style={{
            ...getPositionStyles(playlist.logo_position || 'bottom-right', '32px'),
            width: `${playlist.logo_size_px || 80}px`,
            height: 'auto',
            opacity: playlist.logo_opacity ?? 0.85,
            objectFit: 'contain',
            zIndex: 12,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
            transition: 'opacity 0.3s',
          }}
          onError={e => e.target.style.display = 'none'}
        />
      )}

      {/* News/Ticker Styles */}
      {((playlist.layout === 'with_footer' || playlist.footer_text || playlist.rss_url) && playlist.layout !== 'split') && (() => {
        const style = playlist.news_style || 'ticker-classic';
        const textContent = playlist.footer_text || 'Painel Digital • Sua comunicação em outro nível';
        const text = ` ${textContent} • ${textContent} • ${textContent} `; // Tripled for seamless loop
        const label = playlist.ticker_label || 'NOTÍCIAS';
        const speed = playlist.ticker_speed === 'slow' ? '45s' : playlist.ticker_speed === 'fast' ? '15s' : '30s';
        const direction = playlist.ticker_direction || 'rtl';
        const color = playlist.theme_color || '#818cf8';
        const fontColor = playlist.footer_font_color || '#fff';
        const height = playlist.ticker_height || 80;
        const blur = playlist.ticker_blur !== false;

        if (style === 'glassmorphism-bar') {
          return (
            <div style={{
              position: 'absolute',
              [playlist.footer_position === 'top' ? 'top' : 'bottom']: 0,
              left: 0, right: 0,
              height: `${height}px`,
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: playlist.footer_position !== 'top' ? '1px solid rgba(255,255,255,0.12)' : 'none',
              borderBottom: playlist.footer_position === 'top' ? '1px solid rgba(255,255,255,0.12)' : 'none',
              display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 20,
            }}>
              <div style={{ padding: '0 24px', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-block', animation: `scrollText${direction.toUpperCase()} ${speed} linear infinite`, fontSize: playlist.footer_font_size || '1.1rem', color: fontColor, fontWeight: playlist.ticker_font_weight || '600' }}>
                  {text}
                </span>
              </div>
            </div>
          );
        }

        if (style === 'floating-card') {
          return (
            <div style={{
              position: 'absolute', bottom: '80px', right: '40px',
              maxWidth: '380px', background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(16px)', borderRadius: '20px',
              padding: '20px 24px', zIndex: 20,
              border: `1px solid ${color}40`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontSize: '0.9rem', color: fontColor, lineHeight: 1.5, maxHeight: '80px', overflow: 'hidden' }}>{textContent.split('•')[0].trim()}</div>
            </div>
          );
        }

        if (style === 'vertical-lateral') {
          const news = textContent.split('•').filter(Boolean);
          return (
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: '280px', background: 'rgba(0,0,0,0.80)',
              backdropFilter: 'blur(12px)', zIndex: 20,
              borderLeft: `3px solid ${color}`,
              display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: '16px',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '2px', borderBottom: `1px solid ${color}30`, paddingBottom: '12px' }}>{label}</div>
              {news.slice(0, 6).map((n, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: fontColor, lineHeight: 1.4, opacity: i === 0 ? 1 : 0.7, borderLeft: i === 0 ? `3px solid ${color}` : '3px solid transparent', paddingLeft: '10px' }}>
                  {n.trim()}
                </div>
              ))}
            </div>
          );
        }

        if (style === 'breaking-center') {
          return (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20, textAlign: 'center',
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px', padding: '32px 48px',
              border: `2px solid ${color}`,
              boxShadow: `0 0 60px ${color}40`,
              maxWidth: '70%',
              animation: 'fadeIn 0.5s ease',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '16px' }}>🔴 {label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: fontColor, lineHeight: 1.4 }}>{textContent.split('•')[0].trim()}</div>
            </div>
          );
        }

        // Default: ticker-classic
        return (
          <div style={{
            height: `${height}px`,
            backgroundColor: `rgba(${hexToRgb(color)}, ${playlist.footer_opacity ?? 0.8})`,
            color: fontColor,
            display: 'flex', alignItems: 'center', overflow: 'hidden',
            whiteSpace: 'nowrap', position: 'relative', zIndex: 20,
            backdropFilter: blur ? 'blur(10px)' : 'none',
            boxShadow: playlist.footer_position === 'top' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 -10px 30px rgba(0,0,0,0.3)'
          }}>
            <div className="player-ticker-label" style={{
              padding: '0 30px', background: 'rgba(0,0,0,0.2)', height: '100%',
              display: 'flex', alignItems: 'center', fontWeight: '800', fontSize: '1.1rem',
              textTransform: 'uppercase', letterSpacing: '1px',
              borderRight: '1px solid rgba(255,255,255,0.1)', zIndex: 21
            }}>
              {label}
            </div>
            <div style={{
              display: 'inline-block',
              paddingLeft: direction === 'rtl' ? '100%' : '0',
              paddingRight: direction === 'ltr' ? '100%' : '0',
              animation: `scrollText${direction.toUpperCase()} ${speed} linear infinite`,
              fontSize: playlist.footer_font_size || '2rem',
              fontWeight: playlist.ticker_font_weight || '600',
              fontFamily: playlist.footer_font_family || 'inherit'
            }}>
              {text}
            </div>
          </div>
        );
      })()}
      
      <div className="player-client-name" style={{ position: 'absolute', top: playlist.layout === 'with_header' ? '120px' : '30px', left: '40px', zIndex: 5 }}>
        <h2 style={{ color: '#fff', opacity: 0.8, fontSize: '1.8rem', margin: 0, fontWeight: '800', fontFamily: 'Outfit', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{playlist.client_name}</h2>
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
