import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';

const Login = () => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ system_name: 'Painel Digital', logo_url: null });
  const [updateInfo, setUpdateInfo] = useState({ latestVersion: null, url: null, force: false, message: '' });

  const CURRENT_APP_VERSION = '3.0.5';

  const { login } = useAuth();
  const navigate = useNavigate();
  const userInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const rememberRef = useRef(null);
  const submitButtonRef = useRef(null);
  const updateButtonRef = useRef(null);

  const [autoLoggingIn, setAutoLoggingIn] = useState(false);

  useEffect(() => {
    const loadRememberedAndAutoLogin = async () => {
      let email = '';
      let pass = '';

      try {
        const { value: prefEmail } = await Preferences.get({ key: 'pd_remember_email' });
        const { value: prefPass } = await Preferences.get({ key: 'pd_remember_password' });
        email = prefEmail || '';
        pass = prefPass || '';
      } catch {
        email = localStorage.getItem('pd_remember_email') || '';
        pass = localStorage.getItem('pd_remember_password') || '';
      }

      if (email) setLoginIdentifier(email);
      if (pass) setPassword(pass);

      // Auto-login: se ambos os campos estão preenchidos, faz login silencioso
      if (email && pass) {
        setAutoLoggingIn(true);
        setLoading(true);
        try {
          const result = await login(email, pass, true);
          if (result.success) {
            if (result.user?.role === 'client') {
              localStorage.setItem('pd_device_company', result.user?.client_name || '');
              navigate('/player?autoStart=true');
            } else {
              navigate('/');
            }
            return; // Evita mostrar a tela de login
          }
        } catch (e) {
          console.warn('[Login] Auto-login falhou:', e);
        }
        setAutoLoggingIn(false);
        setLoading(false);
      }
    };
    loadRememberedAndAutoLogin();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsResult, versionResult] = await Promise.allSettled([
          api.get('/settings'),
          api.get('/app-version')
        ]);
        if (settingsResult.status === 'fulfilled' && settingsResult.value?.data) {
          const d = settingsResult.value.data;
          setSettings({ system_name: d.system_name || 'Painel Digital', logo_url: d.logo_url || null });
        }
        if (versionResult.status === 'fulfilled' && versionResult.value?.data) {
          const d = versionResult.value.data;
          setUpdateInfo({ latestVersion: d.latestVersion || null, url: d.url || null, force: !!d.force, message: d.message || '' });
        }
      } catch {}
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    document.title = settings.system_name || 'Painel Digital';
  }, [settings.system_name]);

  useEffect(() => {
    const timer = setTimeout(() => { userInputRef.current?.focus?.(); }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(loginIdentifier, password, rememberMe);
    if (result.success) {
      if (rememberMe) {
        try {
          await Preferences.set({ key: 'pd_remember_email', value: loginIdentifier });
          await Preferences.set({ key: 'pd_remember_password', value: password });
        } catch (e) {
          console.error('Falha ao salvar remember nativo:', e);
        }
        localStorage.setItem('pd_remember_email', loginIdentifier);
        localStorage.setItem('pd_remember_password', password);
      } else {
        try {
          await Preferences.remove({ key: 'pd_remember_email' });
          await Preferences.remove({ key: 'pd_remember_password' });
        } catch {}
        localStorage.removeItem('pd_remember_email');
        localStorage.removeItem('pd_remember_password');
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

  const focusNextField = (event, nextRef) => {
    if (event.key === 'Enter') { event.preventDefault(); nextRef?.current?.focus?.(); }
  };

  const deviceCompany = localStorage.getItem('pd_device_company');

  const compareVersions = (v1, v2) => {
    if (!v1 || !v2) return 0;
    const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      if ((p1[i] || 0) > (p2[i] || 0)) return 1;
      if ((p1[i] || 0) < (p2[i] || 0)) return -1;
    }
    return 0;
  };

  const downloadUrl = updateInfo.url;
  const latestVersion = updateInfo.latestVersion;
  const isUpdateAvailable = latestVersion && compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;

  const handleDownloadClick = async (e) => {
    e.preventDefault();
    try { await Browser.open({ url: downloadUrl }); } catch { window.open(downloadUrl, '_blank'); }
  };
  // Mostra tela de carregamento durante auto-login
  if (autoLoggingIn) {
    return (
      <div className="login-page-container">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '20px', zIndex: 10
        }}>
          <div style={{
            width: '60px', height: '60px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: '#818cf8', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
            Conectando automaticamente...
          </p>
        </div>
        <style>{`
          .login-page-container {
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; background-color: #060608; font-family: 'Inter', sans-serif;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      {/* Background glow effects */}
      <div className="bg-glow bg-glow-left" />
      <div className="bg-glow bg-glow-right" />
      
      <div className="login-layout-wrapper">
        {/* Lado Esquerdo - Branding (TV / Desktop) */}
        <div className="login-branding-col">
          <div className="login-logo-container">
            <img
              src={settings.logo_url || '/logo.png'}
              alt="Logo"
              className="login-logo-img"
            />
          </div>
          <h1 className="login-branding-title">{settings.system_name}</h1>
          <p className="login-branding-subtitle">Gestão de telas profissional</p>
          
          <div className="login-status-badge">
            v{latestVersion || CURRENT_APP_VERSION}
          </div>
        </div>

        {/* Lado Direito - Formulário */}
        <div className="login-form-col">
          <div className="login-card-container">
            {/* Lado Esquerdo duplicado de forma simplificada em Mobile */}
            <div className="mobile-branding-header">
              <div className="login-logo-container small">
                <img src={settings.logo_url || '/logo.png'} alt="Logo" className="login-logo-img" />
              </div>
              <h1 className="login-branding-title small">{settings.system_name}</h1>
            </div>

            {deviceCompany && (
              <div className="linked-device-banner">
                <span className="banner-icon">📺</span>
                <span className="banner-text">
                  Vinculado a: <strong className="highlight">{deviceCompany}</strong>
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="input-field-group">
                <label className="input-field-label">Usuário ou E-mail</label>
                <input
                  ref={userInputRef}
                  className="tv-login-input"
                  type="text"
                  placeholder="Digite seu usuário ou email"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  onKeyDown={(e) => focusNextField(e, passwordInputRef)}
                  required
                  autoComplete="username"
                  inputMode="email"
                />
              </div>

              <div className="input-field-group">
                <label className="input-field-label">Senha</label>
                <input
                  ref={passwordInputRef}
                  className="tv-login-input"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); rememberRef.current?.focus?.(); } }}
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Mantenha-me Conectado (Checkbox) */}
              <div 
                className="remember-me-container"
                onClick={() => setRememberMe(prev => !prev)}
              >
                <button
                  type="button"
                  ref={rememberRef}
                  className={`remember-me-checkbox ${rememberMe ? 'checked' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setRememberMe(prev => !prev);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      submitButtonRef.current?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      passwordInputRef.current?.focus();
                    }
                  }}
                >
                  {rememberMe && <span className="check-mark">✓</span>}
                </button>
                <span className="remember-me-text">Mantenha-me conectado</span>
              </div>

              {error && (
                <div className="login-error-alert">
                  <span className="alert-icon">⚠️</span>
                  <span className="alert-text">{error}</span>
                </div>
              )}

              <button
                ref={submitButtonRef}
                type="submit"
                className="tv-login-btn"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    rememberRef.current?.focus();
                  } else if (e.key === 'ArrowDown' && updateButtonRef.current) {
                    e.preventDefault();
                    updateButtonRef.current.focus();
                  }
                }}
              >
                {loading ? (
                  <>
                    <span className="tv-spinner" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </form>

            {downloadUrl && (
              <a
                href={downloadUrl}
                ref={updateButtonRef}
                className="tv-update-btn"
                onClick={handleDownloadClick}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    submitButtonRef.current?.focus();
                  }
                }}
              >
                <span className="btn-icon">⬇️</span>
                <span>{isUpdateAvailable ? `Atualizar para v${latestVersion}` : 'Baixar APK'}</span>
              </a>
            )}
            
            <p className="tv-footer-version">
              Versão {latestVersion || CURRENT_APP_VERSION}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

        .login-page-container {
          display: flex;
          min-height: 100vh;
          background-color: #060608;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
        }

        /* Background Glowing Blobs */
        .bg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 1;
        }

        .bg-glow-left {
          top: 10%;
          left: 5%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
        }

        .bg-glow-right {
          bottom: 10%;
          right: 5%;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%);
        }

        /* Layout Split-Screen Wrapper */
        .login-layout-wrapper {
          display: flex;
          width: 100%;
          max-width: 1300px;
          margin: auto;
          z-index: 10;
          padding: 20px;
          gap: 40px;
        }

        .login-branding-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 40px;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          animation: fadeIn 0.8s ease both;
        }

        .login-form-col {
          flex: 1.2;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          animation: fadeIn 0.8s ease 0.2s both;
        }

        /* Logo & Branding */
        .login-logo-container {
          width: 130px;
          height: 130px;
          margin-bottom: 24px;
          border-radius: 32px;
          overflow: hidden;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 16px 40px rgba(99, 102, 241, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          animation: pulse 3s infinite ease-in-out;
        }

        .login-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .login-branding-title {
          font-family: 'Outfit', sans-serif;
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
          letter-spacing: -1.5px;
        }

        .login-branding-subtitle {
          color: rgba(255, 255, 255, 0.4);
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 30px;
        }

        .login-status-badge {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 30px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        /* Form Card */
        .login-card-container {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 15, 22, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 32px;
          padding: 48px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
        }

        .mobile-branding-header {
          display: none;
          text-align: center;
          margin-bottom: 32px;
        }

        /* Inputs */
        .input-field-group {
          margin-bottom: 24px;
        }

        .input-field-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .tv-login-input {
          width: 100%;
          box-sizing: border-box;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 500;
          font-family: 'Outfit', sans-serif;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .tv-login-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }

        /* Focus and D-Pad styling */
        .tv-login-input:focus {
          outline: none;
          border-color: #818cf8;
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(99, 102, 241, 0.15);
          transform: scale(1.02);
        }

        /* Remember Me Checkbox */
        .remember-me-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
          cursor: pointer;
          user-select: none;
          width: fit-content;
        }

        .remember-me-checkbox {
          width: 24px;
          height: 24px;
          border-radius: 8px;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.2s;
        }

        .remember-me-checkbox:focus {
          outline: none;
          border-color: #818cf8;
          background: rgba(99, 102, 241, 0.1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
          transform: scale(1.1);
        }

        .remember-me-checkbox.checked {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .check-mark {
          color: #fff;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .remember-me-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.95rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .remember-me-container:hover .remember-me-text {
          color: #fff;
        }

        /* Linked Device Banner */
        .linked-device-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          margin-bottom: 28px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          animation: pulseBorder 2.5s infinite;
        }

        .linked-device-banner .highlight {
          color: #a5b4fc;
        }

        /* Errors */
        .login-error-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          margin-bottom: 24px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 16px;
          color: #f87171;
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* Buttons */
        .tv-login-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 16px;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          letter-spacing: 0.5px;
          margin-top: 10px;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .tv-login-btn:hover {
          filter: brightness(1.1);
          box-shadow: 0 12px 30px rgba(99, 102, 241, 0.45);
        }

        .tv-login-btn:focus {
          outline: none;
          transform: scale(1.03);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.35), 0 0 25px rgba(99, 102, 241, 0.7);
        }

        .tv-login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Update Button */
        .tv-update-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          margin-top: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          font-family: 'Outfit', sans-serif;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .tv-update-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .tv-update-btn:focus {
          outline: none;
          transform: scale(1.02);
          border-color: #818cf8;
          color: #fff;
          background: rgba(99, 102, 241, 0.06);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
        }

        .tv-footer-version {
          text-align: center;
          margin-top: 24px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.2);
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 16px 40px rgba(99, 102, 241, 0.35); }
          50% { transform: scale(1.03); box-shadow: 0 20px 50px rgba(99, 102, 241, 0.5); }
          100% { transform: scale(1); box-shadow: 0 16px 40px rgba(99, 102, 241, 0.35); }
        }

        @keyframes pulseBorder {
          0% { border-color: rgba(99, 102, 241, 0.2); }
          50% { border-color: rgba(99, 102, 241, 0.5); }
          100% { border-color: rgba(99, 102, 241, 0.2); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .tv-spinner {
          width: 22px;
          height: 22px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Responsive queries */
        @media (max-width: 991px) and (orientation: portrait), (max-width: 600px) {
          .login-layout-wrapper {
            flex-direction: column;
            justify-content: center;
            align-items: center;
            max-width: 540px;
            padding: 20px;
          }
          
          .login-branding-col {
            display: none;
          }
          
          .mobile-branding-header {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .login-logo-container.small {
            width: 80px;
            height: 80px;
            margin-bottom: 12px;
            border-radius: 20px;
          }
          
          .login-branding-title.small {
            font-size: 1.8rem;
          }
          
          .login-card-container {
            padding: 28px 24px;
            border-radius: 20px;
            width: 100%;
          }
          
          .login-form-col {
            width: 100%;
          }
        }

        /* Android TV / telas landscape compactas */
        @media (max-height: 800px) and (orientation: landscape) {
          .login-layout-wrapper {
            padding: 10px;
            gap: 20px;
          }

          .login-branding-col {
            padding: 10px;
          }

          .login-logo-container {
            width: 90px;
            height: 90px;
            margin-bottom: 16px;
            border-radius: 20px;
          }

          .login-branding-title {
            font-size: 2.2rem;
            margin-bottom: 6px;
          }

          .login-branding-subtitle {
            font-size: 1rem;
            margin-bottom: 20px;
          }

          .login-card-container {
            padding: 24px 30px;
            border-radius: 20px;
            max-width: 440px;
          }

          .input-field-group {
            margin-bottom: 16px;
          }

          .input-field-label {
            font-size: 0.75rem;
            margin-bottom: 6px;
          }

          .tv-login-input {
            padding: 12px 16px;
            font-size: 0.95rem;
            border-radius: 12px;
          }

          .remember-me-container {
            margin-bottom: 16px;
          }

          .remember-me-checkbox {
            width: 20px;
            height: 20px;
          }

          .remember-me-text {
            font-size: 0.85rem;
          }

          .tv-login-btn {
            padding: 14px;
            font-size: 1rem;
            border-radius: 12px;
            margin-top: 5px;
          }

          .tv-update-btn {
            padding: 12px;
            font-size: 0.85rem;
            border-radius: 12px;
            margin-top: 12px;
          }

          .tv-footer-version {
            margin-top: 16px;
            font-size: 0.75rem;
          }
          
          .linked-device-banner {
            padding: 12px 16px;
            margin-bottom: 20px;
            font-size: 0.85rem;
          }
          
          .login-error-alert {
            padding: 12px 16px;
            margin-bottom: 16px;
            font-size: 0.85rem;
          }
        }
        
        /* Ultra compact TV (e.g. 540px height) */
        @media (max-height: 550px) and (orientation: landscape) {
           .login-card-container {
             padding: 16px 20px;
           }
           .login-logo-container {
             width: 70px;
             height: 70px;
             margin-bottom: 10px;
           }
           .login-branding-title {
             font-size: 1.8rem;
           }
           .input-field-group {
             margin-bottom: 12px;
           }
           .tv-login-input {
             padding: 10px 14px;
           }
           .tv-login-btn {
             padding: 12px;
             margin-top: 0px;
           }
           .tv-update-btn {
             padding: 10px;
             margin-top: 10px;
           }
        }
      `}</style>
    </div>
  );
};

export default Login;
