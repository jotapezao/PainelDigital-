import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const Settings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    system_name: '',
    whatsapp_number: '',
    support_text: '',
    primary_color: '#6366f1',
    logo_url: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      addToast('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast('Configurações atualizadas com sucesso!', 'success');
    } catch (err) {
      addToast('Erro ao atualizar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;

  const updateData = JSON.parse(localStorage.getItem('app_update_available') || 'null');

  return (
    <div className="animate-fade-in">
      {updateData && (
        <div className="card" style={{ 
          marginBottom: '24px', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🚀 Nova versão disponível (v{updateData.latestVersion})
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{updateData.message}</p>
          </div>
          <button 
            onClick={() => window.location.href = updateData.url}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.875rem' }}
          >
            Baixar Atualização
          </button>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Configurações do Sistema</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="input-group">
              <label>Nome do Sistema <span className="info-icon" title="O nome que aparece na barra lateral e título da página">?</span></label>
              <input 
                type="text" 
                value={settings.system_name} 
                onChange={e => setSettings({...settings, system_name: e.target.value})} 
                placeholder="Ex: Painel Digital Pro"
              />
            </div>
            
            <div className="input-group">
              <label>WhatsApp de Suporte <span className="info-icon" title="Número que será usado no botão de suporte (com DDD e sem espaços)">?</span></label>
              <input 
                type="text" 
                value={settings.whatsapp_number} 
                onChange={e => setSettings({...settings, whatsapp_number: e.target.value})} 
                placeholder="Ex: 5511999999999"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Mensagem de Suporte <span className="info-icon" title="Texto explicativo que aparece no suporte">?</span></label>
            <textarea 
              rows="3" 
              value={settings.support_text} 
              onChange={e => setSettings({...settings, support_text: e.target.value})}
              placeholder="Como podemos ajudar você hoje?"
            />
          </div>

          <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="input-group">
              <label>Cor Primária <span className="info-icon" title="Cor principal do sistema (botões, ícones ativos)">?</span></label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={settings.primary_color} 
                  onChange={e => setSettings({...settings, primary_color: e.target.value})}
                  style={{ width: '60px', padding: '2px', height: '45px' }}
                />
                <span>{settings.primary_color}</span>
              </div>
            </div>
            
            <div className="input-group">
              <label>Logotipo do Sistema <span className="info-icon" title="Imagem da logo do sistema (recomendado PNG transparente)">?</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                {settings.logo_url && (
                  <div style={{ width: '60px', height: '60px', background: '#27272a', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={settings.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    id="logo-upload"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const token = localStorage.getItem('token');
                        const res = await axios.post('/api/settings/logo', formData, {
                          headers: { 
                            'Content-Type': 'multipart/form-data',
                            Authorization: `Bearer ${token}` 
                          }
                        });
                        setSettings({ ...settings, logo_url: res.data.url });
                        addToast('Logo carregada com sucesso!', 'success');
                      } catch (err) {
                        addToast('Erro ao carregar logo', 'error');
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="logo-upload" className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {settings.logo_url ? 'Alterar Logo' : 'Selecionar Logo'}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '24px' }}>Gerenciamento de Versão (APK/GitHub)</h2>
        <div className="input-group" style={{ marginBottom: '24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Configure aqui a versão mais recente do aplicativo Android. Quando você alterar a versão aqui, todos os dispositivos conectados receberão uma notificação para baixar o novo arquivo.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="input-group">
              <label>Repositório GitHub (Opcional) <span className="info-icon" title="Ex: jotapezao/Midiamaisapk - Se preenchido, o sistema buscará o APK automaticamente nos Releases">?</span></label>
              <input 
                type="text" 
                value={settings.github_repo || ''} 
                onChange={e => setSettings({...settings, github_repo: e.target.value})} 
                placeholder="usuario/repositorio"
              />
            </div>

            <div className="input-group">
              <label>Versão Manual (Fall-back) <span className="info-icon" title="Usado se o repositório não for configurado">?</span></label>
              <input 
                type="text" 
                value={settings.latest_app_version || ''} 
                onChange={e => setSettings({...settings, latest_app_version: e.target.value})} 
                placeholder="1.0.1"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Link Direto do APK (Manual) <span className="info-icon" title="O link para download se não usar o GitHub automático">?</span></label>
            <input 
              type="text" 
              value={settings.app_download_url || ''} 
              onChange={e => setSettings({...settings, app_download_url: e.target.value})} 
              placeholder="https://github.com/usuario/repo/releases/latest/download/app.apk"
            />
          </div>

          <div className="input-group">
            <label>Mensagem da Atualização <span className="info-icon" title="O que aparecerá para o usuário final na tela do dispositivo">?</span></label>
            <input 
              type="text" 
              value={settings.app_update_message || ''} 
              onChange={e => setSettings({...settings, app_update_message: e.target.value})} 
              placeholder="Temos uma nova versão disponível com melhorias!"
            />
          </div>

          <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="force_update"
              checked={settings.app_force_update || false} 
              onChange={e => setSettings({...settings, app_force_update: e.target.checked})}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="force_update" style={{ marginBottom: 0, cursor: 'pointer' }}>Forçar Atualização (Bloqueia o uso até atualizar)</label>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Atualizar Versão' : 'Salvar Configurações de Versão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
