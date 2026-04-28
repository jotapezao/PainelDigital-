import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, client: null });
  const { addToast } = useToast();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/clients/${deleteModal.client.id}`);
      addToast('success', 'Sucesso', 'Cliente removido!');
      setClients(prev => prev.filter(c => c.id !== deleteModal.client.id));
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover o cliente.');
    } finally {
      setDeleteModal({ open: false, client: null });
    }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.phone?.includes(q);
    const matchPlan = !filterPlan || c.plan === filterPlan;
    const matchStatus = filterStatus === '' || (filterStatus === 'active' ? c.active : !c.active);
    return matchSearch && matchPlan && matchStatus;
  });

  const getInitials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const AVATAR_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6'];
  const getAvatarColor = (id) => AVATAR_COLORS[parseInt(id?.slice(-2) || 0, 16) % AVATAR_COLORS.length];

  const PLAN_LABELS = { basic: 'Básico', pro: 'Pro', enterprise: 'Enterprise' };
  const PLAN_COLORS = { basic: 'var(--text-dim)', pro: 'var(--primary)', enterprise: 'var(--accent)' };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '4px' }}>Clientes</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {clients.length} empresa{clients.length !== 1 ? 's' : ''} cadastrada{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
          + Nova Empresa
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '420px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou empresa..."
            style={{ paddingLeft: '40px' }}
          />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
          <option value="">Todos os Planos</option>
          <option value="basic">Básico</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto', minWidth: '130px' }}>
          <option value="">Qualquer Status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        {(search || filterPlan || filterStatus) && (
          <button className="btn btn-outline" style={{ padding: '10px 16px', fontSize: '0.875rem' }}
            onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatus(''); }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {!loading && clients.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: clients.length, color: 'var(--primary)', icon: '🏢' },
            { label: 'Ativos', value: clients.filter(c => c.active).length, color: 'var(--success)', icon: '✅' },
            { label: 'Dispositivos', value: clients.reduce((a, c) => a + parseInt(c.device_count || 0), 0), color: 'var(--warning)', icon: '📺' },
            { label: 'Usuários', value: clients.reduce((a, c) => a + parseInt(c.user_count || 0), 0), color: 'var(--accent)', icon: '👤' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: s.color, fontFamily: 'Outfit' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: search ? 'solid' : 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>{search ? '🔎' : '🏢'}</div>
          <h3 style={{ marginBottom: '8px' }}>{search ? 'Nenhum resultado' : 'Nenhuma empresa cadastrada'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {search ? 'Tente outros termos de busca.' : 'Crie o primeiro acesso de cliente ao painel.'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>Criar Primeira Empresa</button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                  {['Empresa / Cliente', 'Plano', 'Dispositivos', 'Usuários', 'Status', 'Ações'].map(col => (
                    <th key={col} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr key={client.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.04)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    {/* Name / Email / Company */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                          background: `linear-gradient(135deg, ${getAvatarColor(client.id)}, ${getAvatarColor(client.id)}aa)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.875rem', fontWeight: '700', color: 'white'
                        }}>{getInitials(client.name)}</div>
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '0.9375rem', marginBottom: '2px' }}>{client.name}</p>
                          {client.company && (
                            <p style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: '500', marginBottom: '2px' }}>{client.company}</p>
                          )}
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{client.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Plan */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px',
                        borderRadius: '20px', background: `${PLAN_COLORS[client.plan] || PLAN_COLORS.basic}1a`,
                        color: PLAN_COLORS[client.plan] || PLAN_COLORS.basic
                      }}>
                        {PLAN_LABELS[client.plan] || client.plan}
                      </span>
                    </td>
                    {/* Devices */}
                    <td style={{ padding: '14px 20px' }}>
                      <span className="badge badge-primary" style={{ gap: '4px' }}>
                        📺 {client.device_count || 0}
                      </span>
                    </td>
                    {/* Users */}
                    <td style={{ padding: '14px 20px' }}>
                      <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent)' }}>
                        👤 {client.user_count || 0}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.8rem', fontWeight: '600',
                        color: client.active ? 'var(--success)' : 'var(--text-dim)'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: client.active ? 'var(--success)' : 'var(--text-dim)', display: 'inline-block' }} />
                        {client.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
                          onClick={() => navigate(`/clients/${client.id}`)}>Editar</button>
                        <button className="btn" style={{ padding: '6px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.8125rem' }}
                          onClick={() => setDeleteModal({ open: true, client })}>Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Exibindo {filtered.length} de {clients.length} empresa{clients.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Empresa?"
        message={`Tem certeza que deseja remover "${deleteModal.client?.name}"? Todos os dispositivos e usuários associados serão excluídos.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, client: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Clients;
