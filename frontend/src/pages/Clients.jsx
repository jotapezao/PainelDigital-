import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

// Removed ClientModal

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const getAvatarColor = (id) => {
    const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];
    return colors[id % colors.length];
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Clientes</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os acessos de clientes ao painel.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
          + Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '28px', maxWidth: '400px' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou empresa..."
          style={{ paddingLeft: '42px' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando clientes...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: search ? 'solid' : 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>{search ? '🔎' : '👥'}</div>
          <h3 style={{ marginBottom: '8px' }}>{search ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado'}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {search ? 'Tente outros termos de busca.' : 'Crie o primeiro acesso de cliente ao painel.'}
          </p>
          {!search && <button className="btn btn-outline" onClick={() => navigate('/clients/new')}>Criar Primeiro Cliente</button>}
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'Empresa', 'Dispositivos', 'Criado em', 'Ações'].map(col => (
                  <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr key={client.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        backgroundColor: getAvatarColor(client.id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', fontWeight: '700', color: 'white', flexShrink: 0
                      }}>{getInitials(client.name)}</div>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{client.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{client.company || '—'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className="badge badge-primary">{client.device_count || 0} TVs</span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
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
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Cliente?"
        message={`Tem certeza que deseja remover o cliente "${deleteModal.client?.name}"? Todos os dispositivos associados serão desvinculados.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, client: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Clients;
