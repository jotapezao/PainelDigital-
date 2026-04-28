import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const ROLE_CONFIG = {
  admin:      { label: '👑 Admin',  color: 'var(--primary)',   badge: 'badge-primary'   },
  estagiario: { label: '📝 Gestor', color: 'var(--secondary)', badge: 'badge-secondary' },
  client:     { label: '👤 Cliente',color: 'var(--text-dim)',  badge: 'badge-outline'   },
};

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.client_name?.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchClient = !filterClient || u.client_id === filterClient;
    const matchStatus = filterStatus === '' || (filterStatus === 'active' ? u.active : !u.active);
    return matchSearch && matchRole && matchClient && matchStatus;
  });

  const getInitials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const AVATAR_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];
  const getAvatarColor = (id) => AVATAR_COLORS[parseInt(id?.slice(-2) || 0, 16) % AVATAR_COLORS.length];

  const clearFilters = () => { setSearch(''); setFilterRole(''); setFilterClient(''); setFilterStatus(''); };
  const hasFilters = search || filterRole || filterClient || filterStatus;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '4px' }}>Usuários</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/users/new')}>
          + Novo Usuário
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 230px', maxWidth: '360px' }}>
          <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail..." style={{ paddingLeft: '38px' }} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">Todas as Funções</option>
          <option value="admin">👑 Admin</option>
          <option value="estagiario">📝 Gestor</option>
          <option value="client">👤 Cliente</option>
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
          <option value="">Todas as Empresas</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: '130px' }}>
          <option value="">Qualquer Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        {hasFilters && (
          <button className="btn btn-outline" style={{ padding: '10px 14px', fontSize: '0.875rem' }} onClick={clearFilters}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Role Summary */}
      {!loading && users.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
            const count = users.filter(u => u.role === role).length;
            return (
              <button key={role}
                style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', border: `1px solid ${filterRole === role ? cfg.color : 'var(--border)'}`, background: filterRole === role ? `${cfg.color}12` : 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                onClick={() => setFilterRole(filterRole === role ? '' : role)}>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: cfg.color }}>{count}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>{cfg.label}</div>
              </button>
            );
          })}
          <button
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', border: `1px solid ${!filterRole ? 'var(--primary)' : 'var(--border)'}`, background: !filterRole ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
            onClick={() => setFilterRole('')}>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>{users.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>Todos</div>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                {['Usuário', 'Função', 'Empresa Vinculada', 'Status', 'Criado em', 'Ações'].map(col => (
                  <th key={col} style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔎</div>
                  <p>Nenhum usuário encontrado.</p>
                  {hasFilters && <button className="btn btn-outline" style={{ marginTop: '12px', fontSize: '0.875rem' }} onClick={clearFilters}>Limpar filtros</button>}
                </td></tr>
              ) : filtered.map((u, i) => {
                const roleInfo = ROLE_CONFIG[u.role] || ROLE_CONFIG.client;
                return (
                  <tr key={u.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.04)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }}
                            onError={e => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg, ${getAvatarColor(u.id)}, ${getAvatarColor(u.id)}99)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: '700', color: 'white'
                          }}>{getInitials(u.name)}</div>
                        )}
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{u.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span className={`badge ${roleInfo.badge}`}>{roleInfo.label}</span>
                    </td>
                    <td style={{ padding: '13px 20px', color: u.client_name ? 'var(--text-muted)' : 'var(--text-dim)', fontSize: '0.875rem' }}>
                      {u.client_name || '—'}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: u.active ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: u.active ? 'var(--success)' : 'var(--text-dim)', display: 'inline-block', flexShrink: 0 }} />
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', color: 'var(--text-dim)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => navigate(`/users/${u.id}`)}>Editar</button>
                        <button className="btn" style={{ padding: '6px 10px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.8rem' }}
                          onClick={() => setDeleteModal({ open: true, user: u })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Exibindo {filtered.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Usuário?"
        message={`Tem certeza que deseja remover "${deleteModal.user?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, user: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Users;
