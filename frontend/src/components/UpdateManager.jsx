import { useState, useEffect } from 'react';
import api from '../services/api';

const APP_VERSION = '1.0.0'; // VERSÃO ATUAL DO APK

const UpdateManager = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const response = await api.get('/app-version');
        const { latestVersion, url, force, message } = response.data;

        if (isVersionOlder(APP_VERSION, latestVersion)) {
          setUpdateInfo({ latestVersion, url, force, message });
          setVisible(true);
        }
      } catch (error) {
        console.error('Falha ao verificar atualizações OTA:', error);
      }
    };

    // Verifica ao abrir e a cada 6 horas
    checkUpdate();
    const interval = setInterval(checkUpdate, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const isVersionOlder = (current, latest) => {
    const curr = current.split('.').map(Number);
    const late = latest.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (late[i] > curr[i]) return true;
      if (late[i] < curr[i]) return false;
    }
    return false;
  };

  const handleUpdate = () => {
    if (updateInfo?.url) {
      window.location.href = updateInfo.url;
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px'
        }}>🚀</div>
        
        <h2 style={{ 
          color: '#fff', 
          fontSize: '1.5rem', 
          fontWeight: '800',
          marginBottom: '12px',
          fontFamily: 'Outfit, sans-serif'
        }}>
          Nova Versão Disponível!
        </h2>
        
        <p style={{ 
          color: '#a1a1aa', 
          fontSize: '0.95rem', 
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          {updateInfo.message}
          <br />
          <span style={{ fontSize: '0.8rem', color: '#6366f1' }}>
            v{APP_VERSION} → <strong>v{updateInfo.latestVersion}</strong>
          </span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleUpdate}
            style={{
              padding: '16px',
              backgroundColor: '#6366f1',
              border: 'none',
              borderRadius: '14px',
              color: '#fff',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Baixar e Atualizar Agora
          </button>

          {!updateInfo.force && (
            <button
              onClick={() => setVisible(false)}
              style={{
                padding: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#71717a',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Lembrar mais tarde
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default UpdateManager;
