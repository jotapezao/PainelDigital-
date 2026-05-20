import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Browser } from '@capacitor/browser';

const Login = () => {
  const [loginIdentifier, setLoginIdentifier] = useState(() => localStorage.getItem('pd_remember_email') || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('pd_remember_email'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tvModeChecked, setTvModeChecked] = useState(false);
  const [settings, setSettings] = useState({
    system_name: 'Painel Digital',
    logo_url: null,
    latest_app_version: null,
    app_download_url: null,
    app_update_message: null
  });
  
  const CURRENT_APP_VERSION = '3.0.5';
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // TV Mode: if a device_token is saved, auto-redirect to player
  useEffect(() => {
    const deviceToken = localStorage.getItem('pd_device_token');
    const deviceCompany = localStorage.getItem('pd_device_company');
    if (deviceToken) {
      setTvModeChecked(true);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data) {
          setSettings({
            system_name: res.data.system_name || 'Painel Digital',
            logo_url: res.data.logo_url || null,
            latest_app_version: res.data.latest_app_version,
            app_download_url: res.data.app_download_url,
            app_update_message: res.data.app_update_message
          });
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do sistema:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    document.title = settings.system_name || 'Painel Digital';
  }, [settings.system_name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(loginIdentifier, password, remember);
    
    if (result.success) {
      if (remember) {
        localStorage.setItem('pd_remember_email', loginIdentifier);
      } else {
        localStorage.removeItem('pd_remember_email');
      }
      if (result.user?.role === 'client') {
        localStorage.setItem('pd_device_company', result.user?.client_name || '');
        navigate('/player?autoStart=true');
      } else {
        navigate('/');
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const deviceCompany = localStorage.getItem('pd_device_company');

  // TV Mode banner — show above the form if this device was previously linked
  const TvModeBanner = () => deviceCompany ? (
    <div style={{
      background: 'rgba(99, 102, 241, 0.12)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      marginBottom: '24px',
      fontSize: '0.8125rem',
      color: 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '1.2rem' }}>📺</span>
      <span>Este dispositivo está vinculado a: <strong style={{ color: 'var(--primary)' }}>{deviceCompany}</strong></span>
    </div>
  ) : null;

  const compareVersions = (v1, v2) => {
    if (!v1 || !v2) return 0;
    const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  };

  const UpdateBanner = () => {
    if (!settings.app_download_url) return null;
    
    const isUpdateAvailable = settings.latest_app_version && compareVersions(settings.latest_app_version, CURRENT_APP_VERSION) > 0;
    
    const handleDownloadClick = async (e) => {
      e.preventDefault();
      try {
        await Browser.open({ url: settings.app_download_url });
      } catch (err) {
        window.open(settings.app_download_url, '_blank');
      }
    };

    return (
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <a 
          href={settings.app_download_url} 
          onClick={handleDownloadClick}
          style={{
            color: '#a1a1aa',
            fontSize: '0.9rem',
            textDecoration: 'underline',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'inline-block',
            padding: '8px'
          }}
        >
          {isUpdateAvailable 
            ? `🚀 Nova versão (${settings.latest_app_version}) disponível. Baixar APK.`
            : '⬇️ Baixar Aplicativo Android (APK)'}
        </a>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#09090b',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Background Animated Blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(80px)',
        borderRadius: '50%',
        animation: 'pulse 10s infinite alternate'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
        filter: 'blur(80px)',
        borderRadius: '50%',
        animation: 'pulse 12s infinite alternate-reverse'
      }}></div>

      <style>{`
        @keyframes pulse {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(5%, 5%) scale(1.1); }
        }
        .login-card {
          background: rgba(24, 24, 27, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          padding: 48px;
          width: 90%;
          max-width: 480px;
          max-height: 95vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          position: relative;
          z-index: 10;
          transition: all 0.3s ease;
          scrollbar-width: none;
        }
        .login-card::-webkit-scrollbar {
          display: none;
        }
        
        /* Landscape Optimization for Mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .login-card {
            padding: 20px 40px;
            max-width: 600px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 40px;
            border-radius: 24px;
          }
          .login-header {
            margin-bottom: 0 !important;
            flex: 0.4;
            text-align: left !important;
          }
          .login-header p {
            display: none;
          }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .login-card {
            flex-direction: row;
            max-width: 850px;
            height: 90vh;
            padding: 20px;
            gap: 20px;
            align-items: stretch;
          }
          .login-header {
            flex: 0.4;
            margin-bottom: 0 !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .login-logo {
            width: 80px !important;
            height: 80px !important;
            margin-bottom: 10px !important;
          }
          .login-title {
            font-size: 1.4rem !important;
          }
          form {
            flex: 0.6;
            overflow-y: auto;
            padding-right: 10px;
          }
          .login-button {
            margin-top: 15px !important;
            padding: 12px !important;
          }
          .tv-mode-banner {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 24px;
            border-radius: 28px;
            width: 90%;
            margin: auto;
          }
          .login-logo {
            width: 100px !important;
            height: 100px !important;
          }
          .login-title {
            font-size: 1.75rem !important;
          }
          .login-input {
            padding: 12px 16px !important;
            font-size: 0.95rem !important;
            margin-top: 6px;
          }
          .login-button {
            padding: 15px !important;
            margin-top: 24px !important;
            font-size: 1rem !important;
          }
        }
        .login-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(39, 39, 42, 0.6);
          border: 1px solid rgba(63, 63, 70, 0.4);
          border-radius: 16px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 8px;
        }
        .login-input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(39, 39, 42, 0.9);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        }
        .login-button {
          width: 100%;
          padding: 16px;
          background-color: #6366f1;
          background-image: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          border-radius: 16px;
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px -8px rgba(99, 102, 241, 0.5);
          filter: brightness(1.1);
        }
        .login-button:active {
          transform: translateY(0);
        }
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="login-card animate-fade-in">
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="login-logo" style={{ 
            width: '120px', 
            height: '120px', 
            background: settings.logo_url ? 'rgba(255, 255, 255, 0.02)' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
            borderRadius: '24px', 
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: settings.logo_url ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 12px 24px -8px rgba(99, 102, 241, 0.5)',
            overflow: 'hidden',
            border: settings.logo_url ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255,255,255,0.1)',
            padding: settings.logo_url ? '12px' : '0'
          }}>
             <img src={settings.logo_url || "./logo.png"} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title" style={{ 
            fontSize: '2.25rem', 
            fontWeight: '900', 
            letterSpacing: '-0.04em',
            marginBottom: '8px', 
            background: 'linear-gradient(to right, #fff, #a1a1aa)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            {settings.system_name}
          </h1>
          <p style={{ color: '#a1a1aa', fontWeight: '500', fontSize: '0.9rem', lineHeight: '1.4' }}>Controle suas telas de qualquer lugar com inteligência</p>
        </div>

        <div style={{ flex: 1 }}>
          <TvModeBanner />

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#e4e4e7', marginLeft: '4px' }}>Usuário ou E-mail</label>
              <input 
                className="login-input"
                type="text" 
                placeholder="seu_usuario ou seu@email.com" 
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#e4e4e7', marginLeft: '4px' }}>Senha</label>
              <input 
                className="login-input"
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    accentColor: '#6366f1',
                    cursor: 'pointer',
                    borderRadius: '6px'
                  }}
                />
                <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: '600' }}>Lembrar de mim</span>
              </label>
            </div>

            {error && (
              <div style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.12)', 
                color: '#f87171', 
                padding: '14px 18px', 
                borderRadius: '16px', 
                marginTop: '20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner"></span> Autenticando...
                </span>
              ) : (
                <>🚀 Acessar Sistema</>
              )}
            </button>
          </form>
          
          <UpdateBanner />
        </div>
        
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#3f3f46', fontWeight: '600', letterSpacing: '1px' }}>VERSION {CURRENT_APP_VERSION} • {settings.system_name.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
