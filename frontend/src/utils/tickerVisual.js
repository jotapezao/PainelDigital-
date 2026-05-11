const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const hexToRgb = (hex) => {
  if (!hex) return '129, 140, 248';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '129, 140, 248';
};

export const normalizeTickerStyle = (styleName = 'classic') => {
  const styleMap = {
    'ticker-classic': 'classic',
    classic: 'classic',
    modern: 'modern',
    minimal: 'minimal',
    neon: 'neon',
    news_channel: 'news_channel',
    elegant: 'elegant',
  };

  return styleMap[styleName] || 'classic';
};

export const buildTickerText = (text = '') => {
  const clean = (text || '').trim();
  const base = clean || 'Painel Digital • Inovação e Tecnologia • Comunicação visual em tempo real';
  return ` ${base} • ${base} • ${base} `;
};

export const getTickerSpeedDuration = (speed = 'medium') => {
  switch (speed) {
    case 'slow':
      return '50s';
    case 'fast':
      return '18s';
    default:
      return '30s';
  }
};

export const getTickerVisualConfig = ({
  styleName = 'classic',
  themeColor = '#818cf8',
  footerOpacity = 0.85,
  fontColor = '#ffffff',
  isTop = false,
  isMobile = false,
  layout = 'fullscreen',
}) => {
  const variant = normalizeTickerStyle(styleName);
  const alpha = clamp(Number(footerOpacity) || 0, 0.08, 0.98);
  const rgb = hexToRgb(themeColor);
  const gap = isMobile ? '18px' : '28px';
  const radius = variant === 'modern' || layout === 'floating' ? '28px' : '0px';

  const baseContainer = {
    position: 'absolute',
    left: layout === 'floating' ? '5%' : 0,
    width: layout === 'floating' ? '90%' : '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 100,
    backdropFilter: variant === 'minimal' ? 'blur(12px)' : 'blur(18px)',
    borderRadius: radius,
    boxShadow: isTop ? '0 14px 40px rgba(0,0,0,0.28)' : '0 -14px 40px rgba(0,0,0,0.28)',
  };

  const sharedLabel = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    height: '100%',
    flexShrink: 0,
    padding: isMobile ? '0 16px' : '0 24px',
    fontSize: isMobile ? '0.72rem' : '0.92rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '2.4px',
    zIndex: 101,
  };

  const sharedContent = {
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
    gap,
    minWidth: 'max-content',
    width: 'max-content',
    willChange: 'transform',
    zIndex: 100,
  };

  const sharedMessage = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isMobile ? '14px' : '18px',
    paddingRight: isMobile ? '28px' : '40px',
    letterSpacing: '0.2px',
  };

  switch (variant) {
    case 'modern':
      return {
        variant,
        containerStyle: {
          ...baseContainer,
          background: `linear-gradient(135deg, rgba(${rgb}, ${alpha}), rgba(15,23,42,${clamp(alpha - 0.08, 0.08, 0.88)}))`,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: `0 20px 50px rgba(0,0,0,0.34), 0 0 0 1px rgba(${rgb}, 0.2)`,
        },
        labelStyle: {
          ...sharedLabel,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          color: '#fff',
        },
        contentStyle: {
          ...sharedContent,
          padding: isMobile ? '0 18px' : '0 28px',
          color: '#fff',
        },
        accentStyle: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent 8%, transparent 92%, rgba(0,0,0,0.16))',
        },
        topLineStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${themeColor}, rgba(255,255,255,0.9), ${themeColor})`,
        },
        labelDotStyle: {
          width: isMobile ? '8px' : '10px',
          height: isMobile ? '8px' : '10px',
          borderRadius: '999px',
          background: themeColor,
          boxShadow: `0 0 16px ${themeColor}`,
        },
        messageStyle: {
          ...sharedMessage,
        },
        fontColor: '#ffffff',
      };
    case 'minimal':
      return {
        variant,
        containerStyle: {
          ...baseContainer,
          background: `linear-gradient(180deg, rgba(10,10,12,${alpha}), rgba(15,15,20,${clamp(alpha - 0.1, 0.06, 0.85)}))`,
          borderTop: isTop ? '1px solid rgba(255,255,255,0.12)' : 'none',
          borderBottom: isTop ? 'none' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'none',
        },
        labelStyle: {
          ...sharedLabel,
          background: 'rgba(255,255,255,0.02)',
          borderRight: `2px solid ${themeColor}`,
          color: themeColor,
        },
        contentStyle: {
          ...sharedContent,
          padding: isMobile ? '0 16px' : '0 22px',
          color: fontColor,
        },
        accentStyle: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent 10%, transparent 90%, rgba(255,255,255,0.04))',
          opacity: 0.75,
        },
        topLineStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
        },
        labelDotStyle: {
          width: isMobile ? '7px' : '9px',
          height: isMobile ? '7px' : '9px',
          borderRadius: '999px',
          background: themeColor,
        },
        messageStyle: {
          ...sharedMessage,
        },
        fontColor,
      };
    case 'neon':
      return {
        variant,
        containerStyle: {
          ...baseContainer,
          background: 'linear-gradient(135deg, rgba(2,6,23,0.92), rgba(15,23,42,0.82))',
          border: `1px solid ${themeColor}`,
          boxShadow: `0 0 24px rgba(${rgb}, 0.3), 0 0 58px rgba(${rgb}, 0.14), inset 0 0 18px rgba(${rgb}, 0.16)`,
        },
        labelStyle: {
          ...sharedLabel,
          background: themeColor,
          color: '#04111d',
          textShadow: 'none',
        },
        contentStyle: {
          ...sharedContent,
          padding: isMobile ? '0 18px' : '0 26px',
          color: '#ffffff',
        },
        accentStyle: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent 12%, transparent 88%, rgba(255,255,255,0.08))',
          opacity: 0.85,
        },
        topLineStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${themeColor}, rgba(255,255,255,0.9), ${themeColor})`,
        },
        labelDotStyle: {
          width: isMobile ? '8px' : '10px',
          height: isMobile ? '8px' : '10px',
          borderRadius: '999px',
          background: '#000',
          boxShadow: `0 0 16px rgba(255,255,255,0.4)`,
        },
        messageStyle: {
          ...sharedMessage,
        },
        fontColor: '#ffffff',
      };
    case 'news_channel':
      return {
        variant,
        containerStyle: {
          ...baseContainer,
          background: 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)',
          borderTop: isTop ? '4px solid transparent' : `4px solid ${themeColor}`,
          borderBottom: isTop ? `4px solid ${themeColor}` : '4px solid transparent',
          border: '1px solid rgba(15,23,42,0.12)',
          borderRadius: '20px',
          boxShadow: '0 18px 45px rgba(15,23,42,0.18)',
        },
        labelStyle: {
          ...sharedLabel,
          background: `linear-gradient(135deg, #111827, rgba(${rgb}, 0.96))`,
          color: '#fff',
          borderRight: 'none',
          borderTopRightRadius: '18px',
          borderBottomRightRadius: '18px',
          minWidth: isMobile ? '122px' : '154px',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 6px 0 18px rgba(${rgb}, 0.16)`,
        },
        contentStyle: {
          ...sharedContent,
          padding: isMobile ? '0 18px 0 18px' : '0 26px 0 26px',
          color: '#111827',
          fontWeight: 900,
        },
        accentStyle: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(15,23,42,0.06), transparent 10%, transparent 90%, rgba(15,23,42,0.06))',
        },
        topLineStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, #111827, ${themeColor}, #111827)`,
        },
        labelDotStyle: {
          width: isMobile ? '7px' : '9px',
          height: isMobile ? '7px' : '9px',
          borderRadius: '999px',
          background: '#fff',
          boxShadow: `0 0 10px rgba(255,255,255,0.9)`,
        },
        messageStyle: {
          ...sharedMessage,
          fontWeight: 900,
          color: '#111827',
        },
        fontColor: '#111827',
      };
    case 'elegant':
      return {
        variant,
        containerStyle: {
          ...baseContainer,
          background: `linear-gradient(135deg, rgba(15,15,15,${alpha}), rgba(28,25,23,${clamp(alpha - 0.08, 0.08, 0.88)}))`,
          borderTop: isTop ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${themeColor}`,
          borderBottom: isTop ? `1px solid ${themeColor}` : '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.34)',
        },
        labelStyle: {
          ...sharedLabel,
          background: 'transparent',
          color: themeColor,
          fontFamily: 'Playfair Display, serif',
          letterSpacing: '3px',
          fontWeight: 800,
        },
        contentStyle: {
          ...sharedContent,
          padding: isMobile ? '0 18px' : '0 26px',
          color: fontColor,
        },
        accentStyle: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.05), transparent 10%, transparent 90%, rgba(255,255,255,0.04))',
        },
        topLineStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
        },
        labelDotStyle: {
          width: isMobile ? '7px' : '9px',
          height: isMobile ? '7px' : '9px',
          borderRadius: '999px',
          background: themeColor,
        },
        messageStyle: {
          ...sharedMessage,
          letterSpacing: '0.8px',
        },
        fontColor,
      };
    default:
      return {
        variant: 'classic',
        containerStyle: {
          ...baseContainer,
          background: `linear-gradient(135deg, rgba(${rgb}, ${alpha}), rgba(15,23,42,${clamp(alpha - 0.08, 0.08, 0.88)}))`,
          borderRadius: radius,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `0 18px 42px rgba(0,0,0,0.3), 0 0 0 1px rgba(${rgb}, 0.12)`,
        },
        labelStyle: {
          ...sharedLabel,
          background: 'rgba(0,0,0,0.18)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
        },
        contentStyle: {
          ...sharedContent,
          padding: isMobile ? '0 16px' : '0 24px',
          color: fontColor,
        },
        accentStyle: {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.2), transparent 10%, transparent 90%, rgba(0,0,0,0.18))',
        },
        topLineStyle: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${themeColor}, rgba(255,255,255,0.8), ${themeColor})`,
        },
        labelDotStyle: {
          width: isMobile ? '8px' : '10px',
          height: isMobile ? '8px' : '10px',
          borderRadius: '999px',
          background: themeColor,
          boxShadow: `0 0 14px ${themeColor}`,
        },
        messageStyle: {
          ...sharedMessage,
        },
        fontColor,
      };
  }
};
