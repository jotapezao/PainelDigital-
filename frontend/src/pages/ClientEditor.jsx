import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const ClientEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'basic',
    active: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id && id !== 'new') {
          const res = await api.get(`/clients/${id}`);
          setForm(res.data);
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
      addToast('warning', 'Atenção', 'Nome e E-mail são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await api.put(`/clients/${id}`, form);
      } else {
        await api.post('/clients', form);
      }
      addToast('success', 'Sucesso', 'Cliente salvo com sucesso!');
      navigate('/clients');
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando editor...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Link to="/clients" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            ← Voltar para Clientes
          </Link>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800' }}>{id === 'new' ? '🏢 Novo Cliente' : '✏️ Editar Cliente'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/clients')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '40px' }}>
        <div className="input-group">
          <label>Nome da Empresa / Cliente *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Academia Fit Life" />
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>E-mail de Contato *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
          </div>
          <div className="input-group">
            <label>Telefone / WhatsApp</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
          </div>
        </div>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="input-group">
            <label>Plano de Assinatura</label>
            <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>
              <option value="basic">Básico</option>
              <option value="pro">Profissional (Pro)</option>
              <option value="enterprise">Corporativo (Enterprise)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Status da Conta</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} style={{ width: '20px', height: '20px' }} />
              <span>Cliente Ativo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientEditor;
