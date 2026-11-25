/**
 * Asistencia para el editor — TODO local, sin subir nada a ningún servidor.
 *
 * Qué es real y qué no (léelo antes de usarlo):
 * - "Sugerencias locales": análisis REAL de la foto en este dispositivo
 *   (brillo, saturación, temperatura de color, histograma). No es un modelo
 *   de IA: son reglas sobre números medidos de la imagen. Se etiquetan así
 *   en la pantalla para no engañar a nadie.
 * - "Título con IA (Vertex AI)": OPCIONAL y PENDIENTE. El repo trae un
 *   backend proxy de Vertex AI (`backend/server.js`) y un interceptor en el
 *   frontend, pero NINGÚN componente lo usa hoy, el backend no corre en
 *   GitHub Pages (solo archivos estáticos) y necesita credenciales de
 *   Google Cloud que no están en la app. `checkAiBackend()` solo comprueba
 *   si el backend responde en este equipo; `requestAiTitle()` no inventa
 *   ninguna clave ni llama a ningún servicio: devuelve "no configurado"
 *   salvo que el backend esté activo y el usuario lo haya configurado.
 *   Sin backend, el editor funciona completo sin IA en la nube.
 */

export interface ImageStats {
  brightness: number; // 0-100
  saturation: number; // 0-100 (estimada)
  warmth: number; // -100 (frío) .. +100 (cálido)
  contrast: number; // 0-100 (desviación estándar del brillo)
  dominant: string; // color dominante en hex
}

export interface FilterSuggestion {
  preset: string;
  reason: string;
}

/** Analiza una imagen ya cargada en un canvas (muestra de hasta 200x200 px). */
export function analyzeImage(img: HTMLImageElement | HTMLCanvasElement): ImageStats {
  const w = 200;
  const h = 200;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return { brightness: 50, saturation: 50, warmth: 0, contrast: 50, dominant: '#d4af37' };
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  let sumSq = 0;
  let satSum = 0;
  let warmSum = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += lum;
    sumSq += lum * lum;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    satSum += max === 0 ? 0 : (max - min) / max;
    warmSum += r - b;
    rSum += r;
    gSum += g;
    bSum += b;
  }
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return {
    brightness: Math.round((mean / 255) * 100),
    saturation: Math.round((satSum / n) * 100),
    warmth: Math.round(Math.max(-100, Math.min(100, (warmSum / n / 255) * 100))),
    contrast: Math.round(Math.min(100, (Math.sqrt(variance) / 128) * 100)),
    dominant: `#${toHex(rSum / n)}${toHex(gSum / n)}${toHex(bSum / n)}`,
  };
}

/** Sugerencias de filtro a partir de las medidas reales de la foto. */
export function suggestFilters(stats: ImageStats): FilterSuggestion[] {
  const out: FilterSuggestion[] = [];
  if (stats.brightness < 38) {
    out.push({ preset: 'vivo', reason: `Foto oscura (brillo ${stats.brightness}%). "Vivo" la aclara y le da color.` });
  }
  if (stats.brightness > 72) {
    out.push({ preset: 'suave', reason: `Foto muy clara (brillo ${stats.brightness}%). "Suave" baja el contraste para no quemar blancos.` });
  }
  if (stats.saturation < 28) {
    out.push({ preset: 'vivo', reason: `Poco color (saturación ${stats.saturation}%). "Vivo" sube la saturación.` });
  }
  if (stats.saturation > 65) {
    out.push({ preset: 'suave', reason: `Color muy fuerte (saturación ${stats.saturation}%). "Suave" lo calma.` });
  }
  if (stats.warmth > 25) {
    out.push({ preset: 'frio', reason: `Tono cálido (${stats.warmth}). "Frío" equilibra hacia azul.` });
  }
  if (stats.warmth < -25) {
    out.push({ preset: 'calido', reason: `Tono frío (${stats.warmth}). "Cálido" equilibra hacia dorado.` });
  }
  if (stats.contrast < 30) {
    out.push({ preset: 'vivo', reason: `Poco contraste (${stats.contrast}%). "Vivo" le da fuerza.` });
  }
  if (out.length === 0) {
    out.push({ preset: 'ninguno', reason: `La foto ya está equilibrada (brillo ${stats.brightness}%, contraste ${stats.contrast}%). No necesita filtro.` });
  }
  return out.slice(0, 3);
}

/** Título automático LOCAL (plantilla con datos reales de la foto, no es IA). */
export function suggestTitle(stats: ImageStats, fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const mood =
    stats.brightness < 38 ? 'en la penumbra' : stats.brightness > 72 ? 'a plena luz' : 'con luz suave';
  const tone = stats.warmth > 25 ? 'cálida' : stats.warmth < -25 ? 'fría' : 'equilibrada';
  return `${base ? base : 'Mi foto'} — ${mood}, tono ${tone}`;
}

/** Comprueba si el backend de IA responde en este equipo (sin enviar nada). */
export async function checkAiBackend(timeoutMs = 3000): Promise<{ reachable: boolean; detail: string }> {
  try {
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
    await fetch('/api-proxy', { method: 'GET', signal: ctrl.signal });
    window.clearTimeout(t);
    return {
      reachable: true,
      detail: 'El backend responde, pero eso no basta: falta configurar el proyecto de Google Cloud y sus credenciales en el equipo donde corre.',
    };
  } catch {
    return {
      reachable: false,
      detail: 'Sin backend de IA en este equipo. Es normal en GitHub Pages: ahí solo se sirven archivos estáticos y el backend no corre.',
    };
  }
}

/** Título con IA real: NO disponible sin backend configurado. No inventa claves. */
export async function requestAiTitle(_fileName: string): Promise<{ ok: boolean; text: string }> {
  const check = await checkAiBackend();
  if (!check.reachable) {
    return {
      ok: false,
      text: 'IA en la nube no configurada. ' + check.detail + ' Mientras tanto, usa el título sugerido local (sin IA).',
    };
  }
  return {
    ok: false,
    text: 'El backend responde, pero la IA aún no está conectada en el editor: falta el proyecto de Google Cloud, la clave y el modelo. No se envió nada.',
  };
}
