import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const UserModal = ({ isOpen, user, clients, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client', client_id: '', active: true });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      setForm({ 
        name: user.name || '', 
        email: user.email || '', 
        password: '', // Don't show password
        role: user.role || 'client',
        client_id: user.client_id || '',
        active: user.active !== false
      });
    } else {
      setForm({ name: '', email: '', password: '', role: 'client', client_id: '', active: true });
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!form.name || !form.email || (!user && !form.password)) {
      addToast('warning', 'Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (user?.id) {
        await api.put(`/auth/users/${user.id}`, form);
      } else {
        await api.post('/auth/register', form);
      }
      addToast('success', 'Sucesso', `Usuário ${user?.id ? 'atualizado' : 'cadastrado'}!`);
      onSave();
      onClose();
    } catch (err) {
      addToast('error', 'Erro', err.response?.data?.error || 'Falha ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: 0 }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{user?.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
        </div>
        <div style={{ padding: '28px' }}>
          <div className="input-group">
            <label>Nome Completo *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João Silva" />
          </div>
          <div className="input-group">
            <label>E-mail (Login) *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@empresa.com" />
          </div>
          {!user && (
            <div className="input-group">
              <label>Senha Provisória *</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
          )}
          <div className="input-group">
            <label>Cargo / Nível de Acesso</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="client">Cliente (Acesso ao Player/Sua Empresa)</option>
              <option value="estagiario">Estagiário (Gestor de Conteúdo)</option>
              <option value="admin">Administrador (Gestão Total)</option>
            </select>
          </div>
          
          {form.role !== 'admin' && (
            <div className="input-group">
              <label>Vincular a uma Empresa (Cliente)</label>
              <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}>
                <option value="">— Selecione uma Empresa —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                {form.role === 'client' 
                  ? 'Este usuário será direcionado para o Player da empresa vinculada.' 
                  : 'Este usuário poderá gerenciar apenas o conteúdo da empresa selecionada.'}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <input type="checkbox" id="user-active" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
            <label htmlFor="user-active" style={{ cursor: 'pointer', marginBottom: 0 }}>Usuário Ativo</label>
          </div>
        </div>
        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : (user?.id ? 'Salvar' : 'Cadastrar')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [uRes, cRes] = await Promise.all([api.get('/auth/users'), api.get('/clients')]);
      setUsers(uRes.data);
      setClients(cRes.data);
    } catch {
      addToast('error', 'Erro', 'Falha ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    try {
      await api.delete(`/auth/users/${deleteModal.user.id}`);
      addToast('success', 'Sucesso', 'Usuário removido!');
      setUsers(prev => prev.filter(u => u.id !== deleteModal.user.id));
    } catch {
      addToast('error', 'Erro', 'Falha ao remover usuário.');
    } finally {
      setDeleteModal({ open: false, user: null });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Usuários</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os acessos ao sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setModalOpen(true); }}>
          + Novo Usuário
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-input)', textAlign: 'left' }}>
              <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600' }}>Nome</th>
              <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600' }}>Cargo</th>
              <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600' }}>Empresa Vinculada</th>
              <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Carregando...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: '600' }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'estagiario' ? 'badge-secondary' : 'badge-outline'}`} style={{ textTransform: 'capitalize' }}>
                    {u.role === 'admin' ? '👑 Admin' : u.role === 'estagiario' ? '📝 Estagiário' : '👤 Cliente'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', color: u.client_name ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                  {u.client_name || '—'}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', 
                    backgroundColor: u.active ? 'var(--success)' : 'var(--error)', marginRight: '8px' 
                  }} />
                  {u.active ? 'Ativo' : 'Inativo'}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      onClick={() => { setEditingUser(u); setModalOpen(true); }}>✏️</button>
                    <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
                      onClick={() => setDeleteModal({ open: true, user: u })}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal
        isOpen={modalOpen}
        user={editingUser}
        clients={clients}
        onClose={() => setModalOpen(false)}
        onSave={fetchData}
      />

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Usuário?"
        message={`Tem certeza que deseja remover ${deleteModal.user?.name}?`}
        onClose={() => setDeleteModal({ open: false, user: null })}
        onConfirm={handleDelete}
        type="danger"
      />
    </div>
  );
};

export default Users;
