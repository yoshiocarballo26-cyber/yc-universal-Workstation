/**
 * Spotify — integración real con la Web API de Spotify (PKCE, sin secreto).
 *
 * Qué funciona y qué no (léelo antes de usarlo):
 * - SIN Client ID configurado: nada de esto llama a Spotify. La sección
 *   explica cómo conectar y ofrece buscar en open.spotify.com (pestaña nueva).
 * - CON Client ID (variable VITE_SPOTIFY_CLIENT_ID en build): login PKCE del
 *   usuario, búsqueda de canciones/artistas y previews de 30 s (los que
 *   Spotify devuelva; muchos ya no traen preview_url).
 * - Reproducción COMPLETA: solo con cuenta Spotify Premium + Web Playback
 *   SDK. `startFullPlayback()` lo intenta y reporta si no se puede; NO está
 *   verificado sin credenciales reales, y así se marca en la pantalla.
 * - No se inventa ninguna clave: el Client ID es público por diseño de
 *   Spotify para apps PKCE, y el token vive solo en sessionStorage.
 *
 * Para conectar (Yoshio): crear app en developer.spotify.com → copiar el
 * Client ID → ponerlo como VITE_SPOTIFY_CLIENT_ID al compilar → en el
 * dashboard de Spotify agregar la Redirect URI de la app desplegada
 * (ej. https://yoshiocarballo26-cyber.github.io/universal/).
 */

const CLIENT_ID = (import.meta as any)?.env?.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
].join(' ');

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  album: string;
  image?: string;
  previewUrl: string | null;
  externalUrl: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  image?: string;
  followers?: number;
  externalUrl: string;
}

export function spotifyConfigured(): boolean {
  return !!CLIENT_ID;
}

export function redirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

function base64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (x) => chars[x % chars.length]).join('');
}

export async function startSpotifyLogin(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Sin Client ID configurado.');
  const verifier = randomString(64);
  sessionStorage.setItem('yc-spotify-verifier', verifier);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64Url(digest);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleSpotifyCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code || !CLIENT_ID) return false;
  const verifier = sessionStorage.getItem('yc-spotify-verifier');
  if (!verifier) return false;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json();
  sessionStorage.setItem('yc-spotify-token', data.access_token);
  sessionStorage.setItem('yc-spotify-refresh', data.refresh_token || '');
  sessionStorage.setItem('yc-spotify-expires', String(Date.now() + (data.expires_in || 3600) * 1000));
  window.history.replaceState({}, '', window.location.pathname);
  return true;
}

export function getSpotifyToken(): string | null {
  const token = sessionStorage.getItem('yc-spotify-token');
  const expires = Number(sessionStorage.getItem('yc-spotify-expires') || 0);
  if (!token || Date.now() > expires) return null;
  return token;
}

export function logoutSpotify(): void {
  sessionStorage.removeItem('yc-spotify-token');
  sessionStorage.removeItem('yc-spotify-refresh');
  sessionStorage.removeItem('yc-spotify-expires');
}

export async function spotifyMe(token: string): Promise<{ name: string; product: string } | null> {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return { name: data.display_name || data.id || 'Tu cuenta', product: data.product || 'free' };
  } catch {
    return null;
  }
}

export async function spotifySearch(
  token: string,
  query: string
): Promise<{ tracks: SpotifyTrack[]; artists: SpotifyArtist[] }> {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist&limit=8`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Spotify devolvió ${res.status}.`);
  const data = await res.json();
  return {
    tracks: (data.tracks?.items || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artists: (t.artists || []).map((a: any) => a.name).join(', '),
      album: t.album?.name || '',
      image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
      previewUrl: t.preview_url || null,
      externalUrl: t.external_urls?.spotify || '',
    })),
    artists: (data.artists?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      image: a.images?.[1]?.url || a.images?.[0]?.url,
      followers: a.followers?.total,
      externalUrl: a.external_urls?.spotify || '',
    })),
  };
}

/** URL pública de búsqueda en Spotify web (funciona sin login ni clave). */
export function spotifyWebSearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

/** URL pública de búsqueda en Amazon Music (funciona sin login ni clave). */
export function amazonMusicSearchUrl(query: string): string {
  return `https://music.amazon.com/search/${encodeURIComponent(query)}`;
}

/**
 * Reproducción completa con Web Playback SDK (solo Premium).
 * NO verificado sin credenciales reales: carga el SDK, crea el reproductor
 * y pide transferir la reproducción. Devuelve un mensaje honesto del resultado.
 */
export function startFullPlayback(
  token: string,
  trackUri: string
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const w = window as any;
    const timeout = window.setTimeout(() => resolve({ ok: false, message: 'El reproductor de Spotify no respondió a tiempo. Revisa tu conexión y que tu cuenta sea Premium.' }), 15000);
    const initPlayer = () => {
      try {
        const player = new w.Spotify.Player({
          name: 'YC Workstation',
          getOAuthToken: (cb: (t: string) => void) => cb(token),
          volume: 0.8,
        });
        player.addListener('ready', async ({ device_id }: { device_id: string }) => {
          const res = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_ids: [device_id], play: true, uris: [trackUri] }),
          });
          window.clearTimeout(timeout);
          resolve(
            res.ok
              ? { ok: true, message: 'Reproduciendo en YC Workstation (Spotify Premium).' }
              : { ok: false, message: `Spotify no aceptó la reproducción (${res.status}). Puede que tu cuenta no sea Premium.` }
          );
        });
        player.addListener('not_ready', () => {
          window.clearTimeout(timeout);
          resolve({ ok: false, message: 'El reproductor de Spotify no se activó en este navegador.' });
        });
        player.connect();
      } catch (e) {
        window.clearTimeout(timeout);
        resolve({ ok: false, message: 'No se pudo iniciar el reproductor de Spotify en este navegador.' });
      }
    };
    if (w.Spotify) {
      initPlayer();
    } else {
      w.onSpotifyWebPlaybackSDKReady = initPlayer;
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.onerror = () => {
        window.clearTimeout(timeout);
        resolve({ ok: false, message: 'No se pudo cargar el SDK de Spotify (¿sin internet?).' });
      };
      document.body.appendChild(script);
    }
  });
}
