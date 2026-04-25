import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const ClientModal = ({ isOpen, client, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (client) {
      setForm({ name: client.name || '', email: client.email || '', password: '', company: client.company || '', phone: client.phone || '' });
    } else {
      setForm({ name: '', email: '', password: '', company: '', phone: '' });
    }
  }, [client, isOpen]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast('warning', 'Atenção', 'Nome e e-mail são obrigatórios.');
      return;
    }
    if (!client?.id && !form.password.trim()) {
      addToast('warning', 'Atenção', 'A senha é obrigatória para novos clientes.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (client?.id) {
        await api.put(`/clients/${client.id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      addToast('success', 'Sucesso', `Cliente ${client?.id ? 'atualizado' : 'criado'}!`);
      onSave();
      onClose();
    } catch (err) {
      addToast('error', 'Erro', err.response?.data?.message || 'Falha ao salvar cliente.');
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
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: 0 }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{client?.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nome Completo *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="João Silva" />
            </div>
            <div className="input-group">
              <label>E-mail *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@empresa.com" />
            </div>
            <div className="input-group">
              <label>{client?.id ? 'Nova Senha (opcional)' : 'Senha *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={client?.id ? 'Deixe em branco para manter' : '••••••••'} />
            </div>
            <div className="input-group">
              <label>Empresa</label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="input-group">
              <label>Telefone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-0000" />
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : (client?.id ? 'Salvar' : 'Criar Cliente')}
          </button>
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
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
        <button className="btn btn-primary" onClick={() => { setEditingClient(null); setModalOpen(true); }}>
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
          {!search && <button className="btn btn-outline" onClick={() => { setEditingClient(null); setModalOpen(true); }}>Criar Primeiro Cliente</button>}
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
                        onClick={() => { setEditingClient(client); setModalOpen(true); }}>Editar</button>
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

      <ClientModal
        isOpen={modalOpen}
        client={editingClient}
        onClose={() => setModalOpen(false)}
        onSave={fetchClients}
      />
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
