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
      background: 'radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%)',
      padding: '20px'
    }}>
      <div className="card glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', background: 'linear-gradient(to right, #818cf8, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Painel Digital
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Entre para gerenciar seus dispositivos</p>
        </div>

        <TvModeBanner />

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Usuário ou E-mail</label>
            <input 
              type="text" 
              placeholder="seu_usuario ou seu@email.com" 
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '500' }}>
              <input 
                type="checkbox" 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ color: 'var(--text-main)' }}>Lembrar e-mail neste dispositivo</span>
            </label>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--error)', 
              padding: '12px', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '20px',
              fontSize: '0.875rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : '📺 Acessar Painel'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-dim)' }}>
          Precisa de ajuda? <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Falar com suporte</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
