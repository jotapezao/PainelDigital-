import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, group: null });
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    default_plan: 'basic',
    default_theme_color: '#6366f1',
    default_storage_quota_gb: 10,
    active: true
  });

  const { addToast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/client-groups');
      setGroups(res.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar os grupos.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setForm({ ...group });
    } else {
      setEditingGroup(null);
      setForm({
        name: '',
        description: '',
        default_plan: 'basic',
        default_theme_color: '#6366f1',
        default_storage_quota_gb: 10,
        active: true
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.put(`/client-groups/${editingGroup.id}`, form);
        addToast('success', 'Sucesso', 'Grupo atualizado com sucesso!');
      } else {
        await api.post('/client-groups', form);
        addToast('success', 'Sucesso', 'Grupo criado com sucesso!');
      }
      setModalOpen(false);
      fetchGroups();
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar grupo.');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/client-groups/${deleteModal.group.id}`);
      addToast('success', 'Sucesso', 'Grupo removido!');
      fetchGroups();
    } catch {
      addToast('error', 'Erro', 'Falha ao remover grupo.');
    } finally {
      setDeleteModal({ open: false, group: null });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>🏢 Grupos de Empresas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie herança de configurações e planos em lote.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ Novo Grupo</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>Carregando grupos...</div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏢</div>
          <h3>Nenhum grupo criado</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Crie grupos para organizar suas empresas e aplicar configurações globais.</p>
          <button className="btn btn-outline" onClick={() => handleOpenModal()}>Criar Primeiro Grupo</button>
        </div>
      ) : (
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {groups.map(group => (
            <div key={group.id} className="card" style={{ borderLeft: `5px solid ${group.default_theme_color || 'var(--primary)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontWeight: '700', fontSize: '1.1rem' }}>{group.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '4px' }}>{group.description || 'Sem descrição'}</p>
                </div>
                <span className={`badge ${group.active ? 'badge-success' : 'badge-danger'}`}>
                  {group.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Empresas Vinculadas:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{group.client_count || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Plano Padrão:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>{group.default_plan}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cota de Storage:</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{group.default_storage_quota_gb} GB</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline" style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }} onClick={() => handleOpenModal(group)}>✏️ Editar</button>
                <button className="btn btn-outline" style={{ padding: '8px', color: 'var(--error)' }} onClick={() => setDeleteModal({ open: true, group })}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.25rem', marginBottom: '24px' }}>
              {editingGroup ? '✏️ Editar Grupo' : '🏢 Novo Grupo de Empresas'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Nome do Grupo</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Lojas Rede X" />
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição do grupo..." rows={2} />
              </div>
              <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>Plano Padrão</label>
                  <select value={form.default_plan} onChange={e => setForm({ ...form, default_plan: e.target.value })}>
                    <option value="basic">Basic (Gratuito)</option>
                    <option value="pro">Pro (Profissional)</option>
                    <option value="enterprise">Enterprise (Ilimitado)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Cota Storage (GB)</label>
                  <input type="number" value={form.default_storage_quota_gb} onChange={e => setForm({ ...form, default_storage_quota_gb: e.target.value })} />
                </div>
              </div>
              <div className="input-group">
                <label>Cor Identidade Visual</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="color" value={form.default_theme_color} onChange={e => setForm({ ...form, default_theme_color: e.target.value })} style={{ width: '60px', height: '44px', padding: '4px' }} />
                  <input value={form.default_theme_color} onChange={e => setForm({ ...form, default_theme_color: e.target.value })} style={{ flex: 1 }} />
                </div>
              </div>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} style={{ width: '18px', height: '18px' }} /> Grupo Ativo
                </label>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingGroup ? 'Salvar Alterações' : 'Criar Grupo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Grupo?"
        message={`Tem certeza que deseja remover o grupo "${deleteModal.group?.name}"? Isso não removerá as empresas, mas elas perderão a herança de configurações.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, group: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Groups;
