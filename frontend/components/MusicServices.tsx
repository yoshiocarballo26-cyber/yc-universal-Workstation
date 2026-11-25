import React, { useEffect, useRef, useState } from 'react';
import {
  Music, Play, Pause, ExternalLink, Search, LogIn, LogOut, Crown, AlertTriangle,
} from 'lucide-react';
import {
  spotifyConfigured, startSpotifyLogin, handleSpotifyCallback, getSpotifyToken,
  logoutSpotify, spotifyMe, spotifySearch, spotifyWebSearchUrl, amazonMusicSearchUrl,
  startFullPlayback, SpotifyTrack, SpotifyArtist,
} from '../services/spotify';
import {
  deezerSearch, DeezerTrack, youtubeSearchUrl, youtubeMusicSearchUrl,
  parseYoutubeId, youtubeEmbedUrl, soundcloudSearchUrl, soundcloudEmbedUrl,
  bandlabHomeUrl,
} from '../services/musicSearch';

/**
 * Música online: Spotify y Amazon Music.
 *
 * SPOTIFY — qué funciona sin login y qué necesita login/Premium:
 * - Sin Client ID (así está hoy): búsqueda en open.spotify.com (pestaña
 *   nueva) y enlaces. Sin previews dentro de la app.
 * - Con Client ID + login del usuario (PKCE): búsqueda de canciones y
 *   artistas dentro de la app y previews de 30 s (los que Spotify devuelva).
 * - Reproducción completa: solo Spotify Premium + Web Playback SDK.
 *   Implementado y con mensajes honestos, pero NO verificado sin
 *   credenciales reales.
 *
 * AMAZON MUSIC — solo búsqueda / enlace externo. Yoshio ya no tiene cuenta
 * de Amazon Music, así que NO hay reproducción completa con login y NO se
 * le pide crear una cuenta. Amazon no tiene API pública abierta para
 * reproducir dentro de apps de terceros (su Web API está en beta cerrada y
 * su Device API está obsoleta). Los previews solo existen en la web de
 * Amazon, con su cuenta; aquí solo se busca y se abre en Amazon Music.
 *
 * YOUTUBE / YOUTUBE MUSIC — búsqueda en pestaña nueva; pegar un enlace de
 * video lo incrusta (youtube-nocookie), sin clave. Sin API de datos.
 * DEEZER — búsqueda y previews de 30 s por JSONP, sin clave ni login
 * (su API no da CORS, por eso no es fetch). Sin reproducción completa.
 * SOUNDCLOUD — búsqueda en pestaña nueva; pegar un enlace de pista lo
 * incrusta con su reproductor oficial, sin clave.
 * BANDLAB — sin API pública ni URL de búsqueda verificada: solo se abre
 * BandLab y se pueden abrir enlaces de pista. Sin login pedido.
 * APPLE MUSIC y TIDAL — NO factibles ahora (ver tarjeta al final).
 */

export const MusicServices: React.FC = () => {
  const [tab, setTab] = useState<'spotify' | 'amazon' | 'youtube' | 'deezer' | 'soundcloud' | 'bandlab'>('spotify');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [me, setMe] = useState<{ name: string; product: string } | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [amazonQuery, setAmazonQuery] = useState('');
  // Deezer / YouTube / SoundCloud
  const [deezerTracks, setDeezerTracks] = useState<DeezerTrack[]>([]);
  const [deezerQuery, setDeezerQuery] = useState('');
  const [deezerPlaying, setDeezerPlaying] = useState<number | null>(null);
  const [youtubeLink, setYoutubeLink] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [soundcloudLink, setSoundcloudLink] = useState('');
  const [soundcloudEmbed, setSoundcloudEmbed] = useState<string | null>(null);
  const [bandlabLink, setBandlabLink] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const deezerAudioRef = useRef<HTMLAudioElement | null>(null);

  const configured = spotifyConfigured();
  const token = getSpotifyToken();

  useEffect(() => {
    handleSpotifyCallback().then((ok) => {
      if (ok) setStatus('Sesión de Spotify conectada.');
    });
    const t = getSpotifyToken();
    if (t) {
      spotifyMe(t).then(setMe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    if (!configured) {
      window.open(spotifyWebSearchUrl(q), '_blank', 'noopener,noreferrer');
      setStatus('Sin Client ID de Spotify: la búsqueda se abrió en open.spotify.com (pestaña nueva).');
      return;
    }
    const t = getSpotifyToken();
    if (!t) {
      setStatus('Conecta tu cuenta de Spotify primero (botón de arriba).');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const r = await spotifySearch(t, q);
      setTracks(r.tracks);
      setArtists(r.artists);
      if (r.tracks.length === 0 && r.artists.length === 0) setStatus('Spotify no devolvió resultados para eso.');
    } catch (e) {
      setStatus('No se pudo buscar en Spotify. Tu sesión pudo haber vencido: vuelve a conectar.');
    } finally {
      setBusy(false);
    }
  };

  const playPreview = (track: SpotifyTrack) => {
    const a = audioRef.current;
    if (!a) return;
    if (playingPreview === track.id) {
      a.pause();
      setPlayingPreview(null);
      return;
    }
    if (!track.previewUrl) {
      setStatus('Esa canción no trae preview de 30 s en Spotify. Ábrela en Spotify para escucharla.');
      return;
    }
    a.src = track.previewUrl;
    a.play();
    setPlayingPreview(track.id);
  };

  const playFull = async (track: SpotifyTrack) => {
    const t = getSpotifyToken();
    if (!t) return;
    if (me?.product !== 'premium') {
      setStatus('La reproducción completa necesita Spotify Premium. Con cuenta gratuita solo hay previews de 30 s.');
      return;
    }
    setBusy(true);
    const r = await startFullPlayback(t, `spotify:track:${track.id}`);
    setStatus(r.message);
    setBusy(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian-950 text-slate-100 p-4 md:p-8">
      <audio ref={audioRef} onEnded={() => setPlayingPreview(null)} />
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-6 h-6 text-gold-400" /> Música online
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Spotify y Amazon Music, junto a tu música local. Sin claves inventadas: lo que falta por conectar se dice aquí.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-obsidian-900 border border-obsidian-800 rounded-xl p-1">
          {([
            { id: 'spotify', label: 'Spotify' },
            { id: 'amazon', label: 'Amazon Music' },
            { id: 'youtube', label: 'YouTube' },
            { id: 'deezer', label: 'Deezer' },
            { id: 'soundcloud', label: 'SoundCloud' },
            { id: 'bandlab', label: 'BandLab' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-sm font-bold transition ${tab === t.id ? 'bg-gold-500 text-obsidian-950' : 'text-slate-300 hover:bg-obsidian-850'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'spotify' && (
          <div className="space-y-4">
            {!configured && (
              <div className="bg-obsidian-900 border border-gold-500/30 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold text-gold-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Spotify aún no está conectado
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para buscar y escuchar previews dentro de la app falta conectar la app de Spotify:
                  crear la app en developer.spotify.com, copiar su Client ID y compilar con
                  VITE_SPOTIFY_CLIENT_ID, y agregar la Redirect URI de la app desplegada.
                  Sin eso, la búsqueda de abajo abre open.spotify.com en una pestaña nueva (eso sí funciona hoy, sin login).
                </p>
              </div>
            )}
            {configured && !token && (
              <button
                onClick={() => startSpotifyLogin()}
                className="w-full px-4 py-3 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Conectar con Spotify
              </button>
            )}
            {token && me && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-obsidian-900 border border-obsidian-800 rounded-2xl px-4 py-3">
                <p className="text-sm text-slate-200">
                  Conectado como <strong className="text-white">{me.name}</strong>{' '}
                  <span className="text-xs font-mono text-gold-300">
                    {me.product === 'premium' ? '· Premium' : '· Cuenta gratuita (solo previews)'}
                  </span>
                </p>
                <button
                  onClick={() => {
                    logoutSpotify();
                    setMe(null);
                    setTracks([]);
                    setArtists([]);
                    setStatus('Sesión de Spotify cerrada.');
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-obsidian-850 border border-obsidian-750 rounded-xl flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doSearch();
                  }}
                  placeholder="Busca una canción o artista en Spotify…"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button onClick={doSearch} disabled={busy} className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl disabled:opacity-50">
                Buscar
              </button>
            </div>

            {status && <p className="text-xs font-mono px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-200">{status}</p>}

            {tracks.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Canciones</h2>
                {tracks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3 mb-2">
                    {t.image ? (
                      <img src={t.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="w-12 h-12 rounded-xl bg-obsidian-800 flex items-center justify-center shrink-0"><Music className="w-5 h-5 text-gold-400" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{t.name}</p>
                      <p className="text-xs text-slate-400 truncate">{t.artists} · {t.album}</p>
                    </div>
                    <button
                      onClick={() => playPreview(t)}
                      disabled={!t.previewUrl}
                      className="p-2.5 rounded-full bg-gold-500 text-obsidian-950 disabled:opacity-30 shrink-0"
                      title={t.previewUrl ? 'Escuchar preview de 30 s' : 'Sin preview en Spotify'}
                    >
                      {playingPreview === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => playFull(t)}
                      disabled={!token || me?.product !== 'premium' || busy}
                      className="px-2.5 py-2 text-[11px] font-bold bg-obsidian-850 border border-gold-500/40 text-gold-300 rounded-xl disabled:opacity-30 shrink-0 flex items-center gap-1"
                      title="Reproducción completa (solo Premium; no verificado sin credenciales)"
                    >
                      <Crown className="w-3.5 h-3.5" /> Completa
                    </button>
                    <a href={t.externalUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-gold-300 shrink-0" title="Abrir en Spotify">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {artists.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Artistas</h2>
                <div className="grid grid-cols-2 gap-2">
                  {artists.map((a) => (
                    <a
                      key={a.id}
                      href={a.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 bg-obsidian-900 border border-obsidian-800 hover:border-gold-500/40 rounded-2xl p-3 transition"
                    >
                      {a.image ? (
                        <img src={a.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-10 h-10 rounded-full bg-obsidian-800 flex items-center justify-center shrink-0"><Music className="w-4 h-4 text-gold-400" /></span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white truncate">{a.name}</span>
                        <span className="block text-[11px] text-slate-500">{a.followers?.toLocaleString('es-MX')} seguidores</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'amazon' && (
          <div className="space-y-4">
            <div className="bg-obsidian-900 border border-gold-500/30 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-gold-300">Amazon Music: solo búsqueda y enlace</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Amazon Music no tiene una API pública abierta para reproducir dentro de apps de terceros
                (su Web API está en beta cerrada y su Device API está obsoleta). Por eso aquí no hay
                reproducción dentro de la Workstation: se busca y se abre en Amazon Music, donde los
                previews y la reproducción completa son de Amazon. Yoshio ya no tiene cuenta de Amazon
                Music, así que no se le pide crear una ni iniciar sesión.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={amazonQuery}
                  onChange={(e) => setAmazonQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && amazonQuery.trim()) {
                      window.open(amazonMusicSearchUrl(amazonQuery.trim()), '_blank', 'noopener,noreferrer');
                    }
                  }}
                  placeholder="Busca una canción o artista en Amazon Music…"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={() => {
                  if (amazonQuery.trim()) window.open(amazonMusicSearchUrl(amazonQuery.trim()), '_blank', 'noopener,noreferrer');
                }}
                className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl"
              >
                Buscar en Amazon
              </button>
            </div>
            <a
              href="https://music.amazon.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-obsidian-900 border border-obsidian-800 rounded-xl text-slate-200 hover:border-gold-500/40"
            >
              Abrir Amazon Music <ExternalLink className="w-4 h-4 text-gold-400" />
            </a>
          </div>
        )}

        {tab === 'youtube' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3">
              YouTube / YouTube Music: la búsqueda abre YouTube en una pestaña nueva (sin clave de API).
              Si pegas el enlace de un video, se incrusta aquí con el reproductor de YouTube.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && query.trim()) window.open(youtubeSearchUrl(query.trim()), '_blank', 'noopener,noreferrer');
                  }}
                  placeholder="Busca en YouTube…"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button onClick={() => query.trim() && window.open(youtubeSearchUrl(query.trim()), '_blank', 'noopener,noreferrer')} className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl">
                YouTube
              </button>
              <button onClick={() => query.trim() && window.open(youtubeMusicSearchUrl(query.trim()), '_blank', 'noopener,noreferrer')} className="px-4 py-2.5 text-sm font-bold bg-obsidian-900 border border-obsidian-800 rounded-xl">
                YouTube Music
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="Pega un enlace de YouTube para verlo aquí…"
                className="flex-1 min-w-0 bg-obsidian-900 border border-obsidian-750 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <button
                onClick={() => {
                  const id = parseYoutubeId(youtubeLink);
                  if (id) setYoutubeId(id);
                  else setStatus('Ese enlace no parece de YouTube. Copia la dirección completa del video.');
                }}
                className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl"
              >
                Ver aquí
              </button>
            </div>
            {youtubeId && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-obsidian-800 bg-black">
                <iframe src={youtubeEmbedUrl(youtubeId)} title="Video de YouTube" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )}
          </div>
        )}

        {tab === 'deezer' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3">
              Deezer: búsqueda y previews de 30 s sin clave ni login (su API pública, por JSONP).
              No hay reproducción completa: eso necesita cuenta de Deezer y su reproductor.
            </p>
            <audio ref={deezerAudioRef} onEnded={() => setDeezerPlaying(null)} />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={deezerQuery}
                  onChange={(e) => setDeezerQuery(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key !== 'Enter' || !deezerQuery.trim()) return;
                    setBusy(true);
                    try {
                      setDeezerTracks(await deezerSearch(deezerQuery.trim()));
                      setStatus('');
                    } catch {
                      setStatus('No se pudo buscar en Deezer. Puedes abrir deezer.com en una pestaña nueva.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  placeholder="Busca una canción o artista en Deezer…"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={async () => {
                  if (!deezerQuery.trim()) return;
                  setBusy(true);
                  try {
                    setDeezerTracks(await deezerSearch(deezerQuery.trim()));
                    setStatus('');
                  } catch {
                    setStatus('No se pudo buscar en Deezer. Puedes abrir deezer.com en una pestaña nueva.');
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl disabled:opacity-50"
              >
                Buscar
              </button>
            </div>
            {deezerTracks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3">
                {t.cover ? (
                  <img src={t.cover} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-xl bg-obsidian-800 flex items-center justify-center shrink-0"><Music className="w-5 h-5 text-gold-400" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{t.title}</p>
                  <p className="text-xs text-slate-400 truncate">{t.artist} · {t.album}</p>
                </div>
                <button
                  onClick={() => {
                    const a = deezerAudioRef.current;
                    if (!a) return;
                    if (deezerPlaying === t.id) {
                      a.pause();
                      setDeezerPlaying(null);
                      return;
                    }
                    if (!t.preview) {
                      setStatus('Esa canción no trae preview en Deezer.');
                      return;
                    }
                    a.src = t.preview;
                    a.play();
                    setDeezerPlaying(t.id);
                  }}
                  disabled={!t.preview}
                  className="p-2.5 rounded-full bg-gold-500 text-obsidian-950 disabled:opacity-30 shrink-0"
                  title={t.preview ? 'Escuchar preview de 30 s' : 'Sin preview'}
                >
                  {deezerPlaying === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <a href={t.link} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-gold-300 shrink-0" title="Abrir en Deezer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}

        {tab === 'soundcloud' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3">
              SoundCloud: la búsqueda abre soundcloud.com en una pestaña nueva. Si pegas el enlace de una
              pista pública, se incrusta aquí con el reproductor oficial de SoundCloud, sin clave.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && query.trim()) window.open(soundcloudSearchUrl(query.trim()), '_blank', 'noopener,noreferrer');
                  }}
                  placeholder="Busca en SoundCloud…"
                  className="w-full bg-obsidian-900 border border-obsidian-750 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <button onClick={() => query.trim() && window.open(soundcloudSearchUrl(query.trim()), '_blank', 'noopener,noreferrer')} className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl">
                Buscar
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={soundcloudLink}
                onChange={(e) => setSoundcloudLink(e.target.value)}
                placeholder="Pega el enlace de una pista de SoundCloud…"
                className="flex-1 min-w-0 bg-obsidian-900 border border-obsidian-750 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <button
                onClick={() => {
                  if (/soundcloud\.com\//i.test(soundcloudLink)) setSoundcloudEmbed(soundcloudEmbedUrl(soundcloudLink.trim()));
                  else setStatus('Ese enlace no parece de SoundCloud.');
                }}
                className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl"
              >
                Escuchar aquí
              </button>
            </div>
            {soundcloudEmbed && (
              <iframe title="Reproductor de SoundCloud" className="w-full h-[166px] rounded-2xl border border-obsidian-800" scrolling="no" frameBorder="no" allow="autoplay" src={soundcloudEmbed} />
            )}
          </div>
        )}

        {tab === 'bandlab' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3">
              BandLab: no tiene API pública ni URL de búsqueda verificada, así que no se puede buscar
              desde aquí. Se abre BandLab y buscas dentro. Si pegas el enlace de una pista pública
              (bandlab.com/track/…), se abre en BandLab.
            </p>
            <div className="flex gap-2">
              <input
                value={bandlabLink}
                onChange={(e) => setBandlabLink(e.target.value)}
                placeholder="Pega el enlace de una pista de BandLab…"
                className="flex-1 min-w-0 bg-obsidian-900 border border-obsidian-750 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <button
                onClick={() => {
                  if (/bandlab\.com\/(track|post|revision)\//i.test(bandlabLink)) window.open(bandlabLink.trim(), '_blank', 'noopener,noreferrer');
                  else setStatus('Ese enlace no parece de una pista de BandLab (bandlab.com/track/…).');
                }}
                className="px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl"
              >
                Abrir pista
              </button>
            </div>
            <a
              href={bandlabHomeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-obsidian-900 border border-obsidian-800 rounded-xl text-slate-200 hover:border-gold-500/40"
            >
              Abrir BandLab <ExternalLink className="w-4 h-4 text-gold-400" />
            </a>
            <p className="text-xs text-slate-500">
              Yoshio usa BandLab para sus canciones: sus pistas y el MIDI del editor se abren ahí.
            </p>
          </div>
        )}

        {/* No factibles ahora */}
        <div className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
          <p className="text-sm font-bold text-slate-200">No factibles ahora (sin integración inventada)</p>
          <ul className="text-xs text-slate-400 mt-2 space-y-1.5 list-disc pl-4">
            <li><strong className="text-slate-200">Apple Music:</strong> su API pide cuenta de Apple Developer de pago ($99 USD/año) y token firmado. Sin eso no se puede integrar.</li>
            <li><strong className="text-slate-200">Tidal:</strong> su API está cerrada (solo socios). Sin acceso de socio no se puede integrar.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
