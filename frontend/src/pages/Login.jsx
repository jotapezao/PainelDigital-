import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Browser } from '@capacitor/browser';

const Login = () => {
  const [loginIdentifier, setLoginIdentifier] = useState(() => localStorage.getItem('pd_remember_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('pd_remember_password') || sessionStorage.getItem('pd_last_password') || '');
  const [remember, setRemember] = useState(true);
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
  const [updateInfo, setUpdateInfo] = useState({
    latestVersion: null,
    url: null,
    force: false,
    message: ''
  });
  
  const CURRENT_APP_VERSION = '3.0.5';
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const userInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const submitButtonRef = useRef(null);
  const updateButtonRef = useRef(null);

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
        const [settingsResult, versionResult] = await Promise.allSettled([
          api.get('/settings'),
          api.get('/app-version')
        ]);

        if (settingsResult.status === 'fulfilled' && settingsResult.value?.data) {
          const res = settingsResult.value;
          setSettings({
            system_name: res.data.system_name || 'Painel Digital',
            logo_url: res.data.logo_url || null,
            latest_app_version: res.data.latest_app_version,
            app_download_url: res.data.app_download_url,
            app_update_message: res.data.app_update_message
          });
        }

        if (versionResult.status === 'fulfilled' && versionResult.value?.data) {
          setUpdateInfo({
            latestVersion: versionResult.value.data.latestVersion || null,
            url: versionResult.value.data.url || null,
            force: !!versionResult.value.data.force,
            message: versionResult.value.data.message || ''
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

  useEffect(() => {
    const savedPassword = localStorage.getItem('pd_remember_password') || sessionStorage.getItem('pd_last_password') || '';
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      userInputRef.current?.focus?.();
      userInputRef.current?.select?.();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(loginIdentifier, password, remember);
    
    if (result.success) {
      if (remember) {
        localStorage.setItem('pd_remember_email', loginIdentifier);
        localStorage.setItem('pd_remember_password', password);
      } else {
        localStorage.removeItem('pd_remember_email');
        localStorage.removeItem('pd_remember_password');
      }
      sessionStorage.setItem('pd_last_password', password);
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

  const handlePasswordChange = (value) => {
    setPassword(value);
    sessionStorage.setItem('pd_last_password', value);
    if (remember) {
      localStorage.setItem('pd_remember_password', value);
    }
  };

  const focusNextField = (event, nextRef) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      nextRef?.current?.focus?.();
    }
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
    const downloadUrl = updateInfo.url || settings.app_download_url;
    if (!downloadUrl) return null;
    
    const latestVersion = updateInfo.latestVersion || settings.latest_app_version;
    const updateMessage = updateInfo.message || settings.app_update_message || '';
    const isUpdateAvailable = latestVersion && compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;
    
    const handleDownloadClick = async (e) => {
      e.preventDefault();
      try {
        await Browser.open({ url: downloadUrl });
      } catch (err) {
        window.open(downloadUrl, '_blank');
      }
    };

    return (
      <div style={{ textAlign: 'center', marginTop: '14px' }}>
        <a
          href={downloadUrl}
          onClick={handleDownloadClick}
          ref={updateButtonRef}
          style={{
            color: '#e4e4e7',
            fontSize: '0.95rem',
            textDecoration: 'none',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            borderRadius: '999px',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            background: 'rgba(99, 102, 241, 0.12)',
            boxShadow: '0 8px 18px rgba(0, 0, 0, 0.18)',
            minWidth: '220px'
          }}
          tabIndex={0}
        >
          <span>⬇️</span>
          <span>
            {isUpdateAvailable
              ? `Atualizar para v${latestVersion}`
              : 'Atualizar sistema / APK'}
          </span>
        </a>
        {updateMessage && (
          <div style={{ marginTop: '8px', color: '#a1a1aa', fontSize: '0.72rem', lineHeight: '1.35' }}>
            {updateMessage}
          </div>
        )}
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
          border-radius: 28px;
          padding: 32px;
          width: 90%;
          max-width: 380px;
          max-height: 95vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          position: relative;
          z-index: 10;
          transition: all 0.3s ease;
          scrollbar-width: none;
        }
        .login-card:focus-within {
          box-shadow: 0 0 0 2px rgba(99,102,241,0.35), 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .login-card::-webkit-scrollbar {
          display: none;
        }
        
        /* Landscape Optimization for Mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .login-card {
            padding: 18px 28px;
            max-width: 560px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 28px;
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
            max-width: 800px;
            height: 85vh;
            padding: 24px;
            gap: 24px;
            align-items: center;
          }
          .login-header {
            flex: 0.38;
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
            font-size: 1.5rem !important;
          }
          form {
            flex: 0.62;
            overflow-y: auto;
            padding-right: 10px;
          }
          .login-button {
            margin-top: 16px !important;
            padding: 15px !important;
            min-height: 56px;
          }
          .tv-mode-banner {
            display: none;
          }
        }

        @media (max-height: 820px) {
          .login-card {
            padding: 26px 22px;
            max-width: 430px;
            border-radius: 26px;
          }
          .login-header {
            margin-bottom: 22px !important;
          }
          .login-logo {
            width: 90px !important;
            height: 90px !important;
            margin-bottom: 14px !important;
          }
          .login-title {
            font-size: 1.9rem !important;
          }
          .login-input {
            padding: 14px 16px !important;
            font-size: 1rem !important;
          }
          .login-button {
            padding: 15px !important;
            margin-top: 18px !important;
            font-size: 1rem !important;
            min-height: 58px;
          }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px;
            border-radius: 28px;
            width: 90%;
            margin: auto;
          }
          .login-logo {
            width: 84px !important;
            height: 84px !important;
          }
          .login-title {
            font-size: 1.6rem !important;
          }
          .login-input {
            padding: 14px 16px !important;
            font-size: 1rem !important;
            margin-top: 6px;
          }
          .login-button {
            padding: 15px !important;
            margin-top: 20px !important;
            font-size: 1rem !important;
            min-height: 58px;
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
        .login-input, .login-button, a, button, input, label {
          -webkit-tap-highlight-color: transparent;
        }
        .login-input:focus-visible, .login-button:focus-visible, a:focus-visible, button:focus-visible {
          outline: 3px solid rgba(99,102,241,0.8);
          outline-offset: 3px;
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
          min-height: 56px;
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
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="login-logo" style={{ 
            width: '108px',
            height: '108px',
            background: settings.logo_url ? 'rgba(255, 255, 255, 0.02)' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
            borderRadius: '24px', 
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: settings.logo_url ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 12px 24px -8px rgba(99, 102, 241, 0.5)',
            overflow: 'hidden',
            border: settings.logo_url ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255,255,255,0.1)',
            padding: settings.logo_url ? '12px' : '0'
          }}>
             <img src={settings.logo_url || "/logo.png"} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title" style={{ 
            fontSize: '2rem',
            fontWeight: '900', 
            letterSpacing: '-0.04em',
            marginBottom: '8px', 
            background: 'linear-gradient(to right, #fff, #a1a1aa)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}>
            {settings.system_name}
          </h1>
          <p style={{ color: '#a1a1aa', fontWeight: '500', fontSize: '0.84rem', lineHeight: '1.45', margin: 0 }}>Controle suas telas de qualquer lugar com inteligência</p>
        </div>

        <div style={{ flex: 1 }}>
          <TvModeBanner />

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '1rem', fontWeight: '800', color: '#e4e4e7', marginLeft: '4px' }}>Usuário ou E-mail</label>
              <input 
                ref={userInputRef}
                className="login-input"
                type="text" 
                placeholder="seu_usuario ou seu@email.com" 
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                onKeyDown={(e) => focusNextField(e, passwordInputRef)}
                required
                autoComplete="username"
                inputMode="text"
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '1rem', fontWeight: '800', color: '#e4e4e7', marginLeft: '4px' }}>Senha</label>
              <input 
                ref={passwordInputRef}
                className="login-input"
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitButtonRef.current?.focus?.();
                  }
                }}
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minHeight: '44px' }}>
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
                <span style={{ fontSize: '0.98rem', color: '#a1a1aa', fontWeight: '700' }}>Lembrar de mim</span>
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
              ref={submitButtonRef}
              type="submit" 
              className="login-button" 
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  updateButtonRef.current?.focus?.();
                }
              }}
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
          
          <div style={{ marginTop: '16px' }}>
            <UpdateBanner />
          </div>
        </div>
        
        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.64rem', color: '#3f3f46', fontWeight: '700', letterSpacing: '1.2px', margin: 0 }}>VERSION {settings.latest_app_version || CURRENT_APP_VERSION} • {settings.system_name.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
