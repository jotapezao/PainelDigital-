import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Icon = ({ name }) => {
  const icons = {
    dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
    media: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    playlist: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M8 8h8"/><path d="M8 16h8"/></svg>,
    devices: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="15" x="2" y="3" rx="2"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>,
    users: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    calendar: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
    logs: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
    help: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    logout: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
  };
  return icons[name] || null;
};

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        setSettings(res.data);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Mídias', path: '/medias', icon: 'media' },
    { name: 'Planos', path: '/playlists', icon: 'playlist' },
    { name: 'Dispositivos', path: '/devices', icon: 'devices' },
    { name: 'Agendamentos', path: '/schedules', icon: 'calendar' },
    { name: 'Logs', path: '/logs', icon: 'logs' },
  ];

  if (user?.role === 'admin') {
    menuItems.splice(4, 0, { name: 'Clientes', path: '/clients', icon: 'users' });
    menuItems.splice(5, 0, { name: 'Usuários', path: '/users', icon: 'users' });
    menuItems.push({ name: 'Configurações', path: '/settings', icon: 'settings' });
  } else if (user?.role === 'estagiario') {
    // Estagiário vê quase tudo
  } else if (user?.role === 'client') {
    return null;
  }

  const handleSupport = () => {
    if (settings?.whatsapp_number) {
      window.open(`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(settings.support_text || 'Olá, preciso de suporte no Painel Digital.')}`, '_blank');
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      transition: 'transform 0.3s ease, background-color 0.3s ease',
      zIndex: 2001
    }}>
      <div className="sidebar-header" style={{
        padding: '30px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
            }}>{(settings?.system_name || 'P')[0]}</div>
          )}
          <span className="sidebar-text" style={{ 
            fontSize: '1.25rem', fontWeight: '700', fontFamily: 'Outfit',
            color: 'var(--text-main)'
          }}>{settings?.system_name || 'Painel Digital'}</span>
        </div>
        
        <button 
          onClick={onClose}
          className="mobile-only"
          style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer', display: 'none' }}
        >
          ✕
        </button>
      </div>

      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none' }}>
          {menuItems.map((item) => (
            <li key={item.path} style={{ marginBottom: '4px' }}>
              <NavLink 
                to={item.path}
                onClick={() => { if (window.innerWidth <= 768) onClose(); }}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: isActive ? '700' : '500',
                  backgroundColor: isActive ? 'var(--sidebar-item-active)' : 'transparent',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent'
                })}
              >
                <span style={{ color: 'inherit', display: 'flex' }}><Icon name={item.icon} /></span>
                <span className="sidebar-text">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer" style={{
        padding: '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {settings?.whatsapp_number && (
          <button 
            onClick={handleSupport}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
              borderRadius: 'var(--radius-md)', backgroundColor: 'transparent', border: 'none',
              color: 'var(--success)', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: '600'
            }}
          >
            <Icon name="help" />
            <span className="sidebar-text">Suporte WhatsApp</span>
          </button>
        )}
        
        <button 
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
            borderRadius: 'var(--radius-md)', backgroundColor: 'transparent', border: 'none',
            color: 'var(--error)', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: '600'
          }}
        >
          <Icon name="logout" />
          <span className="sidebar-text">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
