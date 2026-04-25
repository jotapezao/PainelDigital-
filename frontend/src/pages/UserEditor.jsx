import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const UserEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    client_id: '',
    active: true
  });
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRes = await api.get('/clients');
        setClients(clientsRes.data);

        if (id && id !== 'new') {
          const res = await api.get(`/auth/users/${id}`);
          setForm({
            ...res.data,
            password: '' // Don't load password
          });
        }
      } catch (err) {
        addToast('error', 'Erro', 'Falha ao carregar dados do usuário.');
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
    if (id === 'new' && !form.password.trim()) {
      addToast('warning', 'Atenção', 'A senha é obrigatória para novos usuários.');
      return;
    }
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await api.put(`/auth/users/${id}`, form);
      } else {
        await api.post('/auth/register', form);
      }
      addToast('success', 'Sucesso', 'Usuário salvo com sucesso!');
      navigate('/users');
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/users" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Usuários
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '👤 Novo Usuário' : '✏️ Editar Usuário'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/users')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '40px' }}>
        <div className="input-group">
          <label>Nome Completo *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João Silva" />
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>E-mail (Login) *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
          </div>
          <div className="input-group">
            <label>{id === 'new' ? 'Senha Provisória *' : 'Nova Senha (deixe em branco para manter)'}</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
          </div>
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>Nível de Acesso</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="client">👤 Cliente (Acesso ao Player)</option>
              <option value="estagiario">📝 Estagiário (Gestor)</option>
              <option value="admin">👑 Administrador (Total)</option>
            </select>
          </div>
          {form.role !== 'admin' && (
            <div className="input-group">
              <label>Vincular a uma Empresa *</label>
              <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">— Selecione uma Empresa —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} style={{ width: '20px', height: '20px' }} />
            <span>Usuário com Acesso Habilitado</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default UserEditor;
