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

export async function sincronizarPlaylistComCache(playlist, onSyncComplete) {
  if (!playlist?.manifest?.medias?.length || !cacheDisponivel()) {
    if (playlist) salvarPlaylist(playlist);
    return playlist;
  }

  // 1. Salva a playlist imediatamente na persistência local
  salvarPlaylist(playlist);

  // 2. Obtém o índice atual e gera a playlist com URLs locais do que já está em cache
  const indiceAtual = carregarIndice();
  const playlistComCacheExistente = await aplicarUrlsLocais(playlist, indiceAtual);

  // 3. Dispara a sincronização de downloads em segundo plano (totalmente assíncrona/non-blocking)
  (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const medias = playlist.manifest.medias.filter((media) => media.url && media.type !== 'widget');
      
      // Limpa mídias antigas em segundo plano
      const proximoIndice = await limparMidiasAntigas(cache, indiceAtual, medias);

      // Baixa novos itens de forma sequencial em segundo plano
      for (const media of medias) {
        const chave = chaveMidia(media);
        const registro = proximoIndice[media.id];
        const cacheHit = registro?.key === chave && registro?.url && await cache.match(registro.url);

        if (!cacheHit) {
          try {
            await baixarMidia(cache, media);
          } catch (downloadError) {
            console.warn(`[Player Cache] Falha ao baixar mídia ${media.filename} em segundo plano:`, downloadError.message);
            // Ignora erro de download individual para continuar cacheando os demais arquivos
            continue;
          }
        }

        proximoIndice[media.id] = {
          key: chave,
          url: media.url,
          filename: media.filename,
          size_bytes: media.size_bytes || 0,
          updated_at: media.updated_at || null,
        };
      }

      // Salva o novo índice atualizado
      salvarIndice(proximoIndice);

      // Gera a playlist final totalmente com as URLs locais e dispara o callback se fornecido
      if (onSyncComplete) {
        const playlistTotalmenteLocal = await aplicarUrlsLocais(playlist, proximoIndice);
        onSyncComplete(playlistTotalmenteLocal);
      }
      console.log('[Player Cache] Sincronização em segundo plano concluída com sucesso!');
    } catch (err) {
      console.warn('[Player Cache] Falha na sincronização em segundo plano:', err.message);
    }
  })();

  // 4. Retorna a playlist imediatamente com o que já estiver em cache (evita tela travada/atraso)
  return playlistComCacheExistente;
}

export function limparObjectUrlsDoPlayer() {
  for (const objectUrl of objectUrls.values()) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrls.clear();
}
