import api from './api';

const CACHE_NAME = 'painel-digital-player-cache-v2';
const INDEX_KEY = '@DigitalSignage:playerCacheIndex';
const PLAYLIST_KEY = '@DigitalSignage:lastCachedPlaylist';

const objectUrls = new Map();

function cacheDisponivel() {
  return typeof window !== 'undefined' && 'caches' in window && typeof fetch === 'function';
}

function carregarIndice() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '{}');
  } catch {
    return {};
  }
}

function salvarIndice(indice) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(indice));
}

function salvarPlaylist(playlist) {
  localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlist));
}

export function carregarPlaylistSalva() {
  try {
    return JSON.parse(localStorage.getItem(PLAYLIST_KEY) || 'null');
  } catch {
    return null;
  }
}

function chaveMidia(media) {
  const versao = media.updated_at || media.size_bytes || media.filename || 'sem-versao';
  return `${media.id}:${versao}`;
}

function resolverUrlMidia(media) {
  const url = media?.original_url || media?.url || media?.cached_url || '';
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file:') || url.startsWith('capacitor:') || url.startsWith('content:')) {
    return url;
  }
  const backendHost = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : 'https://midiamais.up.railway.app';
  const cleanPath = url.replace(/^\/+/, '');
  if (cleanPath.startsWith('uploads/')) {
    return `${backendHost}/${cleanPath}`;
  }
  return `${backendHost}/uploads/${cleanPath}`;
}

function clonarPlaylist(playlist) {
  return JSON.parse(JSON.stringify(playlist));
}

function extrairMediasDaPlaylist(playlist) {
  const mediasDoManifesto = Array.isArray(playlist?.manifest?.medias) ? playlist.manifest.medias : [];
  if (mediasDoManifesto.length > 0) {
    return mediasDoManifesto.filter((media) => media?.url && media?.type !== 'widget' && media?.type !== 'video');
  }

  return (playlist?.items || [])
    .map((item) => ({
      id: item.media_id || item.id,
      url: item.original_url || item.url || item.cached_url || '',
      filename: item.media_filename || item.filename || '',
      type: item.media_type || item.type || '',
      size_bytes: item.size_bytes || 0,
      updated_at: item.media_updated_at || item.updated_at || null,
    }))
    .filter((media) => media?.url && media?.type !== 'widget' && media?.type !== 'video');
}

async function baixarMidia(cache, media) {
  const url = resolverUrlMidia(media);
  if (!url) {
    throw new Error('url_indisponivel');
  }

  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) {
    throw new Error(`download_${response.status}`);
  }
  await cache.put(url, response.clone());
}

async function obterObjectUrl(cache, url) {
  if (objectUrls.has(url)) return objectUrls.get(url);

  const response = await cache.match(url);
  if (!response) return url;

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.set(url, objectUrl);
  return objectUrl;
}

async function aplicarUrlLocalEmItem(cache, item) {
  const urlOriginal = resolverUrlMidia(item);
  if (!urlOriginal) return item;

  const localUrl = await obterObjectUrl(cache, urlOriginal);
  return {
    ...item,
    url: localUrl,
    original_url: item.original_url || urlOriginal,
    cached_url: localUrl,
    cached: localUrl !== urlOriginal,
    media: item.media
      ? {
          ...item.media,
          url: localUrl,
          original_url: item.media.original_url || urlOriginal,
          cached_url: localUrl,
          cached: localUrl !== urlOriginal,
        }
      : item.media,
  };
}

async function aplicarUrlsLocais(playlist, indice) {
  const cache = await caches.open(CACHE_NAME);
  const copia = clonarPlaylist(playlist);

  copia.items = await Promise.all((copia.items || []).map(async (item) => {
    const mediaId = item.media_id || item.id;
    const itemType = item.type || item.media_type || '';
    if (itemType === 'widget' || itemType === 'video') return item;

    const registro = indice[mediaId];
    if (!registro?.url) return aplicarUrlLocalEmItem(cache, item);

    const itemComRegistro = {
      ...item,
      url: registro.url,
      original_url: item.original_url || item.url || registro.url,
    };

    return aplicarUrlLocalEmItem(cache, itemComRegistro);
  }));

  return copia;
}

async function limparMidiasRemovidas(cache, indiceAtual, mediasAtuais) {
  const chavesAtuais = new Set(mediasAtuais.map((media) => media.id));
  const proximoIndice = {};

  for (const [mediaId, registro] of Object.entries(indiceAtual)) {
    if (chavesAtuais.has(mediaId)) {
      proximoIndice[mediaId] = registro;
    } else if (registro?.url) {
      await cache.delete(registro.url);
      const objectUrl = objectUrls.get(registro.url);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrls.delete(registro.url);
    }
  }

  return proximoIndice;
}

async function sincronizarMidias(cache, playlist, indiceAtual, { preservarAntigos = true } = {}) {
  const medias = extrairMediasDaPlaylist(playlist);
  const indiceBase = preservarAntigos ? await limparMidiasRemovidas(cache, indiceAtual, medias) : { ...indiceAtual };
  const falhas = [];

  try {
    for (const media of medias) {
      const mediaId = media.id;
      const chave = chaveMidia(media);
      const registroAnterior = indiceBase[mediaId] || indiceAtual[mediaId];
      const urlAtual = resolverUrlMidia(media);

      if (!urlAtual) continue;

      const registroAtual = indiceBase[mediaId];
      const cacheHit = registroAtual?.key === chave && registroAtual?.url && await cache.match(registroAtual.url);
      if (cacheHit && await cache.match(urlAtual)) {
        indiceBase[mediaId] = {
          key: chave,
          url: urlAtual,
          filename: media.filename,
          size_bytes: media.size_bytes || 0,
          updated_at: media.updated_at || null,
        };
        continue;
      }

      try {
        await baixarMidia(cache, { ...media, url: urlAtual });

        if (registroAnterior?.url && registroAnterior.url !== urlAtual) {
          await cache.delete(registroAnterior.url);
          const objectUrlAntigo = objectUrls.get(registroAnterior.url);
          if (objectUrlAntigo) URL.revokeObjectURL(objectUrlAntigo);
          objectUrls.delete(registroAnterior.url);
        }

        indiceBase[mediaId] = {
          key: chave,
          url: urlAtual,
          filename: media.filename,
          size_bytes: media.size_bytes || 0,
          updated_at: media.updated_at || null,
        };
      } catch (downloadError) {
        console.warn(`[Player Cache] Falha ao baixar mídia ${media.filename} em segundo plano:`, downloadError.message);
        falhas.push(mediaId);
        if (registroAnterior) {
          indiceBase[mediaId] = registroAnterior;
        }
      }
    }

    salvarIndice(indiceBase);
    return {
      indice: indiceBase,
      completo: falhas.length === 0,
      falhas,
    };
  } catch (err) {
    console.warn('[Player Cache] Falha na sincronização:', err.message);
    return {
      indice: indiceAtual,
      completo: false,
      falhas: medias.map((media) => media.id),
    };
  }
}

export async function sincronizarPlaylistComCache(playlist, onSyncComplete, opcoes = {}) {
  if (!playlist?.items?.length || !cacheDisponivel()) {
    if (playlist) salvarPlaylist(playlist);
    return playlist;
  }

  // 1. Salva a playlist imediatamente na persistência local
  salvarPlaylist(playlist);

  // 2. Obtém o índice atual e gera a playlist com URLs locais do que já está em cache
  const indiceAtual = carregarIndice();
  const playlistComCacheExistente = await aplicarUrlsLocais(playlist, indiceAtual);
  const cache = await caches.open(CACHE_NAME);
  const resultado = await sincronizarMidias(cache, playlist, indiceAtual, opcoes);
  const playlistTotalmenteLocal = await aplicarUrlsLocais(playlist, resultado.indice);

  salvarPlaylist(playlist);

  if (onSyncComplete) {
    onSyncComplete(playlistTotalmenteLocal);
  }

  return playlistTotalmenteLocal;
}

export async function sincronizarPlaylistEmSegundoPlano(playlist, onSyncComplete) {
  if (!playlist?.items?.length || !cacheDisponivel()) {
    return playlist;
  }

  salvarPlaylist(playlist);
  const indiceAtual = carregarIndice();
  const cache = await caches.open(CACHE_NAME);
  const resultado = await sincronizarMidias(cache, playlist, indiceAtual, { preservarAntigos: true });

  if (onSyncComplete) {
    const playlistTotalmenteLocal = await aplicarUrlsLocais(playlist, resultado.indice);
    onSyncComplete(playlistTotalmenteLocal);
  }

  return aplicarUrlsLocais(playlist, resultado.indice);
}

export async function carregarPlaylistLocalizadaDaCache(playlist) {
  if (!playlist?.items?.length || !cacheDisponivel()) {
    return playlist;
  }

  const indice = carregarIndice();
  return aplicarUrlsLocais(playlist, indice);
}

export function limparObjectUrlsDoPlayer() {
  for (const objectUrl of objectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrls.clear();
}

export async function limparCacheLocalDoPlayer() {
  try {
    localStorage.removeItem(PLAYLIST_KEY);
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // Ignora falhas de armazenamento
  }

  if (!cacheDisponivel()) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    await Promise.all(requests.map((request) => cache.delete(request)));
  } catch (err) {
    console.warn('[Player Cache] Falha ao limpar cache local:', err.message);
  }
}
