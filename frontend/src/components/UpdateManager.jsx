import { useState, useEffect } from 'react';
import api from '../services/api';

const APP_VERSION = '3.0.5'; // VERSÃO ATUAL DO APK

const UpdateManager = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const response = await api.get('/app-version');
        const { latestVersion, url, force, message } = response.data;

        if (isVersionOlder(APP_VERSION, latestVersion)) {
          const updateData = { latestVersion, url, force, message, currentVersion: APP_VERSION };
          localStorage.setItem('app_update_available', JSON.stringify(updateData));
          
          // Notifica o sistema que há uma atualização
          window.dispatchEvent(new CustomEvent('app:update_available', { detail: updateData }));
        } else {
          localStorage.removeItem('app_update_available');
          window.dispatchEvent(new CustomEvent('app:update_cleared'));
        }
      } catch (error) {
        console.error('Falha ao verificar atualizações OTA:', error);
      }
    };

    checkUpdate();
    const interval = setInterval(checkUpdate, 4 * 60 * 60 * 1000); // 4h
    
    const handleRecheck = () => checkUpdate();
    window.addEventListener('app:recheck_update', handleRecheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener('app:recheck_update', handleRecheck);
    };
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

  return null; // Silent component
};

export default UpdateManager;
