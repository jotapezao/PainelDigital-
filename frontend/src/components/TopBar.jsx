import { useAuth } from '../contexts/AuthContext';

const TopBar = ({ title, onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="topbar" style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px', // Reduced padding for mobile
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={onMenuClick}
          className="btn btn-outline mobile-only"
          style={{ padding: '8px', display: 'none' }} // Hidden by default, shown by CSS
        >
          ☰
        </button>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user?.name}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
        </div>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          color: 'var(--primary)',
          fontSize: '0.875rem'
        }}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
