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
    // Atualizar playlist a cada 5 minutos
    const interval = setInterval(fetchPlaylist, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlaylist = async () => {
    try {
      // No modo Player, buscamos a playlist vinculada ao cliente logado
      // Ou podemos buscar por dispositivo se implementarmos registro de device
      const response = await api.get('/playlists/active'); 
      if (response.data && response.data.items) {
        setPlaylist(response.data);
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
  const mediaUrl = currentItem.filename.startsWith('http') 
    ? currentItem.filename 
    : `${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/${currentItem.filename}`;

  return (
    <div style={{ background: '#000', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      {currentItem.type === 'image' ? (
        <img 
          src={mediaUrl} 
          alt="Digital Signage" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <video
          ref={videoRef}
          src={mediaUrl}
          autoPlay
          muted // Necessário para autoplay em muitos navegadores
          onEnded={handleVideoEnd}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
      
      {/* Indicador discreto de carregamento no canto */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, opacity: 0.2, color: '#fff', fontSize: '10px' }}>
        Playlist: {playlist.name} | Item: {currentIndex + 1}/{playlist.items.length}
      </div>
    </div>
  );
};

export default Player;
