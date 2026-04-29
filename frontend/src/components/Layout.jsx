import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = ({ title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1999,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
          }} 
        />
      )}

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        minWidth: 0
      }} className="main-content">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="main-padding" style={{ flex: 1, overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
