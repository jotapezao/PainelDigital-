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
        password: '', 
        role: user.role || 'client',
        client_id: user.client_id || '',
        active: user.active !== false
      });
    } else {
      setForm({ name: '', email: '', password: '', role: 'client', client_id: '', active: true });
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('warning', 'Atenção', 'O campo Nome Completo é obrigatório.');
      return;
    }
    if (!form.email.trim()) {
      addToast('warning', 'Atenção', 'O campo E-mail é obrigatório.');
      return;
    }
    if (!user && !form.password.trim()) {
      addToast('warning', 'Atenção', 'A Senha Provisória é obrigatória.');
      return;
    }
    if (form.role !== 'admin' && !form.client_id) {
      addToast('warning', 'Atenção', 'Vincule este usuário a uma Empresa.');
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
      backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="card animate-fade-in" style={{ 
        width: '100%', maxWidth: '500px', padding: 0, 
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{user?.id ? '✏️ Editar Usuário' : '👤 Novo Usuário'}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Preencha as informações de acesso.</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          <div className="input-group">
            <label style={{ color: 'var(--text-main)', fontWeight: '600' }}>Nome Completo *</label>
            <input 
              value={form.name} 
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
              placeholder="Ex: João Paulo Fernandes" 
              style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}
            />
          </div>

          <div className="input-group">
            <label style={{ color: 'var(--text-main)', fontWeight: '600' }}>E-mail (Login) *</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
              placeholder="joao@empresa.com" 
              style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}
            />
          </div>

          {!user && (
            <div className="input-group">
              <label style={{ color: 'var(--text-main)', fontWeight: '600' }}>Senha Provisória *</label>
              <input 
                type="password" 
                value={form.password} 
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} 
                placeholder="••••••••" 
                style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div className="input-group">
              <label style={{ color: 'var(--text-main)', fontWeight: '600' }}>Nível de Acesso</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                <option value="client">👤 Cliente (Acesso ao Player)</option>
                <option value="estagiario">📝 Estagiário (Gestor)</option>
                <option value="admin">👑 Administrador (Total)</option>
              </select>
            </div>
            
            {form.role !== 'admin' && (
              <div className="input-group animate-fade-in">
                <label style={{ color: 'var(--text-main)', fontWeight: '600' }}>Vincular a uma Empresa *</label>
                <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  <option value="">— Selecione uma Empresa —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', 
            padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: 'var(--radius-md)', marginTop: '10px', border: '1px solid var(--border)'
          }}>
            <input 
              type="checkbox" id="user-active" checked={form.active} 
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} 
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="user-active" style={{ cursor: 'pointer', marginBottom: 0, fontWeight: '600' }}>Usuário Ativo</label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 30px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
          <button className="btn btn-outline" onClick={onClose} style={{ minWidth: '100px' }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: '140px' }}>
            {saving ? 'Salvando...' : (user?.id ? 'Salvar' : 'Cadastrar Usuário')}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Usuários</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os acessos ao sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setModalOpen(true); }}>
          + Novo Usuário
        </button>
      </div>

      <div className="table-container card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
