const CACHE_NAME = 'painel-digital-player-cache-v1';
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

function carregarPlaylistSalva() {
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

function clonarPlaylist(playlist) {
  return JSON.parse(JSON.stringify(playlist));
}

async function baixarMidia(cache, media) {
  const response = await fetch(media.url, { cache: 'reload' });
  if (!response.ok) {
    throw new Error(`download_${response.status}`);
  }
  await cache.put(media.url, response.clone());
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

async function aplicarUrlsLocais(playlist, indice) {
  const cache = await caches.open(CACHE_NAME);
  const copia = clonarPlaylist(playlist);

  copia.items = await Promise.all((copia.items || []).map(async (item) => {
    const mediaId = item.media_id || item.id;
    const registro = indice[mediaId];
    if (!registro?.url || (item.type || item.media_type) === 'widget') return item;

    const localUrl = await obterObjectUrl(cache, registro.url);
    return {
      ...item,
      url: localUrl,
      original_url: item.original_url || item.url,
      cached_url: localUrl,
      cached: localUrl !== registro.url,
    };
  }));

  return copia;
}

async function limparMidiasAntigas(cache, indiceAtual, mediasAtuais) {
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

export async function sincronizarPlaylistComCache(playlist) {
  if (!playlist?.manifest?.medias?.length || !cacheDisponivel()) {
    if (playlist) salvarPlaylist(playlist);
    return playlist;
  }

  const cache = await caches.open(CACHE_NAME);
  const indiceAtual = carregarIndice();
  const medias = playlist.manifest.medias.filter((media) => media.url && media.type !== 'widget');
  const proximoIndice = await limparMidiasAntigas(cache, indiceAtual, medias);

  try {
    for (const media of medias) {
      const chave = chaveMidia(media);
      const registro = proximoIndice[media.id];
      const cacheHit = registro?.key === chave && registro?.url && await cache.match(registro.url);

      if (!cacheHit) {
        await baixarMidia(cache, media);
      }

      proximoIndice[media.id] = {
        key: chave,
        url: media.url,
        filename: media.filename,
        size_bytes: media.size_bytes || 0,
        updated_at: media.updated_at || null,
      };
    }

    salvarIndice(proximoIndice);
    salvarPlaylist(playlist);
    const playlistLocal = await aplicarUrlsLocais(playlist, proximoIndice);
    return playlistLocal;
  } catch (error) {
    console.warn('[Player Cache] Falha ao sincronizar cache, usando ultimo plano local:', error.message);
    const fallback = carregarPlaylistSalva();
    if (fallback) {
      return aplicarUrlsLocais(fallback, carregarIndice());
    }
    return playlist;
  }
}

export function limparObjectUrlsDoPlayer() {
  for (const objectUrl of objectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrls.clear();
}
