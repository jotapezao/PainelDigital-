import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import MediaCard from '../components/MediaCard';
import ConfirmModal from '../components/ConfirmModal';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const StorageBar = ({ used, quota }) => {
  const percent = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;
  const color = percent >= 95 ? '#ef4444' : percent >= 80 ? '#f59e0b' : percent >= 60 ? '#f97316' : '#22c55e';

  return (
    <div style={{ background: 'var(--bg-input)', borderRadius: '16px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: '700', fontSize: '0.9375rem' }}>💾 Armazenamento</span>
          {percent >= 80 && (
            <span style={{ marginLeft: '10px', fontSize: '0.75rem', color, fontWeight: '700', background: `${color}20`, padding: '2px 8px', borderRadius: '12px' }}>
              {percent >= 95 ? '🔴 Limite quase atingido!' : '⚠ Atenção: espaço reduzido'}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '600' }}>
          {formatBytes(used)} / {formatBytes(quota)}
        </span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          borderRadius: '99px',
          background: color,
          transition: 'width 0.6s ease',
          boxShadow: `0 0 8px ${color}60`
        }} />
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        {formatBytes(quota - used)} livres ({(100 - percent).toFixed(1)}%)
      </div>
    </div>
  );
};

const Medias = () => {
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, media: null });
  const [editModal, setEditModal] = useState({ open: false, media: null, newName: '' });
  const [preUpload, setPreUpload] = useState(null); // { files, names, sizes }
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 10 * 1024 * 1024 * 1024 });
  const [filterType, setFilterType] = useState('all');

  const fileInputRef = useRef();
  const { addToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchMedias();
    fetchStorage();
  }, [user]);

  const fetchStorage = async () => {
    try {
      // If admin, we should probably fetch the client-specific storage or total storage.
      // For now, let's fetch the client storage for the current context.
      const endpoint = user?.role === 'admin' ? '/clients' : `/clients/${user.client_id}`;
      const res = await api.get(endpoint);
      
      // If admin, it returns an array. We'll sum all or show the first one depending on context.
      // But user complained about "não soma as mídias existente", so let's make sure we sum all medias for the current client.
      let data = res.data;
      if (Array.isArray(data)) {
        // If Admin and multiple clients, we'll sum up for a "Global" view, or just take the first if it's the only one.
        // If Admin is managing a specific client, they should see that client's quota.
        // For simplicity, if Admin sees multiple, let's sum them.
        if (user?.role === 'admin') {
          const totalUsed = data.reduce((acc, c) => acc + parseInt(c.storage_used || 0), 0);
          const totalQuota = data.reduce((acc, c) => acc + parseInt(c.storage_quota_bytes || 0), 0);
          setStorageInfo({ used: totalUsed, quota: totalQuota || 10 * 1024 * 1024 * 1024 });
        } else {
          const clientData = data[0];
          setStorageInfo({
            used: parseInt(clientData?.storage_used || 0),
            quota: parseInt(clientData?.storage_quota_bytes || 10 * 1024 * 1024 * 1024)
          });
        }
      } else {
        setStorageInfo({
          used: parseInt(data?.storage_used || 0),
          quota: parseInt(data?.storage_quota_bytes || 10 * 1024 * 1024 * 1024)
        });
      }
    } catch (e) {
      console.error('Error fetching storage:', e);
    }
  };

  const fetchMedias = async () => {
    try {
      const response = await api.get('/medias');
      setMedias(response.data);
    } catch {
      addToast('error', 'Erro', 'Não foi possível carregar as mídias.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const remaining = storageInfo.quota - storageInfo.used;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);

    if (totalSize > remaining) {
      addToast('error', 'Sem espaço', `Estes arquivos ocupam ${formatBytes(totalSize)}, mas você só tem ${formatBytes(remaining)} disponível.`);
      e.target.value = null;
      return;
    }

    setPreUpload({
      files,
      names: files.map(f => f.name.replace(/\.[^/.]+$/, '')),
      sizes: files.map(f => f.size),
      totalSize,
    });
    e.target.value = null;
  };

  const confirmUpload = async () => {
    if (!preUpload) return;
    setUploading(true);
    setPreUpload(null);
    let successCount = 0;

    for (let i = 0; i < preUpload.files.length; i++) {
      const formData = new FormData();
      formData.append('file', preUpload.files[i]);
      formData.append('name', preUpload.names[i]);
      try {
        await api.post('/medias/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (err) {
        addToast('error', `Erro no upload de "${preUpload.names[i]}"`, err.response?.data?.error || 'Falha ao enviar.');
      }
    }

    if (successCount > 0) addToast('success', 'Sucesso', `${successCount} arquivo(s) enviado(s) com sucesso!`);
    setUploading(false);
    fetchMedias();
    fetchStorage();
  };

  const handleDeleteMedia = async () => {
    const { media } = deleteModal;
    try {
      await api.delete(`/medias/${media.id}`);
      addToast('success', 'Sucesso', 'Mídia removida com sucesso!');
      setMedias(prev => prev.filter(m => m.id !== media.id));
      fetchStorage();
    } catch {
      addToast('error', 'Erro', 'Não foi possível remover a mídia.');
    } finally {
      setDeleteModal({ open: false, media: null });
    }
  };

  const handleRenameMedia = async () => {
    const { media, newName } = editModal;
    if (!newName.trim()) return;
    try {
      await api.put(`/medias/${media.id}`, { name: newName });
      addToast('success', 'Sucesso', 'Mídia renomeada!');
      setMedias(prev => prev.map(m => m.id === media.id ? { ...m, name: newName } : m));
      setEditModal({ open: false, media: null, newName: '' });
    } catch {
      addToast('error', 'Erro', 'Falha ao renomear.');
    }
  };

  const filteredMedias = filterType === 'all' ? medias : medias.filter(m => m.type === filterType);
  const storagePercent = storageInfo.quota > 0 ? Math.min((storageInfo.used / storageInfo.quota) * 100, 100) : 0;
  const storageBlocked = storagePercent >= 100;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Sua Biblioteca <span className="info-icon" title="Arquivos de imagem e vídeo para seus planos de exibição">?</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>{medias.length} arquivo(s) na biblioteca</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.875rem' }}
          >
            <option value="all">Todos os tipos</option>
            <option value="image">🖼 Imagens</option>
            <option value="video">🎬 Vídeos</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={handleUploadClick}
            disabled={uploading || storageBlocked}
            title={storageBlocked ? 'Limite de armazenamento atingido' : ''}
          >
            {uploading ? 'Enviando...' : storageBlocked ? '🚫 Sem espaço' : '+ Upload de Mídia'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Storage Bar */}
      <div style={{ marginBottom: '28px' }}>
        <StorageBar used={storageInfo.used} quota={storageInfo.quota} />
      </div>

      {/* Edit Modal */}
      {editModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '16px' }}>✏️ Renomear Mídia</h3>
            <div className="input-group">
              <label>Novo Nome</label>
              <input value={editModal.newName} onChange={e => setEditModal(p => ({ ...p, newName: e.target.value }))} autoFocus onKeyDown={e => e.key === 'Enter' && handleRenameMedia()} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditModal({ open: false, media: null, newName: '' })}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRenameMedia}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-upload modal ... (same as before) */}
      {preUpload && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '8px' }}>📤 Confirmar Upload</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>
              Total: <strong>{formatBytes(preUpload.totalSize)}</strong> · Você pode editar os nomes antes de enviar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px' }}>
              {preUpload.files.map((file, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{file.type.startsWith('video') ? '🎬' : '🖼️'}</div>
                  <div style={{ flex: 1 }}>
                    <input
                      value={preUpload.names[i]}
                      onChange={e => {
                        const newNames = [...preUpload.names];
                        newNames[i] = e.target.value;
                        setPreUpload(p => ({ ...p, names: newNames }));
                      }}
                      style={{ width: '100%', marginBottom: '4px' }}
                      placeholder="Nome da mídia"
                    />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{formatBytes(preUpload.sizes[i])}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPreUpload(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmUpload}>Enviar {preUpload.files.length} arquivo(s)</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando biblioteca...</div>
      ) : filteredMedias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhuma mídia encontrada</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Comece enviando seus primeiros arquivos de imagem ou vídeo.</p>
          <button className="btn btn-outline" onClick={handleUploadClick} disabled={storageBlocked}>Fazer meu primeiro upload</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {filteredMedias.map(media => (
            <MediaCard
              key={media.id}
              media={media}
              onRename={(m) => setEditModal({ open: true, media: m, newName: m.name })}
              onDelete={(m) => setDeleteModal({ open: true, media: m })}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Remover Mídia?"
        message={`Tem certeza que deseja remover "${deleteModal.media?.name}"? Esta ação não pode ser desfeita e removerá a mídia de todas as playlists.`}
        confirmText="Remover"
        type="danger"
        onClose={() => setDeleteModal({ open: false, media: null })}
        onConfirm={handleDeleteMedia}
      />
    </div>
  );
};

export default Medias;
