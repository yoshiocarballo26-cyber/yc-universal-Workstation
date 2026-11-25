/**
 * Búsqueda de música sin clave — servicios que sí se pueden usar gratis.
 *
 * - Deezer: API pública SIN clave, pero SIN cabeceras CORS: un fetch normal
 *   falla en el navegador. Se usa JSONP (la API lo soporta con
 *   ?output=jsonp), que sí funciona desde el navegador sin proxy. Devuelve
 *   previews MP3 de 30 s (los que tengan) y portadas. Sin login.
 * - YouTube / YouTube Music: búsqueda abre youtube.com / music.youtube.com
 *   (pestaña nueva). Pegar un enlace de video lo incrusta con el reproductor
 *   de YouTube (youtube-nocookie), sin clave.
 * - SoundCloud: búsqueda abre soundcloud.com/search. Pegar un enlace de
 *   pista lo incrusta con el reproductor oficial de SoundCloud, sin clave.
 * - BandLab: NO tiene API pública ni URL de búsqueda verificada. Solo se
 *   abre bandlab.com y se pueden abrir enlaces de pista (bandlab.com/track/…).
 * - Apple Music: NO factible ahora (pide Apple Developer de pago + token).
 * - Tidal: NO factible ahora (API cerrada, solo socios).
 * No se inventa ninguna credencial ni endpoint.
 */

export interface DeezerTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover?: string;
  preview: string | null;
  link: string;
  duration: number;
}

/** Búsqueda en Deezer por JSONP (sin clave, sin CORS). */
export function deezerSearch(query: string, timeoutMs = 8000): Promise<DeezerTrack[]> {
  return new Promise((resolve, reject) => {
    const cbName = `ycDeezerCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Deezer no respondió a tiempo.'));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timer);
      delete (window as any)[cbName];
      script.remove();
    };
    (window as any)[cbName] = (data: any) => {
      cleanup();
      if (data?.error) {
        reject(new Error('Deezer devolvió un error.'));
        return;
      }
      const tracks: DeezerTrack[] = (data?.data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artist?.name || '',
        album: t.album?.title || '',
        cover: t.album?.cover_medium || t.album?.cover,
        preview: t.preview || null,
        link: t.link || '',
        duration: t.duration || 0,
      }));
      resolve(tracks);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('No se pudo contactar a Deezer.'));
    };
    script.src = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=8&output=jsonp&callback=${cbName}`;
    document.body.appendChild(script);
  });
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function youtubeMusicSearchUrl(query: string): string {
  return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
}

/** Extrae el ID de video de enlaces de YouTube / YouTube Music / Shorts. */
export function parseYoutubeId(text: string): string | null {
  const m =
    text.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    text.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    text.match(/shorts\/([A-Za-z0-9_-]{11})/) ||
    text.match(/embed\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function soundcloudSearchUrl(query: string): string {
  return `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
}

export function soundcloudEmbedUrl(trackUrl: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=false&hide_related=true`;
}

export function bandlabHomeUrl(): string {
  return 'https://www.bandlab.com/';
}
