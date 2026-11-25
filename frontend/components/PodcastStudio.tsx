import React, { useEffect, useRef, useState } from 'react';
import { WorkstationFile } from '../types';
import {
  Mic, Play, Pause, Square, Upload, Download, Volume2, Plus, Trash2, Clock, Radio,
} from 'lucide-react';
import { AdSlot } from './AdSlot';

/**
 * Podcast — episodios de audio LOCALES, sin servicios de pago.
 * - Reproducir: episodios son los audios de tu biblioteca + los que grabes aquí.
 * - Grabar: tu voz por micrófono, con música de fondo opcional (audio local),
 *   mezcladas en el momento con Web Audio. Se guarda como archivo nuevo en
 *   tu biblioteca (WebM de audio) y aparece en la lista de episodios.
 * - Todo local: el micrófono solo se usa mientras grabas; nada se sube.
 * - Límite honesto: la grabación es en WebM (Opus), no MP3; el episodio
 *   grabado vive en tu biblioteca como cualquier archivo importado.
 */

interface PodcastStudioProps {
  files: WorkstationFile[];
  onFileGenerated: (file: WorkstationFile) => void;
}

interface Episode {
  id: string;
  title: string;
  fileId?: string;
  url: string;
  duration?: number;
  recordedAt?: number;
}

export const PodcastStudio: React.FC<PodcastStudioProps> = ({ files, onFileGenerated }) => {
  const audioFiles = files.filter((f) => f.type === 'audio');
  const [episodes, setEpisodes] = useState<Episode[]>(() =>
    audioFiles.map((f) => ({ id: f.id, title: f.name, fileId: f.id, url: f.content || '' }))
  );
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  // Grabación
  const [recTitle, setRecTitle] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [bgMusicId, setBgMusicId] = useState('');
  const [bgVolume, setBgVolume] = useState(20);
  const [recStatus, setRecStatus] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sincronizar episodios con la biblioteca (sin borrar los grabados aquí)
  useEffect(() => {
    setEpisodes((prev) => {
      const recorded = prev.filter((e) => e.recordedAt);
      const fromLibrary = audioFiles.map((f) => ({ id: f.id, title: f.name, fileId: f.id, url: f.content || '' }));
      const seen = new Set<string>();
      const merged = [...recorded, ...fromLibrary].filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const current = episodes.find((e) => e.id === currentId) || null;

  const playEpisode = (ep: Episode) => {
    const a = audioRef.current;
    if (!a) return;
    if (currentId === ep.id && playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    a.src = ep.url;
    a.playbackRate = rate;
    a.play();
    setCurrentId(ep.id);
    setPlaying(true);
  };

  const skip = (sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + sec));
  };

  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecStatus('Este navegador no permite grabar voz. Prueba en Chrome o en el celular.');
      return;
    }
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const actx = new AudioContext();
      const micSrc = actx.createMediaStreamSource(micStream);
      const micGain = actx.createGain();
      micGain.gain.value = 1;
      const dest = actx.createMediaStreamDestination();
      micSrc.connect(micGain);
      micGain.connect(dest);

      let bgEl: HTMLAudioElement | null = null;
      if (bgMusicId) {
        const bgFile = audioFiles.find((f) => f.id === bgMusicId);
        if (bgFile?.content) {
          bgEl = new Audio(bgFile.content);
          bgEl.loop = true;
          bgEl.volume = bgVolume / 100;
          const bgSrc = actx.createMediaElementSource(bgEl);
          const bgGain = actx.createGain();
          bgGain.gain.value = bgVolume / 100;
          bgSrc.connect(bgGain);
          bgGain.connect(dest);
          bgAudioRef.current = bgEl;
          await bgEl.play();
        }
      }

      const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const title = recTitle.trim() || `Episodio ${new Date().toLocaleDateString('es-MX')}`;
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(blob);
        });
        const file: WorkstationFile = {
          id: `f-podcast-${Date.now()}`,
          name: `${title}.webm`,
          path: `/Podcast/${title}.webm`,
          size: blob.size,
          type: 'audio',
          extension: 'webm',
          mimeType: 'audio/webm',
          lastModified: Date.now(),
          content: dataUrl,
        };
        onFileGenerated(file);
        setEpisodes((prev) => [{ id: file.id, title: file.name, fileId: file.id, url, recordedAt: Date.now() }, ...prev]);
        setRecStatus(`Episodio guardado en tu biblioteca: ${file.name}.`);
        setRecTitle('');
        micStream.getTracks().forEach((t) => t.stop());
        if (bgEl) bgEl.pause();
        await actx.close();
      };
      recStreamRef.current = micStream;
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSeconds(0);
      setRecStatus('Grabando… habla con calma, la música de fondo queda bajita.');
      recTimerRef.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error(err);
      setRecStatus('No se pudo usar el micrófono. Revisa el permiso del navegador para este sitio.');
    }
  };

  const stopRecording = () => {
    if (recTimerRef.current) window.clearInterval(recTimerRef.current);
    setRecording(false);
    mediaRecorderRef.current?.stop();
    recStreamRef.current?.getTracks().forEach((t) => t.stop());
    bgAudioRef.current?.pause();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian-950 text-slate-100 p-4 md:p-8">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-gold-400" /> Podcast
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tus episodios de audio, en local. Escucha los de tu biblioteca y graba los tuyos con voz y música de fondo.
          </p>
        </div>

        {/* Reproductor */}
        <div className="bg-obsidian-900 border border-gold-500/30 rounded-2xl p-5">
          <p className="text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">Ahora suena</p>
          {current ? (
            <>
              <p className="text-base font-bold text-white truncate">{current.title}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
                {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '—'}
              </p>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const a = audioRef.current;
                  if (a) a.currentTime = Number(e.target.value);
                }}
                className="w-full accent-yellow-500 mt-3"
              />
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button onClick={() => skip(-15)} className="px-3 py-2 text-xs font-bold bg-obsidian-850 border border-obsidian-750 rounded-xl">−15 s</button>
                <button onClick={() => current && playEpisode(current)} className="px-5 py-2 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center gap-2">
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {playing ? 'Pausar' : 'Reproducir'}
                </button>
                <button onClick={() => skip(15)} className="px-3 py-2 text-xs font-bold bg-obsidian-850 border border-obsidian-750 rounded-xl">+15 s</button>
                <select
                  value={rate}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setRate(r);
                    if (audioRef.current) audioRef.current.playbackRate = r;
                  }}
                  className="bg-obsidian-850 border border-obsidian-750 rounded-xl px-2 py-2 text-xs"
                  title="Velocidad"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                    <option key={r} value={r}>{r}×</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">Velocidad</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Elige un episodio de la lista para escucharlo.</p>
          )}
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Lista de episodios */}
          <div className="md:col-span-3 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Episodios ({episodes.length})</h2>
            {episodes.length === 0 && (
              <p className="text-sm text-slate-400 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
                Aún no hay episodios. Importa un audio desde Archivos o graba tu primer episodio abajo.
              </p>
            )}
            {episodes.map((ep, i) => (
              <div key={ep.id} className={`flex items-center gap-3 bg-obsidian-900 border rounded-2xl p-3 ${currentId === ep.id ? 'border-gold-500/50' : 'border-obsidian-800'}`}>
                <button onClick={() => playEpisode(ep)} className="w-10 h-10 shrink-0 rounded-full bg-gold-500 text-obsidian-950 flex items-center justify-center" title={currentId === ep.id && playing ? 'Pausar' : 'Reproducir'}>
                  {currentId === ep.id && playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{i + 1}. {ep.title}</p>
                  <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {ep.recordedAt ? `Grabado aquí · ${new Date(ep.recordedAt).toLocaleDateString('es-MX')}` : 'De tu biblioteca'}
                  </p>
                </div>
                {ep.url && (
                  <a href={ep.url} download={ep.title} className="p-2 text-slate-400 hover:text-gold-300" title="Descargar episodio">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Grabar */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-4 h-4 text-gold-400" /> Grabar episodio
            </h2>
            <div className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4 space-y-3">
              <input
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                placeholder="Título del episodio…"
                className="w-full bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <label className="block text-xs text-slate-300">
                <span className="flex items-center gap-1.5 mb-1"><Volume2 className="w-4 h-4 text-gold-400" /> Música de fondo (opcional)</span>
                <select value={bgMusicId} onChange={(e) => setBgMusicId(e.target.value)} className="w-full bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs">
                  <option value="">Sin música de fondo</option>
                  {audioFiles.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
              {bgMusicId && (
                <label className="block text-xs text-slate-300">
                  <span className="flex justify-between"><span>Volumen de la música</span><span className="text-gold-300 font-mono">{bgVolume}%</span></span>
                  <input type="range" min={0} max={60} value={bgVolume} onChange={(e) => setBgVolume(Number(e.target.value))} className="w-full accent-yellow-500" />
                </label>
              )}
              {recording ? (
                <button onClick={stopRecording} className="w-full px-3 py-2.5 text-sm font-bold bg-rose-500 text-white rounded-xl flex items-center justify-center gap-2">
                  <Square className="w-4 h-4" /> Detener y guardar ({Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, '0')})
                </button>
              ) : (
                <button onClick={startRecording} className="w-full px-3 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center justify-center gap-2">
                  <Mic className="w-4 h-4" /> Empezar a grabar
                </button>
              )}
              {recStatus && <p className="text-xs text-slate-400">{recStatus}</p>}
              <p className="text-[11px] text-slate-500">
                El micrófono solo se usa mientras grabas. El episodio se guarda en WebM en tu biblioteca. Sin música de fondo, solo queda tu voz.
              </p>
            </div>

            <AdSlot slot="podcast-lateral" />
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Para agregar episodios, importa audios (MP3, WAV, OGG, WebM) con el botón Importar.
        </p>
      </div>
    </div>
  );
};
