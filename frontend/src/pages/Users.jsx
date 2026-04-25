import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

// Removed UserModal

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
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
        <button className="btn btn-primary" onClick={() => navigate('/users/new')}>
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
                      onClick={() => navigate(`/users/${u.id}`)}>✏️</button>
                    <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
                      onClick={() => setDeleteModal({ open: true, user: u })}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


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
