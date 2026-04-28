import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password, remember);
    
    if (result.success) {
      // O result.user virá do AuthContext atualizado
      if (result.user?.role === 'client') {
        navigate('/player?autoStart=true');
      } else {
        navigate('/');
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

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

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <span style={{ color: 'var(--text-main)' }}>Continuar logado</span>
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
            {loading ? 'Entrando...' : 'Acessar Painel'}
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
