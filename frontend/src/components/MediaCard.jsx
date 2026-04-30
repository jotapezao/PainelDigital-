const MediaCard = ({ media, onDelete, onRename }) => {
  const isVideo = media.type === 'video';

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: '160px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isVideo ? (
          <video 
            src={media.url} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
          />
        ) : (
          <img 
            src={media.url} 
            alt={media.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px'
        }}>
          <span className={`badge ${isVideo ? 'badge-primary' : 'badge-success'}`}>
            {isVideo ? 'Vídeo' : 'Imagem'}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <h4 style={{ 
          fontSize: '0.9375rem', 
          fontWeight: '600', 
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {media.name}
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
          {new Date(media.created_at || media.createdAt).toLocaleDateString()} • {(media.size_bytes / (1024 * 1024)).toFixed(2)} MB
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-outline" 
            style={{ flex: 1, padding: '8px', fontSize: '0.8125rem' }}
            onClick={() => window.open(media.url, '_blank')}
          >
            Ver
          </button>
          <button 
            className="btn btn-outline" 
            style={{ padding: '8px', fontSize: '0.8125rem' }}
            onClick={() => onRename(media)}
            title="Renomear"
          >
            ✏️
          </button>
          <button 
            className="btn" 
            style={{ 
              padding: '8px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--error)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
            onClick={() => onDelete(media)}
            title="Excluir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
