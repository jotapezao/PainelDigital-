import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ROLES = [
  { value: 'client', label: '👤 Cliente (Acesso ao Player)', desc: 'Apenas visualiza o player de mídia' },
  { value: 'estagiario', label: '📝 Gestor (Acesso ao Painel)', desc: 'Gerencia mídias e dispositivos' },
  { value: 'admin', label: '👑 Admin (Acesso Total)', desc: 'Acesso completo ao sistema' },
];

const ClientEditor = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    plan: 'basic',
    theme_color: '#6366f1',
    notes: '',
    active: true,
  });

  const [userForm, setUserForm] = useState({
    create: false,
    name: '',
    email: '',
    password: '',
    role: 'client',
  });

  const [linkedUsers, setLinkedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!isNew) {
          const [clientRes, usersRes] = await Promise.allSettled([
            api.get(`/clients/${id}`),
            api.get(`/clients/${id}/users`),
          ]);
          if (clientRes.status === 'fulfilled') setForm(clientRes.value.data);
          if (usersRes.status === 'fulfilled') setLinkedUsers(usersRes.value.data);
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do cliente.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast('warning', 'Atenção', 'Nome e E-mail da empresa são obrigatórios.');
      return;
    }
    if (isNew && userForm.create) {
      if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
        addToast('warning', 'Atenção', 'Preencha todos os campos do usuário de acesso.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...(isNew && userForm.create ? {
          user_name: userForm.name,
          user_email: userForm.email,
          user_password: userForm.password,
          user_role: userForm.role,
        } : {}),
      };
      if (isNew) {
        await api.post('/clients', payload);
        addToast('success', 'Sucesso', userForm.create
          ? 'Empresa e usuário criados com sucesso!'
          : 'Empresa criada com sucesso!');
      } else {
        await api.put(`/clients/${id}`, form);
        addToast('success', 'Sucesso', 'Empresa atualizada com sucesso!');
      }
      navigate('/clients');
    } catch (err) {
      const msg = err.response?.data?.error || 'Falha ao salvar.';
      addToast('error', 'Erro', msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setU = (key, val) => setUserForm(p => ({ ...p, [key]: val }));

  const tabStyle = (tab) => ({
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: tab === activeTab ? '700' : '500',
    color: tab === activeTab ? 'var(--primary)' : 'var(--text-dim)',
    borderBottom: tab === activeTab ? '2px solid var(--primary)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottom: tab === activeTab ? '2px solid var(--primary)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  if (loading) return <div className="loading-screen">Carregando...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <Link to="/clients" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Empresas
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>
            {isNew ? '🏢 Nova Empresa' : `✏️ ${form.name || 'Editar Empresa'}`}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/clients')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isNew ? '✨ Criar Empresa' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Tabs (only when editing) */}
      {!isNew && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '4px' }}>
          <button style={tabStyle('info')} onClick={() => setActiveTab('info')}>📋 Informações</button>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>
            👥 Usuários {linkedUsers.length > 0 && `(${linkedUsers.length})`}
          </button>
        </div>
      )}

      {/* TAB: Informações */}
      {(isNew || activeTab === 'info') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Basic info */}
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '20px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dados da Empresa</h3>

            <div className="input-group">
              <label>Nome da Empresa / Responsável *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Academia Fit Life" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Nome Fantasia / Marca</label>
                <input value={form.company || ''} onChange={e => set('company', e.target.value)} placeholder="Ex: FitLife Academia" />
              </div>
              <div className="input-group">
                <label>Telefone / WhatsApp</label>
                <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="input-group">
              <label>E-mail de Contato *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label>Plano de Assinatura</label>
                <select value={form.plan} onChange={e => set('plan', e.target.value)}>
                  <option value="basic">Básico</option>
                  <option value="pro">Profissional (Pro)</option>
                  <option value="enterprise">Corporativo (Enterprise)</option>
                </select>
              </div>
              <div className="input-group">
                <label>Cor do Tema</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={form.theme_color || '#6366f1'} onChange={e => set('theme_color', e.target.value)}
                    style={{ width: '50px', height: '42px', padding: '4px', cursor: 'pointer', borderRadius: '8px' }} />
                  <input value={form.theme_color || '#6366f1'} onChange={e => set('theme_color', e.target.value)}
                    placeholder="#6366f1" style={{ flex: 1 }} />
                </div>
              </div>
              <div className="input-group">
                <label>Status da Conta</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', height: '46px' }}>
                  <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.875rem' }}>Empresa Ativa</span>
                </label>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Observações Internas</label>
              <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                placeholder="Notas internas sobre este cliente..."
                rows={3} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Create first user (only on new) */}
          {isNew && (
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: userForm.create ? '20px' : 0 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Usuário de Acesso
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Crie o primeiro login de acesso para esta empresa
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={userForm.create} onChange={e => setU('create', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Criar agora</span>
                </label>
              </div>

              {userForm.create && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div className="input-group">
                    <label>Nome Completo do Usuário *</label>
                    <input value={userForm.name} onChange={e => setU('name', e.target.value)} placeholder="Ex: João Silva" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>E-mail de Login *</label>
                      <input type="email" value={userForm.email} onChange={e => setU('email', e.target.value)} placeholder="joao@empresa.com" />
                    </div>
                    <div className="input-group">
                      <label>Senha Provisória *</label>
                      <input type="password" value={userForm.password} onChange={e => setU('password', e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Nível de Acesso</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ROLES.filter(r => r.value !== 'admin').map(r => (
                        <label key={r.value} style={{
                          display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                          padding: '12px 16px', borderRadius: 'var(--radius-md)',
                          border: `1px solid ${userForm.role === r.value ? 'var(--primary)' : 'var(--border)'}`,
                          background: userForm.role === r.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                          transition: 'all 0.15s',
                        }}>
                          <input type="radio" name="user_role" value={r.value} checked={userForm.role === r.value}
                            onChange={() => setU('role', r.value)} style={{ accentColor: 'var(--primary)' }} />
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{r.label}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{r.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Usuários (edit mode) */}
      {!isNew && activeTab === 'users' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: '700' }}>Usuários vinculados</h3>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              onClick={() => navigate(`/users/new?client_id=${id}`)}>
              + Novo Usuário
            </button>
          </div>
          {linkedUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👥</div>
              <p>Nenhum usuário vinculado a esta empresa.</p>
              <button className="btn btn-outline" style={{ marginTop: '16px' }}
                onClick={() => navigate(`/users/new?client_id=${id}`)}>
                Criar Primeiro Usuário
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  {['Usuário', 'Função', 'Status', 'Ações'].map(col => (
                    <th key={col} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < linkedUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'estagiario' ? 'badge-secondary' : 'badge-outline'}`} style={{ textTransform: 'capitalize' }}>
                        {u.role === 'admin' ? '👑 Admin' : u.role === 'estagiario' ? '📝 Gestor' : '👤 Cliente'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: u.active ? 'var(--success)' : 'var(--text-dim)' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.active ? 'var(--success)' : 'var(--text-dim)', display: 'inline-block', marginRight: '6px' }} />
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={() => navigate(`/users/${u.id}`)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientEditor;
