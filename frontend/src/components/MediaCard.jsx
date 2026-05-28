import { useState } from 'react';

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const MediaCard = ({ media, onDelete, onRename }) => {
  const isVideo = media.type === 'video';
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="card"
      style={{
        padding: '0',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.25)' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div style={{
        height: '168px',
        backgroundColor: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isVideo ? (
          <video
            src={`${media.url}#t=2`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            preload="metadata"
            muted
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : imgError ? (
          <div style={{ fontSize: '3.5rem', opacity: 0.25 }}>🖼️</div>
        ) : (
          <img
            src={media.url}
            alt={media.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        )}

        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '10px',
          gap: '6px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s',
        }}>
          <button
            onClick={() => window.open(media.url, '_blank')}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', borderRadius: '8px',
              padding: '6px 10px', cursor: 'pointer',
              fontSize: '0.75rem', backdropFilter: 'blur(8px)',
            }}
            title="Abrir original"
          >👁️ Ver</button>
          <button
            onClick={() => onRename(media)}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', borderRadius: '8px',
              padding: '6px 10px', cursor: 'pointer',
              fontSize: '0.75rem', backdropFilter: 'blur(8px)',
            }}
            title="Renomear"
          >✏️</button>
          <button
            onClick={() => onDelete(media)}
            style={{
              background: 'rgba(239,68,68,0.3)',
              border: '1px solid rgba(239,68,68,0.5)',
              color: '#fca5a5', borderRadius: '8px',
              padding: '6px 10px', cursor: 'pointer',
              fontSize: '0.75rem', backdropFilter: 'blur(8px)',
            }}
            title="Excluir"
          >🗑️</button>
        </div>

        {/* Badge tipo */}
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <span
            className={`badge ${isVideo ? 'badge-primary' : 'badge-success'}`}
            style={{ fontSize: '0.65rem', backdropFilter: 'blur(6px)' }}
          >
            {isVideo ? '🎬 Vídeo' : '🖼️ Imagem'}
          </span>
        </div>

        {/* Ícone de play central para vídeos */}
        {isVideo && !hovered && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: '44px', height: '44px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem',
              border: '2px solid rgba(255,255,255,0.35)',
            }}>▶</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px' }}>
        <h4 style={{
          fontSize: '0.9rem', fontWeight: '700', marginBottom: '4px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: 'var(--text-main)',
        }}>
          {media.name}
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {new Date(media.created_at || media.createdAt).toLocaleDateString('pt-BR')}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '600' }}>
            {formatSize(media.size_bytes)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
