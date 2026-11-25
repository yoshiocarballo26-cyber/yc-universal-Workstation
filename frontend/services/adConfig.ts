/**
 * Espacios de anuncios — configuración LOCAL, sin rastreadores externos.
 *
 * Para poner un anuncio real, agrega una entrada a ADS con slot, título,
 * texto y enlace. No se inventa ningún anunciante: los espacios sin
 * configurar muestran el marcador "Tu anuncio aquí" y NO cargan nada de
 * fuera (sin scripts, sin píxeles de seguimiento, sin imágenes externas).
 * Los anuncios configurados son solo título/texto/enlace locales; si algún
 * día se agrega una imagen, debe vivir en `public/` del repo, nunca en un
 * servidor de terceros.
 *
 * Slots disponibles:
 * - 'inicio-banner'   : banner grande al final de la pantalla Inicio.
 * - 'podcast-lateral' : tarjeta en la sección Podcast.
 * - 'editor-pie'      : franja al pie del Editor de fotos y video.
 */
export interface AdItem {
  slot: AdSlotId;
  title: string;
  text: string;
  cta?: string;
  link?: string;
}

export type AdSlotId = 'inicio-banner' | 'podcast-lateral' | 'editor-pie';

export const AD_SLOTS: AdSlotId[] = ['inicio-banner', 'podcast-lateral', 'editor-pie'];

/** Sin anunciantes configurados: todos los espacios muestran su marcador. */
export const ADS: AdItem[] = [
  // Ejemplo (NO activo: es solo para copiar y rellenar con un anunciante real):
  // {
  //   slot: 'inicio-banner',
  //   title: 'Nombre del negocio',
  //   text: 'Descripción corta del anuncio.',
  //   cta: 'Ver más',
  //   link: 'https://ejemplo.com',
  // },
];

export function getAdForSlot(slot: AdSlotId): AdItem | null {
  return ADS.find((a) => a.slot === slot) || null;
}

/**
 * Tarifas iniciales de los espacios — PROPUESTO (Yoshio puede cambiarlas).
 * Venta directa, pago directo al negocio, sin AdSense al inicio.
 * - Banner en pantalla principal (inicio-banner): $300 MXN/mes.
 * - Banner dentro del editor (editor-pie): $200 MXN/mes.
 * - Mención en podcast (podcast-lateral): $500 MXN por episodio.
 * Estos precios son solo referencia configurable; no hay anunciantes
 * contratados ni ventas hechas.
 */
export const AD_RATES: { slot: AdSlotId; label: string; price: string }[] = [
  { slot: 'inicio-banner', label: 'Banner en pantalla principal', price: '$300 MXN/mes' },
  { slot: 'editor-pie', label: 'Banner dentro del editor', price: '$200 MXN/mes' },
  { slot: 'podcast-lateral', label: 'Mención en podcast', price: '$500 MXN por episodio' },
];

export function getRateForSlot(slot: AdSlotId): string | null {
  return AD_RATES.find((r) => r.slot === slot)?.price || null;
}
