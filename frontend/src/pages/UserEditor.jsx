import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ROLE_OPTIONS = [
  { value: 'client',     label: '👤 Cliente',  desc: 'Acesso apenas ao player de mídia' },
  { value: 'estagiario', label: '📝 Gestor',   desc: 'Gerencia mídias, playlists e dispositivos' },
  { value: 'admin',      label: '👑 Admin',    desc: 'Acesso total ao sistema' },
];

const UserEditor = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    client_id: searchParams.get('client_id') || '',
    active: true,
    avatar_url: '',
  });

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRes = await api.get('/clients');
        setClients(clientsRes.data);
        if (!isNew) {
          const res = await api.get(`/auth/users/${id}`);
          setForm({ ...res.data, password: '' });
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast('warning', 'Atenção', 'Nome e E-mail são obrigatórios.');
      return;
    }
    if (isNew && !form.password.trim()) {
      addToast('warning', 'Atenção', 'A senha é obrigatória para novos usuários.');
      return;
    }
    if (form.role !== 'admin' && !form.client_id) {
      addToast('warning', 'Atenção', 'Selecione a empresa vinculada ao usuário.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, client_id: form.client_id || null };
      if (isNew) {
        await api.post('/auth/register', payload);
      } else {
        // Don't send empty password
        if (!payload.password) delete payload.password;
        await api.put(`/auth/users/${id}`, payload);
      }
      addToast('success', 'Sucesso', 'Usuário salvo com sucesso!');
      navigate('/users');
    } catch (err) {
      const msg = err.response?.data?.error || 'Falha ao salvar usuário.';
      addToast('error', 'Erro', msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  const selectedClient = clients.find(c => c.id === form.client_id);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <Link to="/users" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Usuários
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>
            {isNew ? '👤 Novo Usuário' : `✏️ ${form.name || 'Editar Usuário'}`}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/users')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isNew ? '✨ Criar Usuário' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Avatar preview */}
        <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ flexShrink: 0 }}>
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar"
                style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }}
                onError={e => { e.target.src = ''; }}
              />
            ) : (
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.6rem', fontWeight: '800'
              }}>
                {form.name ? form.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-muted)' }}>
              URL da Foto de Perfil
            </label>
            <input type="url" value={form.avatar_url || ''} onChange={e => set('avatar_url', e.target.value)}
              placeholder="https://exemplo.com/avatar.jpg" />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Cole a URL de uma imagem pública. A prévia é atualizada automaticamente.
            </p>
          </div>
        </div>

        {/* Main form */}
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
            Dados de Acesso
          </h3>

          <div className="input-group">
            <label>Nome Completo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: João Silva" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>E-mail (Login) *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div className="input-group">
              <label>{isNew ? 'Senha Provisória *' : 'Nova Senha'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={isNew ? '••••••••' : 'Deixe em branco para manter'}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '1.1rem' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {!isNew && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>Deixe vazio para manter a senha atual.</p>
              )}
            </div>
          </div>
        </div>

        {/* Role & Company */}
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
            Perfil & Permissões
          </h3>

          {/* Role selector */}
          <div className="input-group">
            <label>Nível de Acesso *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ROLE_OPTIONS.map(r => (
                <label key={r.value} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                  padding: '14px 16px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${form.role === r.value ? 'var(--primary)' : 'var(--border)'}`,
                  background: form.role === r.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                    onChange={() => set('role', r.value)} style={{ accentColor: 'var(--primary)' }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{r.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Company link — required unless admin */}
          {form.role !== 'admin' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>
                Empresa Vinculada *
                {!form.client_id && (
                  <span style={{ marginLeft: '8px', color: 'var(--warning)', fontSize: '0.75rem' }}>⚠ Obrigatório para este perfil</span>
                )}
              </label>
              <select
                value={form.client_id}
                onChange={e => set('client_id', e.target.value)}
                style={{ borderColor: !form.client_id ? 'var(--warning)' : 'var(--border)' }}>
                <option value="">— Selecione uma empresa —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
                ))}
              </select>
              {selectedClient && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                  {selectedClient.device_count || 0} dispositivos · Plano: {selectedClient.plan || 'basic'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="card" style={{ padding: '20px 28px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
            <div>
              <div style={{ fontWeight: '600' }}>Usuário com Acesso Habilitado</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Desmarque para bloquear o login sem excluir o usuário.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default UserEditor;
