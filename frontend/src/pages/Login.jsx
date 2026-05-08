import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loginIdentifier, setLoginIdentifier] = useState(() => localStorage.getItem('pd_remember_email') || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('pd_remember_email'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tvModeChecked, setTvModeChecked] = useState(false);
  
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
          background: rgba(24, 24, 27, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 40px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          position: relative;
          z-index: 10;
          transition: all 0.3s ease;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .login-card::-webkit-scrollbar {
          width: 6px;
        }
        .login-card::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        @media (max-width: 480px) or (max-height: 500px) {
          .login-card {
            padding: 24px;
            border-radius: 24px;
          }
          .login-header {
            margin-bottom: 20px !important;
          }
          .login-logo {
            width: 48px !important;
            height: 48px !important;
            margin-bottom: 12px !important;
          }
          .login-logo img {
            width: 32px !important;
            height: 32px !important;
          }
          .login-title {
            font-size: 1.5rem !important;
          }
          .login-input {
            padding: 10px 14px !important;
            font-size: 0.9rem !important;
          }
          .login-button {
            padding: 12px !important;
            margin-top: 16px !important;
          }
        }
        .login-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(39, 39, 42, 0.5);
          border: 1px solid rgba(63, 63, 70, 0.5);
          border-radius: 14px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 8px;
        }
        .login-input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(39, 39, 42, 0.8);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }
        .login-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -10px rgba(99, 102, 241, 0.5);
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
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
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
            width: '80px', 
            height: '80px', 
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
            borderRadius: '20px', 
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 24px -8px rgba(99, 102, 241, 0.5)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
             <img src="./logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            Painel Digital
          </h1>
          <p style={{ color: '#a1a1aa', fontWeight: '500', fontSize: '0.9rem', lineHeight: '1.4' }}>Controle suas telas de qualquer lugar com inteligência</p>
        </div>

        <TvModeBanner />

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e4e4e7' }}>Usuário ou E-mail</label>
            <input 
              className="login-input"
              type="text" 
              placeholder="seu_usuario ou seu@email.com" 
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e4e4e7' }}>Senha</label>
            <input 
              className="login-input"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: '#6366f1',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#a1a1aa', fontWeight: '500' }}>Lembrar de mim</span>
            </label>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#f87171', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginTop: '24px',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
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

        {/* Footer info removed */}
      </div>
    </div>
  );
};

export default Login;
