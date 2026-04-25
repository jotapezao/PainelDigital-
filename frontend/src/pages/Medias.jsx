import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import MediaCard from '../components/MediaCard';
import ConfirmModal from '../components/ConfirmModal';

const Medias = () => {
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, media: null });
  
  const fileInputRef = useRef();
  const { addToast } = useToast();

  useEffect(() => {
    fetchMedias();
  }, []);

  const fetchMedias = async () => {
    try {
      const response = await api.get('/medias');
      setMedias(response.data);
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível carregar as mídias.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    // Suportando upload de múltiplos arquivos
    files.forEach(file => {
      formData.append('file', file);
    });

    try {
      await api.post('/medias/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addToast('success', 'Sucesso', 'Mídias enviadas com sucesso!');
      fetchMedias();
    } catch (error) {
      addToast('error', 'Erro no Upload', error.response?.data?.message || 'Falha ao enviar arquivos.');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteMedia = async () => {
    const { media } = deleteModal;
    try {
      await api.delete(`/medias/${media.id}`);
      addToast('success', 'Sucesso', 'Mídia removida com sucesso!');
      setMedias(prev => prev.filter(m => m.id !== media.id));
    } catch (error) {
      addToast('error', 'Erro', 'Não foi possível remover a mídia.');
    } finally {
      setDeleteModal({ open: false, media: null });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Sua Biblioteca <span className="info-icon" title="Arquivos de imagem e vídeo que você pode usar em seus planos de exibição">?</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie imagens e vídeos para suas playlists.</p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleUploadClick}
          disabled={uploading}
        >
          {uploading ? 'Enviando...' : '+ Upload de Mídia'}
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Carregando biblioteca...</div>
      ) : medias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
          <h3 style={{ marginBottom: '8px' }}>Nenhuma mídia encontrada</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Comece enviando seus primeiros arquivos de imagem ou vídeo.</p>
          <button className="btn btn-outline" onClick={handleUploadClick}>Fazer meu primeiro upload</button>
        </div>
      ) : (
        <div className="grid-responsive" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '24px' 
        }}>
          {medias.map(media => (
            <MediaCard 
              key={media.id} 
              media={media} 
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
