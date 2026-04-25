import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Player = () => {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchPlaylist();
    
    // Sinal de vida (Heartbeat) para ficar ONLINE no Dashboard
    const heartbeat = setInterval(async () => {
      try {
        await api.post('/devices/heartbeat');
      } catch (e) {
        console.error('Falha no sinal de vida');
      }
    }, 30000); // A cada 30 segundos

    // Atualizar playlist a cada 2 minutos
    const interval = setInterval(fetchPlaylist, 2 * 60 * 1000);
    
    return () => {
      clearInterval(heartbeat);
      clearInterval(interval);
    };
  }, []);

  const fetchPlaylist = async () => {
    try {
      const response = await api.get('/playlists/active'); 
      if (response.data && response.data.items && response.data.items.length > 0) {
        setPlaylist(response.data);
      } else {
        setPlaylist(null); // Nenhuma mídia
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
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* ESTILO PARA ANIMAÇÕES */}
      <style>{`
        @keyframes scrollText {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .fade-enter { opacity: 0; }
        .fade-enter-active { opacity: 1; transition: opacity 1000ms; }
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
            key={currentItem.id}
            src={mediaUrl} 
            alt="Media" 
            className="animate-fade-in"
            style={{ width: '100%', height: '100%', objectFit: playlist.layout === 'fullscreen' ? 'contain' : 'cover' }}
          />
        ) : (
          <video
            key={currentItem.id}
            ref={videoRef}
            src={mediaUrl}
            autoPlay
            muted
            onEnded={handleVideoEnd}
            style={{ width: '100%', height: '100%', objectFit: playlist.layout === 'fullscreen' ? 'contain' : 'cover' }}
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

      {/* BARRA DE PROMOÇÕES (TICKER) */}
      {(playlist.layout === 'with_footer' || playlist.footer_text) && (
        <div style={{
          height: '100px',
          background: playlist.theme_color || '#818cf8',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
          zIndex: 20
        }}>
          <div style={{
            padding: '0 40px',
            background: 'rgba(0,0,0,0.2)',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            borderRight: '4px solid rgba(255,255,255,0.3)'
          }}>
            OFERTAS DO DIA
          </div>
          <div style={{
            display: 'inline-block',
            paddingLeft: '100%',
            animation: 'scrollText 25s linear infinite',
            fontSize: '2.5rem',
            fontWeight: '600'
          }}>
            {playlist.footer_text || 'Confira nossas promoções especiais! • Painel Digital: Sua comunicação em outro nível • ' + playlist.client_name}
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

export default Player;
