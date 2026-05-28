import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import MediaCard from '../components/MediaCard';
import ConfirmModal from '../components/ConfirmModal';

const CORES_PASTA = [
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Ciano', hex: '#0ea5e9' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Rosa Coral', hex: '#f43f5e' },
  { name: 'Âmbar', hex: '#f59e0b' },
  { name: 'Cinza', hex: '#64748b' }
];

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
          <span style={{ fontWeight: '700', fontSize: '0.9375rem' }}>💾 Armazenamento Global</span>
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
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { currentFile, fileIndex, totalFiles, percentage, loaded, total }

  const [deleteModal, setDeleteModal] = useState({ open: false, media: null });
  const [editModal, setEditModal] = useState({ open: false, media: null, newName: '' });
  
  const [folderModal, setFolderModal] = useState({ open: false, mode: 'create', folder: null, name: '', color: '#6366f1' });
  const [deleteFolderModal, setDeleteFolderModal] = useState({ open: false, folder: null });
  const [moveModal, setMoveModal] = useState({ open: false, media: null, targetFolderId: '' });

  const [preUpload, setPreUpload] = useState(null); // { files, names, sizes }
  const [storageInfo, setStorageInfo] = useState({ used: 0, quota: 10 * 1024 * 1024 * 1024 });
  const [filterType, setFilterType] = useState('all');

  const fileInputRef = useRef();
  const { addToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchMedias(currentFolder?.id);
    if (!currentFolder) {
      fetchFolders();
    }
    fetchStorage();
  }, [user, currentFolder]);

  useEffect(() => {
    // Busca do armazenamento global total do cliente
    if (user?.client_id) {
      api.get('/medias').then(response => {
        const list = response.data || [];
        const usedBytes = list.reduce((acc, m) => acc + (parseInt(m.size_bytes || 0) || 0), 0);
        setStorageInfo(prev => ({ ...prev, used: usedBytes }));
      }).catch(err => console.error('Error calculating global storage:', err));
    }
  }, [medias, user]);

  const fetchStorage = async () => {
    try {
      if (!user?.client_id) return;
      const res = await api.get(`/clients/${user.client_id}`);
      const data = res.data || {};
      setStorageInfo(prev => ({
        ...prev,
        quota: parseInt(data?.storage_quota_bytes || 10 * 1024 * 1024 * 1024),
      }));
    } catch (e) {
      console.error('Error fetching storage:', e);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await api.get('/medias/folders');
      setFolders(response.data || []);
    } catch (err) {
      console.error('Falha ao carregar pastas', err);
    }
  };

  const fetchMedias = async (folderId = null) => {
    try {
      setLoading(true);
      const url = folderId 
        ? `/medias?folder_id=${folderId}` 
        : `/medias?folder_id=root`;
      const response = await api.get(url);
      setMedias(response.data || []);
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
    let successCount = 0;
    const totalFiles = preUpload.files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = preUpload.files[i];
      const name = preUpload.names[i];

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      if (currentFolder?.id) {
        formData.append('folder_id', currentFolder.id);
      }

      setUploadProgress({
        currentFile: name,
        fileIndex: i + 1,
        totalFiles,
        percentage: 0,
        loaded: 0,
        total: file.size
      });

      try {
        await api.post('/medias/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({
              ...prev,
              percentage,
              loaded: progressEvent.loaded,
              total: progressEvent.total
            }));
          }
        });
        successCount++;
      } catch (err) {
        addToast('error', `Erro no upload de "${name}"`, err.response?.data?.error || 'Falha ao enviar.');
      }
    }

    if (successCount > 0) addToast('success', 'Sucesso', `${successCount} arquivo(s) enviado(s) com sucesso!`);
    setUploading(false);
    setPreUpload(null);
    setUploadProgress(null);
    fetchMedias(currentFolder?.id);
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

  const handleSaveFolder = async () => {
    if (!folderModal.name.trim()) {
      addToast('warning', 'Atenção', 'O nome da pasta é obrigatório.');
      return;
    }

    try {
      if (folderModal.mode === 'create') {
        const res = await api.post('/medias/folders', {
          name: folderModal.name,
          color: folderModal.color
        });
        addToast('success', 'Sucesso', 'Pasta criada com sucesso!');
        setFolders(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const res = await api.put(`/medias/folders/${folderModal.folder.id}`, {
          name: folderModal.name,
          color: folderModal.color
        });
        addToast('success', 'Sucesso', 'Pasta atualizada com sucesso!');
        setFolders(prev => prev.map(f => f.id === folderModal.folder.id ? res.data : f).sort((a, b) => a.name.localeCompare(b.name)));
        if (currentFolder?.id === folderModal.folder.id) {
          setCurrentFolder(res.data);
        }
      }
      setFolderModal({ open: false, mode: 'create', folder: null, name: '', color: '#6366f1' });
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao salvar a pasta.');
    }
  };

  const handleDeleteFolder = async () => {
    const { folder } = deleteFolderModal;
    if (!folder) return;
    try {
      await api.delete(`/medias/folders/${folder.id}`);
      addToast('success', 'Sucesso', 'Pasta e todas as suas mídias removidas com sucesso!');
      setFolders(prev => prev.filter(f => f.id !== folder.id));
      if (currentFolder?.id === folder.id) {
        setCurrentFolder(null);
      } else {
        fetchMedias(currentFolder?.id);
        fetchStorage();
      }
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao excluir a pasta.');
    } finally {
      setDeleteFolderModal({ open: false, folder: null });
    }
  };

  const handleMoveMedia = async () => {
    const { media, targetFolderId } = moveModal;
    if (!media) return;
    try {
      await api.put(`/medias/${media.id}`, {
        folder_id: targetFolderId || 'null'
      });
      addToast('success', 'Sucesso', 'Mídia movida com sucesso!');
      setMedias(prev => prev.filter(m => m.id !== media.id));
      fetchStorage();
    } catch (err) {
      addToast('error', 'Erro', 'Falha ao mover a mídia.');
    } finally {
      setMoveModal({ open: false, media: null, targetFolderId: '' });
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Sua Biblioteca <span className="info-icon" title="Arquivos de imagem e vídeo organizados para seus painéis">?</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {currentFolder ? `Pasta "${currentFolder.name}" · ` : ''}{medias.length} arquivo(s) exibido(s)
          </p>
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
      <div style={{ marginBottom: '24px' }}>
        <StorageBar used={storageInfo.used} quota={storageInfo.quota} />
      </div>

      {/* Breadcrumbs e Navegação de Pastas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.875rem' }}>
        <span 
          onClick={() => setCurrentFolder(null)} 
          style={{ color: currentFolder ? 'var(--primary)' : 'var(--text-main)', cursor: currentFolder ? 'pointer' : 'default', fontWeight: '700' }}
        >
          📁 Biblioteca Raiz
        </span>
        {currentFolder && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
            <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>
              {currentFolder.name}
            </span>
          </>
        )}
      </div>

      {/* Grid de Pastas (Exibido apenas na raiz) */}
      {!currentFolder && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>📁 Pastas de Organização</h3>
            <button 
              className="btn btn-outline" 
              onClick={() => setFolderModal({ open: true, mode: 'create', folder: null, name: '', color: '#6366f1' })}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              + Nova Pasta
            </button>
          </div>
          {folders.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.875rem' }}>
              Nenhuma pasta criada. Use pastas para estruturar suas campanhas ou temas visuais.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {folders.map(folder => (
                <div 
                  key={folder.id} 
                  className="card"
                  style={{ 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    position: 'relative', 
                    borderLeft: `5px solid ${folder.color || '#6366f1'}`,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onClick={() => setCurrentFolder(folder)}
                >
                  <div style={{ fontSize: '1.8rem', color: folder.color || '#6366f1' }}>📁</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                      {folder.name}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Pasta</span>
                  </div>
                  
                  <div 
                    style={{ display: 'flex', gap: '2px' }} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      onClick={() => setFolderModal({ open: true, mode: 'edit', folder, name: folder.name, color: folder.color || '#6366f1' })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '4px', color: 'var(--text-muted)' }}
                      title="Editar pasta"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => setDeleteFolderModal({ open: true, folder })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '4px', color: '#ef4444' }}
                      title="Excluir pasta"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid de Arquivos (Mídias) */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>
          {currentFolder ? '🖼️ Arquivos na Pasta' : '🖼️ Arquivos na Raiz (Sem pasta)'}
        </h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando mídias...</div>
        ) : filteredMedias.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px', borderStyle: 'dashed' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
            <h3 style={{ marginBottom: '8px' }}>Nenhum arquivo encontrado</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Esta pasta ou seção raiz está vazia no momento.</p>
            <button className="btn btn-outline" onClick={handleUploadClick} disabled={storageBlocked}>Fazer um upload aqui</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filteredMedias.map(media => (
              <MediaCard
                key={media.id}
                media={media}
                onRename={(m) => setEditModal({ open: true, media: m, newName: m.name })}
                onDelete={(m) => setDeleteModal({ open: true, media: m })}
                onMove={(m) => setMoveModal({ open: true, media: m, targetFolderId: m.folder_id || '' })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal (Mídia) */}
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

      {/* Folder Modal (Criar/Editar Pasta) */}
      {folderModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '16px' }}>
              {folderModal.mode === 'create' ? '📁 Nova Pasta' : '📁 Editar Pasta'}
            </h3>
            <div className="input-group" style={{ marginBottom: '18px' }}>
              <label>Nome da Pasta</label>
              <input 
                value={folderModal.name} 
                onChange={e => setFolderModal(p => ({ ...p, name: e.target.value }))} 
                placeholder="Ex: Campanhas de Inverno"
                autoFocus 
                onKeyDown={e => e.key === 'Enter' && handleSaveFolder()} 
              />
            </div>
            <div className="input-group">
              <label>Cor da Pasta</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                {CORES_PASTA.map(c => (
                  <div
                    key={c.hex}
                    onClick={() => setFolderModal(p => ({ ...p, color: c.hex }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      cursor: 'pointer',
                      border: folderModal.color === c.hex ? '3px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                      boxShadow: folderModal.color === c.hex ? '0 0 10px rgba(0,0,0,0.4)' : 'none',
                      transition: 'transform 0.15s ease'
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setFolderModal({ open: false, mode: 'create', folder: null, name: '', color: '#6366f1' })}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveFolder}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal (Mover Mídia) */}
      {moveModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '8px' }}>📁 Mover Mídia</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '0.85rem' }}>
              Selecione a pasta de destino para <strong>{moveModal.media?.name}</strong>:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
              <div 
                onClick={() => setMoveModal(p => ({ ...p, targetFolderId: '' }))}
                style={{
                  padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                  background: moveModal.targetFolderId === '' ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)',
                  border: moveModal.targetFolderId === '' ? '1px solid var(--primary)' : '1px solid transparent',
                  color: moveModal.targetFolderId === '' ? 'var(--text-main)' : 'var(--text-muted)',
                  fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                <span>📁</span>
                <span>Biblioteca Raiz</span>
              </div>
              
              {folders.map(f => (
                <div 
                  key={f.id}
                  onClick={() => setMoveModal(p => ({ ...p, targetFolderId: f.id }))}
                  style={{
                    padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                    background: moveModal.targetFolderId === f.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)',
                    border: moveModal.targetFolderId === f.id ? '1px solid var(--primary)' : '1px solid transparent',
                    color: moveModal.targetFolderId === f.id ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px'
                  }}
                >
                  <span style={{ color: f.color }}>📁</span>
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setMoveModal({ open: false, media: null, targetFolderId: '' })}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleMoveMedia}>Mover</button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-upload Confirmation Modal */}
      {preUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '32px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '8px' }}>📤 Confirmar Upload</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.875rem' }}>
              Total: <strong>{formatBytes(preUpload.totalSize)}</strong> {currentFolder ? `para pasta "${currentFolder.name}"` : 'na Raiz'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', marginBottom: '24px' }}>
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
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmUpload}>Enviar {preUpload.files.length} arquivos</button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Upload Progress Modal (Axios Progress) */}
      {uploadProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📤</div>
            <h3 style={{ fontWeight: '800', fontSize: '1.25rem', marginBottom: '6px', color: 'var(--text-main)' }}>Enviando Mídias...</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.85rem' }}>
              Processando arquivo <strong>{uploadProgress.fileIndex}</strong> de <strong>{uploadProgress.totalFiles}</strong>
            </p>
            
            <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontWeight: '700', fontSize: '0.875rem', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                {uploadProgress.currentFile}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                <span>{formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{uploadProgress.percentage}%</span>
              </div>
              {/* Progress Bar Container */}
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress.percentage}%`,
                  background: 'var(--primary)',
                  borderRadius: '99px',
                  transition: 'width 0.1s ease',
                  boxShadow: '0 0 10px var(--primary)'
                }} />
              </div>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Por favor, mantenha esta página aberta até a finalização de todos os envios.
            </p>
          </div>
        </div>
      )}

      {/* Delete Folder Modal Confirmation */}
      <ConfirmModal
        isOpen={deleteFolderModal.open}
        title="Excluir Pasta e Mídias?"
        message={`Tem certeza que deseja excluir a pasta "${deleteFolderModal.folder?.name}"? Esta ação removerá permanentemente a pasta e DELETARÁ FISICAMENTE todas as mídias dentro dela do armazenamento R2 e de todas as playlists correspondentes. Esta ação não poderá ser desfeita.`}
        confirmText="Excluir tudo"
        type="danger"
        onClose={() => setDeleteFolderModal({ open: false, folder: null })}
        onConfirm={handleDeleteFolder}
      />

      {/* Delete Media Modal Confirmation */}
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
