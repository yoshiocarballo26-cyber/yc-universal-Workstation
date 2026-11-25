import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WorkstationFile } from '../types';
import {
  Upload, Download, Wand2, Eraser, Scissors, Type, Smile, Music,
  Play, Pause, Film, Image as ImgIcon, Sparkles, RefreshCcw, Trash2,
  Crop, Sun, Sliders, Check, X, Volume2, Clock, Layers,
} from 'lucide-react';
import { analyzeImage, suggestFilters, suggestTitle, checkAiBackend, requestAiTitle, ImageStats, FilterSuggestion } from '../services/aiAssist';

/**
 * Editor de fotos y video — todo local, sin subir nada.
 * Foto: filtros, ajustes (brillo/contraste/saturación/nitidez), fondos,
 * marcos/diseños, texto, stickers, recorte, quitar fondo (por color con
 * tolerancia y borde suave), mejora automática y exportar PNG.
 * Video: recorte de tramo, filtros, texto y stickers, exportar WebM
 * (grabación de la vista previa: SIN audio) o exportar el cuadro actual PNG.
 * Foto con música: varias fotos + audio local, tramo, volumen y duración,
 * exportar video corto WebM con audio.
 * La IA en la nube es OPCIONAL (ver services/aiAssist.ts): sin backend de
 * Vertex AI configurado, las sugerencias son análisis local y se etiquetan así.
 */

export type EditorMode = 'photo' | 'video' | 'music';
export interface EditorRequest {
  file: WorkstationFile;
  mode: EditorMode;
}

interface MediaEditorProps {
  files: WorkstationFile[];
  request?: EditorRequest | null;
  onRequestConsumed?: () => void;
}

interface Overlay {
  id: string;
  kind: 'sticker' | 'text';
  content: string;
  x: number; // 0..1
  y: number; // 0..1
  size: number; // px a 800px de ancho de lienzo
  color: string;
}

interface PhotoItem {
  url: string;
  name: string;
}

const FILTERS: Record<string, { label: string; css: string }> = {
  ninguno: { label: 'Sin filtro', css: '' },
  vivo: { label: 'Vivo', css: 'saturate(1.5) contrast(1.15)' },
  suave: { label: 'Suave', css: 'saturate(0.85) contrast(0.92) brightness(1.05)' },
  byn: { label: 'Blanco y negro', css: 'grayscale(1) contrast(1.1)' },
  sepia: { label: 'Sepia', css: 'sepia(0.7) contrast(1.05)' },
  calido: { label: 'Cálido', css: 'sepia(0.35) saturate(1.2) hue-rotate(-8deg)' },
  frio: { label: 'Frío', css: 'saturate(1.1) hue-rotate(18deg) brightness(1.03)' },
  vintage: { label: 'Vintage', css: 'sepia(0.45) contrast(0.9) brightness(1.08) saturate(0.8)' },
  neon: { label: 'Neón', css: 'saturate(2) contrast(1.25) brightness(1.05)' },
};

const BACKGROUNDS: { id: string; label: string; paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }[] = [
  { id: 'obsidiana', label: 'Obsidiana', paint: (ctx, w, h) => { ctx.fillStyle = '#060709'; ctx.fillRect(0, 0, w, h); } },
  { id: 'dorado', label: 'Dorado', paint: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#3a2f10'); g.addColorStop(1, '#0b0d11'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } },
  { id: 'atardecer', label: 'Atardecer', paint: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b0f1e'); g.addColorStop(0.6, '#7c2d12'); g.addColorStop(1, '#0b0d11'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } },
  { id: 'bosque', label: 'Bosque', paint: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b1f16'); g.addColorStop(1, '#060709'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } },
  { id: 'rosa', label: 'Rosa oscuro', paint: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2b0f2e'); g.addColorStop(1, '#060709'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); } },
];

const FRAMES: { id: string; label: string }[] = [
  { id: 'ninguno', label: 'Sin marco' },
  { id: 'dorado', label: 'Marco dorado' },
  { id: 'doble', label: 'Marco doble dorado' },
  { id: 'redondo', label: 'Esquinas redondas' },
  { id: 'polaroid', label: 'Polaroid oscura' },
];

const STICKERS = ['⭐', '🪐', '👑', '🔥', '💛', '❤️', '😎', '😂', '🎉', '🚀', '🌵', '🎵', '✨', '💯', '😍', '🤠'];

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const MediaEditor: React.FC<MediaEditorProps> = ({ files, request, onRequestConsumed }) => {
  const [mode, setMode] = useState<EditorMode>('photo');
  const [sourceName, setSourceName] = useState('');
  const [sourceKind, setSourceKind] = useState<'image' | 'video' | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // Ajustes y estilo
  const [filterId, setFilterId] = useState('ninguno');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [fit, setFit] = useState<'contain' | 'cover'>('contain');
  const [bgId, setBgId] = useState('obsidiana');
  const [frameId, setFrameId] = useState('ninguno');
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#fef08a');
  const [textSize, setTextSize] = useState(48);

  // Recorte (fracciones 0..1)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 });

  // Quitar fondo
  const [bgRemove, setBgRemove] = useState(false);
  const [tolerance, setTolerance] = useState(40);
  const [feather, setFeather] = useState(12);
  const [pickedColor, setPickedColor] = useState<string | null>(null);

  // Video
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Foto con música
  const [musicPhotos, setMusicPhotos] = useState<PhotoItem[]>([]);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicName, setMusicName] = useState('');
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicOffset, setMusicOffset] = useState(0);
  const [musicVolume, setMusicVolume] = useState(80);
  const [perPhotoSec, setPerPhotoSec] = useState(3);
  const [musicPlaying, setMusicPlaying] = useState(false);

  // IA / sugerencias locales
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [suggestions, setSuggestions] = useState<FilterSuggestion[]>([]);
  const [aiTitle, setAiTitle] = useState('');
  const [aiStatus, setAiStatus] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);
  const musicPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const processedRef = useRef<HTMLCanvasElement | null>(null); // imagen base procesada (recorte/fondo/mejora)
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const rafRef = useRef(0);
  const recordingRef = useRef(false);

  const filterCss = useCallback(() => {
    const parts: string[] = [];
    if (FILTERS[filterId]?.css) parts.push(FILTERS[filterId].css);
    if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
    if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
    return parts.join(' ');
  }, [filterId, brightness, contrast, saturation]);

  /** Dibuja la vista previa en el canvas (foto o cuadro de video). */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const bg = BACKGROUNDS.find((b) => b.id === bgId) || BACKGROUNDS[0];
    bg.paint(ctx, W, H);

    let src: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | null = null;
    if (mode === 'video' && videoRef.current && videoRef.current.readyState >= 2) {
      src = videoRef.current;
    } else if (processedRef.current) {
      src = processedRef.current;
    } else if (imgRef.current) {
      src = imgRef.current;
    }
    if (src) {
      const sw = (src as HTMLVideoElement).videoWidth || src.width;
      const sh = (src as HTMLVideoElement).videoHeight || src.height;
      if (sw > 0 && sh > 0) {
        const pad = frameId === 'polaroid' ? Math.round(W * 0.06) : 0;
        const availW = W - pad * 2;
        const availH = H - pad * 2 - (frameId === 'polaroid' ? Math.round(H * 0.1) : 0);
        const scale = fit === 'cover' ? Math.max(availW / sw, availH / sh) : Math.min(availW / sw, availH / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = pad + (availW - dw) / 2;
        const dy = pad + (availH - dh) / 2;
        ctx.save();
        if (frameId === 'redondo') {
          ctx.beginPath();
          ctx.roundRect(0, 0, W, H, 28);
          ctx.clip();
        }
        ctx.filter = filterCss();
        ctx.drawImage(src, dx, dy, dw, dh);
        ctx.restore();
        if (frameId === 'dorado' || frameId === 'doble') {
          ctx.strokeStyle = '#d4af37';
          ctx.lineWidth = frameId === 'doble' ? 10 : 5;
          ctx.strokeRect(6, 6, W - 12, H - 12);
          if (frameId === 'doble') {
            ctx.lineWidth = 2;
            ctx.strokeRect(18, 18, W - 36, H - 36);
          }
        }
        if (frameId === 'polaroid') {
          ctx.fillStyle = '#d4af37';
          ctx.font = `bold ${Math.round(W * 0.035)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(sourceName || 'YC', W / 2, H - pad * 0.6);
        }
      }
    } else {
      ctx.fillStyle = '#8b93a3';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Importa una foto o un video para empezar', W / 2, H / 2);
    }

    // Texto y stickers encima
    overlays.forEach((o) => {
      const x = o.x * W;
      const y = o.y * H;
      ctx.save();
      if (o.kind === 'text') {
        ctx.font = `bold ${Math.round((o.size / 800) * W)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(o.content, x, y);
        ctx.fillStyle = o.color;
        ctx.fillText(o.content, x, y);
      } else {
        ctx.font = `${Math.round((o.size / 800) * W)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.content, x, y);
      }
      if (selectedOverlay === o.id) {
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, (o.size / 800) * W * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [mode, bgId, fit, frameId, filterCss, overlays, selectedOverlay, sourceName]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Bucle de dibujo mientras el video suena
  useEffect(() => {
    if (!playing) return;
    const loop = () => {
      draw();
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        if (trimEnd > 0 && videoRef.current.currentTime >= trimEnd) {
          videoRef.current.pause();
          setPlaying(false);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw, trimEnd]);

  const loadImageUrl = useCallback((url: string, name: string) => {
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      processedRef.current = c;
      imgRef.current = img;
      setSourceName(name);
      setSourceKind('image');
      setOverlays([]);
      setCrop({ x: 0, y: 0, w: 1, h: 1 });
      setStatus(`Foto cargada: ${name} (${img.width}×${img.height}).`);
      const st = analyzeImage(img);
      setStats(st);
      setSuggestions(suggestFilters(st));
      setAiTitle(suggestTitle(st, name));
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 960;
        canvas.height = Math.max(540, Math.round((960 * img.height) / img.width));
      }
      draw();
    };
    img.onerror = () => setStatus('No se pudo cargar esa imagen.');
    img.src = url;
  }, [draw]);

  const loadVideoUrl = useCallback((url: string, name: string) => {
    const v = videoRef.current;
    if (!v) return;
    v.src = url;
    v.load();
    v.onloadedmetadata = () => {
      setVideoDuration(v.duration || 0);
      setTrimStart(0);
      setTrimEnd(v.duration || 0);
      setSourceName(name);
      setSourceKind('video');
      setOverlays([]);
      setStatus(`Video cargado: ${name} (${Math.round(v.duration || 0)} s).`);
      const canvas = canvasRef.current;
      if (canvas && v.videoWidth > 0) {
        canvas.width = 960;
        canvas.height = Math.max(540, Math.round((960 * v.videoHeight) / v.videoWidth));
      }
      v.currentTime = 0.01;
      draw();
    };
    v.onerror = () => setStatus('No se pudo cargar ese video. Prueba MP4 o WebM.');
  }, [draw]);

  const loadFile = useCallback((f: WorkstationFile) => {
    if (!f.content) {
      setStatus('Ese archivo no tiene datos para editar.');
      return;
    }
    if (f.type === 'image') {
      setMode('photo');
      loadImageUrl(f.content, f.name);
    } else if (f.type === 'video') {
      setMode('video');
      loadVideoUrl(f.content, f.name);
    } else {
      setStatus('El editor trabaja con fotos y videos. Elige uno de esos.');
    }
  }, [loadImageUrl, loadVideoUrl]);

  // Petición externa (agente asistente): abrir un archivo en el editor
  useEffect(() => {
    if (request) {
      setMode(request.mode);
      loadFile(request.file);
      onRequestConsumed?.();
    }
  }, [request, loadFile, onRequestConsumed]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (f.type.startsWith('image/')) {
      setMode('photo');
      loadImageUrl(url, f.name);
    } else if (f.type.startsWith('video/')) {
      setMode('video');
      loadVideoUrl(url, f.name);
    } else {
      setStatus('Elige una foto (JPG, PNG, WebP) o un video (MP4, WebM).');
    }
    e.target.value = '';
  };

  const handleLibraryPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = files.find((x) => x.id === e.target.value);
    if (f) loadFile(f);
    e.target.value = '';
  };

  // ---------- Mejora de foto ----------
  const applyAutoEnhance = () => {
    const c = processedRef.current;
    if (!c) return setStatus('Primero carga una foto.');
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    // Niveles automáticos por canal (percentiles 1 y 99)
    const hist: number[][] = [[], [], []];
    for (let i = 0; i < d.length; i += 16) {
      hist[0].push(d[i]);
      hist[1].push(d[i + 1]);
      hist[2].push(d[i + 2]);
    }
    const lo: number[] = [];
    const hi: number[] = [];
    hist.forEach((arr, ch) => {
      const s = [...arr].sort((a, b) => a - b);
      lo[ch] = s[Math.floor(s.length * 0.01)] ?? 0;
      hi[ch] = s[Math.floor(s.length * 0.99)] ?? 255;
    });
    for (let i = 0; i < d.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        const range = Math.max(1, hi[ch] - lo[ch]);
        d[i + ch] = Math.max(0, Math.min(255, ((d[i + ch] - lo[ch]) / range) * 255));
      }
    }
    ctx.putImageData(img, 0, 0);
    setStatus('Corrección automática aplicada: niveles y contraste equilibrados.');
    draw();
  };

  const applySharpen = (amount = 60) => {
    const c = processedRef.current;
    if (!c) return setStatus('Primero carga una foto.');
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const src = ctx.getImageData(0, 0, c.width, c.height);
    const out = ctx.createImageData(c.width, c.height);
    const w = c.width;
    const k = amount / 100;
    const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < w; x++) {
        for (let ch = 0; ch < 3; ch++) {
          let v = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = Math.min(w - 1, Math.max(0, x + kx));
              const py = Math.min(c.height - 1, Math.max(0, y + ky));
              v += src.data[(py * w + px) * 4 + ch] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          out.data[(y * w + x) * 4 + ch] = Math.max(0, Math.min(255, v));
        }
        out.data[(y * w + x) * 4 + 3] = src.data[(y * w + x) * 4 + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
    setStatus(`Nitidez aplicada (${amount}%).`);
    draw();
  };

  const applyCrop = () => {
    const c = processedRef.current;
    if (!c) return setStatus('Primero carga una foto.');
    if (crop.w >= 0.99 && crop.h >= 0.99 && crop.x === 0 && crop.y === 0) {
      return setStatus('El recorte está en toda la foto: mueve los controles primero.');
    }
    const sx = Math.round(crop.x * c.width);
    const sy = Math.round(crop.y * c.height);
    const sw = Math.round(crop.w * c.width);
    const sh = Math.round(crop.h * c.height);
    const next = document.createElement('canvas');
    next.width = sw;
    next.height = sh;
    const ctx = next.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
    processedRef.current = next;
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setStatus(`Recorte aplicado: ${sw}×${sh}.`);
    draw();
  };

  // ---------- Quitar fondo ----------
  const removeBackground = (seedX: number, seedY: number, useFlood: boolean) => {
    const c = processedRef.current;
    if (!c) return setStatus('Primero carga una foto.');
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const w = c.width;
    const h = c.height;
    const si = (Math.floor(seedY * h) * w + Math.floor(seedX * w)) * 4;
    const tr = d[si];
    const tg = d[si + 1];
    const tb = d[si + 2];
    setPickedColor(`#${[tr, tg, tb].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
    const dist = (i: number) =>
      Math.sqrt((d[i] - tr) ** 2 + (d[i + 1] - tg) ** 2 + (d[i + 2] - tb) ** 2);
    const alphaFor = (dd: number) => {
      if (dd <= tolerance) return 0;
      if (dd <= tolerance + feather) return Math.round(255 * ((dd - tolerance) / Math.max(1, feather)));
      return 255;
    };
    if (useFlood) {
      // Relleno por inundación desde el punto tocado (solo fondo conectado)
      const seen = new Uint8Array(w * h);
      const stack: number[] = [Math.floor(seedY * h) * w + Math.floor(seedX * w)];
      while (stack.length) {
        const p = stack.pop()!;
        if (seen[p]) continue;
        seen[p] = 1;
        const i = p * 4;
        if (d[i + 3] === 0) continue;
        const dd = dist(i);
        if (dd > tolerance + feather) continue;
        d[i + 3] = alphaFor(dd);
        const x = p % w;
        const y = Math.floor(p / w);
        if (x > 0) stack.push(p - 1);
        if (x < w - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - w);
        if (y < h - 1) stack.push(p + w);
      }
      setStatus('Fondo quitado (zona conectada al punto tocado). Toca "Exportar PNG" para guardarla con transparencia.');
    } else {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        d[i + 3] = alphaFor(dist(i));
      }
      setStatus('Fondo quitado por color en toda la foto. Exporta en PNG para conservar la transparencia.');
    }
    ctx.putImageData(img, 0, 0);
    draw();
  };

  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (bgRemove && mode === 'photo') {
      removeBackground(x, y, true);
      return;
    }
    // Arrastrar texto/sticker
    let best: Overlay | null = null;
    let bestD = 0.08;
    overlays.forEach((o) => {
      const dd = Math.hypot(o.x - x, o.y - y);
      if (dd < bestD) {
        bestD = dd;
        best = o;
      }
    });
    if (best) {
      setSelectedOverlay(best.id);
      dragRef.current = { id: best.id, dx: best.x - x, dy: best.y - y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } else {
      setSelectedOverlay(null);
    }
  };

  const onCanvasMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width + dragRef.current.dx;
    const y = (e.clientY - rect.top) / rect.height + dragRef.current.dy;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === dragRef.current!.id ? { ...o, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) } : o
      )
    );
  };

  const addSticker = (emoji: string) => {
    setOverlays((prev) => [...prev, { id: `o-${Date.now()}`, kind: 'sticker', content: emoji, x: 0.5, y: 0.5, size: 72, color: '#ffffff' }]);
  };

  const addText = () => {
    if (!textInput.trim()) return setStatus('Escribe el texto primero.');
    setOverlays((prev) => [...prev, { id: `o-${Date.now()}`, kind: 'text', content: textInput.trim(), x: 0.5, y: 0.35, size: textSize, color: textColor }]);
    setStatus('Texto agregado: arrástralo en la vista previa para moverlo.');
  };

  // ---------- Exportar ----------
  const exportPhotoPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !processedRef.current) return setStatus('Primero carga una foto.');
    draw();
    canvas.toBlob((blob) => {
      if (!blob) return setStatus('No se pudo exportar.');
      downloadBlob(blob, `${sourceName || 'foto-editada'}.png`);
      setStatus('Foto exportada en PNG.');
    }, 'image/png');
  };

  const exportFramePng = () => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'video') return setStatus('Esto es para video.');
    draw();
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${sourceName || 'cuadro'}.png`);
      setStatus('Cuadro exportado en PNG.');
    }, 'image/png');
  };

  const exportVideoWebm = async () => {
    const canvas = canvasRef.current;
    const v = videoRef.current;
    if (!canvas || !v || !sourceKind) return setStatus('Primero carga un video.');
    if (recordingRef.current) return;
    setBusy(true);
    setStatus('Grabando el tramo editado… no cierres esta vista.');
    try {
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const done = new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
      });
      v.currentTime = trimStart;
      await v.play();
      setPlaying(true);
      recordingRef.current = true;
      rec.start();
      const check = window.setInterval(() => {
        if (v.currentTime >= trimEnd || v.ended) {
          window.clearInterval(check);
          v.pause();
          setPlaying(false);
          recordingRef.current = false;
          if (rec.state !== 'inactive') rec.stop();
        }
      }, 100);
      await done;
      const blob = new Blob(chunks, { type: 'video/webm' });
      downloadBlob(blob, `${sourceName || 'video-editado'}.webm`);
      setStatus('Video exportado en WebM (sin audio: la grabación es solo imagen).');
    } catch (err) {
      setStatus('No se pudo exportar el video en este navegador.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Foto con música ----------
  const handleMusicPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    list.forEach((f) => {
      const url = URL.createObjectURL(f);
      setMusicPhotos((prev) => [...prev, { url, name: f.name }]);
    });
    e.target.value = '';
  };

  const addLibraryPhotoToMusic = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = files.find((x) => x.id === e.target.value);
    if (f && f.content) setMusicPhotos((prev) => [...prev, { url: f.content!, name: f.name }]);
    e.target.value = '';
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setMusicUrl(url);
    setMusicName(f.name);
    const a = musicAudioRef.current;
    if (a) {
      a.src = url;
      a.load();
      a.onloadedmetadata = () => setMusicDuration(a.duration || 0);
    }
    setStatus(`Música cargada: ${f.name}.`);
    e.target.value = '';
  };

  const exportMusicVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (musicPhotos.length === 0) return setStatus('Agrega al menos una foto.');
    if (!musicUrl) return setStatus('Agrega una canción (audio local).');
    const total = Math.min(60, musicPhotos.length * perPhotoSec);
    setBusy(true);
    setStatus(`Exportando video con música (${total} s)…`);
    try {
      const imgs: HTMLImageElement[] = [];
      for (const p of musicPhotos) {
        const img = new Image();
        img.src = p.url;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('foto'));
        });
        imgs.push(img);
      }
      const audioEl = new Audio(musicUrl);
      audioEl.volume = musicVolume / 100;
      audioEl.currentTime = Math.min(musicOffset, Math.max(0, (musicDuration || 0) - 1));
      const actx = new AudioContext();
      const srcNode = actx.createMediaElementSource(audioEl);
      const gain = actx.createGain();
      gain.gain.value = musicVolume / 100;
      const dest = actx.createMediaStreamDestination();
      srcNode.connect(gain);
      gain.connect(dest);
      const canvasStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      const rec = new MediaRecorder(combined, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const done = new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
      });
      const ctx = canvas.getContext('2d');
      const start = performance.now();
      rec.start();
      await audioEl.play();
      const tick = () => {
        const t = (performance.now() - start) / 1000;
        if (t >= total) return;
        const idx = Math.min(imgs.length - 1, Math.floor(t / perPhotoSec));
        const img = imgs[idx];
        if (ctx) {
          ctx.fillStyle = '#060709';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
        }
        requestAnimationFrame(tick);
      };
      tick();
      await new Promise((r) => window.setTimeout(r, total * 1000));
      audioEl.pause();
      if (rec.state !== 'inactive') rec.stop();
      await done;
      await actx.close();
      const blob = new Blob(chunks, { type: 'video/webm' });
      downloadBlob(blob, `foto-con-musica-${Date.now()}.webm`);
      setStatus('Video con música exportado en WebM.');
    } catch (err) {
      console.error(err);
      setStatus('No se pudo exportar el video con música. Revisa que la canción sea un audio válido.');
    } finally {
      setBusy(false);
    }
  };

  const libraryImages = files.filter((f) => f.type === 'image');
  const libraryVideos = files.filter((f) => f.type === 'video');
  const libraryAudio = files.filter((f) => f.type === 'audio');

  const slider = (label: string, value: number, min: number, max: number, onChange: (v: number) => void, suffix = '') => (
    <label className="block text-xs text-slate-300">
      <span className="flex justify-between"><span>{label}</span><span className="text-gold-300 font-mono">{value}{suffix}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-yellow-500" />
    </label>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-obsidian-950 text-slate-100">
      <video ref={videoRef} className="hidden" playsInline muted={false} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} />
      <audio ref={audioRef} className="hidden" />
      <audio ref={musicAudioRef} className="hidden" />

      {/* Panel de controles */}
      <div className="lg:w-[380px] shrink-0 overflow-y-auto bg-obsidian-900 border-b lg:border-b-0 lg:border-r border-obsidian-800 p-4 space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-400" /> Editor de fotos y video
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Todo se hace en tu dispositivo. Nada se sube a ningún servidor.
          </p>
        </div>

        {/* Modos */}
        <div className="grid grid-cols-3 gap-1 bg-obsidian-850 border border-obsidian-750 rounded-xl p-1">
          {([
            { id: 'photo', label: 'Foto', icon: <ImgIcon className="w-4 h-4" /> },
            { id: 'video', label: 'Video', icon: <Film className="w-4 h-4" /> },
            { id: 'music', label: 'Foto + música', icon: <Music className="w-4 h-4" /> },
          ] as const).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition ${mode === m.id ? 'bg-gold-500 text-obsidian-950' : 'text-slate-300 hover:bg-obsidian-800'}`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Origen */}
        {mode !== 'music' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider">1 · Elige foto o video</h3>
            <input type="file" ref={fileInputRef} accept="image/*,video/*" onChange={handleUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full px-3 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> Subir desde el dispositivo
            </button>
            <select onChange={handleLibraryPick} defaultValue="" className="w-full bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">…o elegir de tu biblioteca</option>
              {[...libraryImages, ...libraryVideos].map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {sourceName && <p className="text-xs text-slate-400 font-mono truncate">Trabajando: {sourceName}</p>}
          </section>
        )}

        {/* Ajustes */}
        {mode !== 'music' && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider">2 · Filtros y ajustes</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(FILTERS).map(([id, f]) => (
                <button key={id} onClick={() => setFilterId(id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${filterId === id ? 'bg-gold-500 text-obsidian-950 border-gold-500' : 'bg-obsidian-850 text-slate-300 border-obsidian-750 hover:border-gold-500/40'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {slider('Brillo', brightness, 50, 180, setBrightness, '%')}
            {slider('Contraste', contrast, 50, 200, setContrast, '%')}
            {slider('Saturación', saturation, 0, 200, setSaturation, '%')}
            <div className="flex gap-2">
              <button onClick={applyAutoEnhance} className="flex-1 px-3 py-2 text-xs font-bold bg-gold-500/20 text-gold-300 border border-gold-500/40 rounded-xl flex items-center justify-center gap-1.5">
                <Sun className="w-4 h-4" /> Corrección automática
              </button>
              <button onClick={() => applySharpen(60)} className="flex-1 px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl flex items-center justify-center gap-1.5">
                <Sliders className="w-4 h-4" /> Nitidez
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Consejo: la corrección automática equilibra niveles y contraste de la foto real (análisis local, sin nube).
            </p>
          </section>
        )}

        {/* Fondo, marco y diseño (foto y video) */}
        {mode !== 'music' && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider">3 · Fondo, marco y diseño</h3>
            <div>
              <p className="text-xs text-slate-400 mb-1">Fondo (se ve con ajuste "Dentro")</p>
              <div className="flex flex-wrap gap-1.5">
                {BACKGROUNDS.map((b) => (
                  <button key={b.id} onClick={() => setBgId(b.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${bgId === b.id ? 'bg-gold-500 text-obsidian-950 border-gold-500' : 'bg-obsidian-850 text-slate-300 border-obsidian-750'}`}>{b.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Marco</p>
              <div className="flex flex-wrap gap-1.5">
                {FRAMES.map((f) => (
                  <button key={f.id} onClick={() => setFrameId(f.id)} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${frameId === f.id ? 'bg-gold-500 text-obsidian-950 border-gold-500' : 'bg-obsidian-850 text-slate-300 border-obsidian-750'}`}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {(['contain', 'cover'] as const).map((v) => (
                <button key={v} onClick={() => setFit(v)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border ${fit === v ? 'bg-gold-500 text-obsidian-950 border-gold-500' : 'bg-obsidian-850 text-slate-300 border-obsidian-750'}`}>
                  {v === 'contain' ? 'Dentro (con fondo)' : 'Llenar (sin fondo)'}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recorte */}
        {mode === 'photo' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Crop className="w-4 h-4" /> Recorte</h3>
            {slider('Izquierda', Math.round(crop.x * 100), 0, 80, (v) => setCrop((c) => ({ ...c, x: v / 100 })), '%')}
            {slider('Arriba', Math.round(crop.y * 100), 0, 80, (v) => setCrop((c) => ({ ...c, y: v / 100 })), '%')}
            {slider('Ancho', Math.round(crop.w * 100), 10, 100, (v) => setCrop((c) => ({ ...c, w: v / 100 })), '%')}
            {slider('Alto', Math.round(crop.h * 100), 10, 100, (v) => setCrop((c) => ({ ...c, h: v / 100 })), '%')}
            <button onClick={applyCrop} className="w-full px-3 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl">Aplicar recorte</button>
          </section>
        )}

        {/* Quitar fondo */}
        {mode === 'photo' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Eraser className="w-4 h-4" /> Quitar fondo</h3>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={bgRemove} onChange={(e) => setBgRemove(e.target.checked)} className="accent-yellow-500" />
              Activar: toca el fondo en la vista previa para quitarlo
            </label>
            {slider('Tolerancia', tolerance, 5, 120, setTolerance)}
            {slider('Borde suave', feather, 0, 60, setFeather)}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (pickedColor) {
                    // Quitar por color en toda la foto, usando el último color tocado
                    const c = processedRef.current;
                    if (!c) return;
                    const ctx = c.getContext('2d');
                    if (!ctx) return;
                    const img = ctx.getImageData(0, 0, c.width, c.height);
                    const d = img.data;
                    const r = parseInt(pickedColor.slice(1, 3), 16);
                    const g = parseInt(pickedColor.slice(3, 5), 16);
                    const b = parseInt(pickedColor.slice(5, 7), 16);
                    for (let i = 0; i < d.length; i += 4) {
                      const dd = Math.sqrt((d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2);
                      if (dd <= tolerance) d[i + 3] = 0;
                      else if (dd <= tolerance + feather) d[i + 3] = Math.round(255 * ((dd - tolerance) / Math.max(1, feather)));
                    }
                    ctx.putImageData(img, 0, 0);
                    draw();
                    setStatus('Fondo quitado por color en toda la foto.');
                  } else {
                    setStatus('Primero toca el fondo en la foto (con "Activar" encendido) para elegir el color.');
                  }
                }}
                className="flex-1 px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl"
              >
                Quitar ese color en toda la foto
              </button>
            </div>
            {pickedColor && (
              <p className="text-xs text-slate-400 flex items-center gap-2">
                Color elegido: <span className="inline-block w-4 h-4 rounded border border-slate-500" style={{ background: pickedColor }} /> <span className="font-mono">{pickedColor}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              Local, sin subir la foto. Funciona mejor con fondos de un solo color. Exporta en PNG para conservar la transparencia.
            </p>
          </section>
        )}

        {/* Texto y stickers */}
        {mode !== 'music' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Type className="w-4 h-4" /> Texto y stickers</h3>
            <div className="flex gap-2">
              <input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Escribe un texto…" className="flex-1 min-w-0 bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500" />
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-9 h-9 bg-obsidian-850 border border-obsidian-750 rounded-xl cursor-pointer" title="Color del texto" />
            </div>
            {slider('Tamaño del texto', textSize, 20, 120, setTextSize, ' px')}
            <button onClick={addText} className="w-full px-3 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl">Agregar texto</button>
            <div className="flex flex-wrap gap-1.5">
              {STICKERS.map((s) => (
                <button key={s} onClick={() => addSticker(s)} className="w-9 h-9 text-xl bg-obsidian-850 border border-obsidian-750 rounded-xl hover:border-gold-500/50" title="Agregar sticker">{s}</button>
              ))}
            </div>
            {selectedOverlay && (
              <button onClick={() => { setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlay)); setSelectedOverlay(null); }} className="w-full px-3 py-2 text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-xl flex items-center justify-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Quitar lo seleccionado
              </button>
            )}
            <p className="text-[11px] text-slate-500">Arrastra el texto o el sticker sobre la vista previa para moverlo. Tócalo para seleccionarlo.</p>
          </section>
        )}

        {/* Video: tramo */}
        {mode === 'video' && sourceKind === 'video' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Scissors className="w-4 h-4" /> Recortar el video</h3>
            <p className="text-xs text-slate-400 font-mono">Duración: {videoDuration.toFixed(1)} s · Ahora: {currentTime.toFixed(1)} s</p>
            {slider('Inicio del tramo', Math.round(trimStart), 0, Math.max(0, Math.round(videoDuration) - 1), (v) => setTrimStart(Math.min(v, trimEnd - 1)), ' s')}
            {slider('Fin del tramo', Math.round(trimEnd), 1, Math.round(videoDuration), (v) => setTrimEnd(Math.max(v, trimStart + 1)), ' s')}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (playing) {
                    v.pause();
                    setPlaying(false);
                  } else {
                    if (v.currentTime < trimStart || v.currentTime >= trimEnd) v.currentTime = trimStart;
                    v.play();
                    setPlaying(true);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center justify-center gap-1.5"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {playing ? 'Pausar' : 'Reproducir tramo'}
              </button>
            </div>
          </section>
        )}

        {/* Foto con música */}
        {mode === 'music' && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Music className="w-4 h-4" /> Foto con música</h3>
            <input type="file" ref={musicPhotoInputRef} accept="image/*" multiple onChange={handleMusicPhotoUpload} className="hidden" />
            <button onClick={() => musicPhotoInputRef.current?.click()} className="w-full px-3 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> Agregar fotos
            </button>
            <select onChange={addLibraryPhotoToMusic} defaultValue="" className="w-full bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="">…o agregar foto de tu biblioteca</option>
              {libraryImages.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {musicPhotos.length > 0 && (
              <ul className="space-y-1">
                {musicPhotos.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs bg-obsidian-850 border border-obsidian-750 rounded-lg px-2 py-1.5">
                    <span className="truncate">{i + 1}. {p.name}</span>
                    <button onClick={() => setMusicPhotos((prev) => prev.filter((_, j) => j !== i))} className="text-rose-400 shrink-0"><X className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <input type="file" ref={musicFileInputRef} accept="audio/*" onChange={handleMusicUpload} className="hidden" />
            <button onClick={() => musicFileInputRef.current?.click()} className="w-full px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4" /> {musicName ? `Canción: ${musicName}` : 'Elegir canción (audio local)'}
            </button>
            <select
              onChange={(e) => {
                const f = libraryAudio.find((x) => x.id === e.target.value);
                if (f && f.content) {
                  setMusicUrl(f.content);
                  setMusicName(f.name);
                  const a = musicAudioRef.current;
                  if (a) {
                    a.src = f.content;
                    a.load();
                    a.onloadedmetadata = () => setMusicDuration(a.duration || 0);
                  }
                }
                e.target.value = '';
              }}
              defaultValue=""
              className="w-full bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-200"
            >
              <option value="">…o elegir audio de tu biblioteca</option>
              {libraryAudio.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {slider('Segundos por foto', perPhotoSec, 1, 10, setPerPhotoSec, ' s')}
            {slider('Volumen', musicVolume, 0, 100, setMusicVolume, '%')}
            {musicDuration > 0 && slider('La canción empieza en', Math.round(musicOffset), 0, Math.max(0, Math.round(musicDuration) - 1), setMusicOffset, ' s')}
            <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gold-400" /> Duración total: {Math.min(60, musicPhotos.length * perPhotoSec)} s (máx. 60 s)
            </p>
            <button
              onClick={() => {
                const a = musicAudioRef.current;
                if (!a || !musicUrl) return setStatus('Primero elige una canción.');
                if (musicPlaying) {
                  a.pause();
                  setMusicPlaying(false);
                } else {
                  a.volume = musicVolume / 100;
                  a.currentTime = musicOffset;
                  a.play();
                  setMusicPlaying(true);
                }
              }}
              className="w-full px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl flex items-center justify-center gap-1.5"
            >
              {musicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {musicPlaying ? 'Pausar música' : 'Escuchar música'}
            </button>
          </section>
        )}

        {/* IA / sugerencias */}
        {mode !== 'music' && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Wand2 className="w-4 h-4" /> Asistencia</h3>
            {stats ? (
              <div className="text-xs text-slate-300 bg-obsidian-850 border border-obsidian-750 rounded-xl p-3 space-y-1">
                <p className="font-mono">Brillo {stats.brightness}% · Saturación {stats.saturation}% · Contraste {stats.contrast}%</p>
                <p className="flex items-center gap-2">Color dominante: <span className="inline-block w-4 h-4 rounded border border-slate-500" style={{ background: stats.dominant }} /> <span className="font-mono">{stats.dominant}</span></p>
                {suggestions.map((s) => (
                  <button key={s.preset + s.reason} onClick={() => { setFilterId(s.preset); setStatus(`Filtro sugerido aplicado: ${FILTERS[s.preset]?.label || s.preset}.`); }} className="block w-full text-left mt-1 px-2 py-1.5 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-200 hover:bg-gold-500/20">
                    Sugerencia local: {s.reason} <span className="underline">Aplicar</span>
                  </button>
                ))}
                {aiTitle && <p className="pt-1">Título sugerido (local): <strong className="text-white">{aiTitle}</strong></p>}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Carga una foto para ver el análisis local y las sugerencias.</p>
            )}
            <button
              onClick={async () => {
                setAiStatus('Comprobando…');
                const r = await requestAiTitle(sourceName);
                setAiStatus(r.text);
              }}
              className="w-full px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl"
            >
              Título con IA (Vertex AI, opcional)
            </button>
            {aiStatus && <p className="text-xs text-slate-400">{aiStatus}</p>}
            <button
              onClick={async () => {
                const c = await checkAiBackend();
                setAiStatus((c.reachable ? 'Backend de IA: responde. ' : 'Backend de IA: no responde. ') + c.detail);
              }}
              className="text-xs text-gold-300 underline"
            >
              Comprobar si hay backend de IA en este equipo
            </button>
            <p className="text-[11px] text-slate-500">
              Las sugerencias de arriba son análisis local en tu dispositivo, no IA en la nube. La IA real necesita el backend de Vertex AI corriendo con credenciales de Google Cloud (no viene en la app).
            </p>
          </section>
        )}

        {/* Exportar */}
        <section className="space-y-2 pb-2">
          <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5"><Download className="w-4 h-4" /> Exportar</h3>
          {mode === 'photo' && (
            <button onClick={exportPhotoPng} disabled={busy || !processedRef.current} className="w-full px-3 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl disabled:opacity-40">
              Exportar foto en PNG
            </button>
          )}
          {mode === 'video' && (
            <>
              <button onClick={exportVideoWebm} disabled={busy || sourceKind !== 'video'} className="w-full px-3 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl disabled:opacity-40">
                Exportar video editado (WebM)
              </button>
              <button onClick={exportFramePng} disabled={busy || sourceKind !== 'video'} className="w-full px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl">
                Exportar el cuadro actual en PNG
              </button>
              <p className="text-[11px] text-slate-500">El video exportado es una grabación de la vista previa y sale sin audio. El tramo exportado es el que marcaste arriba.</p>
            </>
          )}
          {mode === 'music' && (
            <button onClick={exportMusicVideo} disabled={busy} className="w-full px-3 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl disabled:opacity-40">
              Exportar video con música (WebM)
            </button>
          )}
          <button
            onClick={() => {
              setFilterId('ninguno');
              setBrightness(100);
              setContrast(100);
              setSaturation(100);
              setFrameId('ninguno');
              setBgId('obsidiana');
              setOverlays([]);
              setStatus('Ajustes restablecidos (la foto original no se tocó).');
              draw();
            }}
            className="w-full px-3 py-2 text-xs font-bold bg-obsidian-850 text-slate-200 border border-obsidian-750 rounded-xl flex items-center justify-center gap-1.5"
          >
            <RefreshCcw className="w-4 h-4" /> Restablecer ajustes
          </button>
        </section>
      </div>

      {/* Vista previa */}
      <div className="flex-1 overflow-auto bg-obsidian-950 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-gold-400" /> Vista previa
              {sourceName && <span className="text-xs text-slate-400 font-mono font-normal truncate max-w-[220px]">{sourceName}</span>}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {mode === 'photo' ? 'Toca el fondo para quitarlo (si está activado) · arrastra texto/stickers' : mode === 'video' ? 'El video se ve en el lienzo, con filtros y stickers' : 'Las fotos se ven una tras otra con tu música'}
            </span>
          </div>
          <div className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-3 shadow-xl">
            <canvas
              ref={canvasRef}
              width={960}
              height={600}
              className="w-full rounded-xl bg-obsidian-950 cursor-crosshair touch-none"
              onPointerDown={onCanvasPointer}
              onPointerMove={onCanvasMove}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerLeave={() => { dragRef.current = null; }}
            />
          </div>
          {status && (
            <p className="mt-3 text-xs font-mono px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-200 flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" /> {status}
            </p>
          )}
          {mode === 'music' && musicPhotos.length > 0 && (
            <p className="mt-3 text-xs text-slate-400">
              {musicPhotos.length} foto(s) · {Math.min(60, musicPhotos.length * perPhotoSec)} s de video · {musicName || 'sin canción todavía'}.
              La vista previa del pase de fotos se ve al exportar; escucha la canción con el botón de arriba.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
