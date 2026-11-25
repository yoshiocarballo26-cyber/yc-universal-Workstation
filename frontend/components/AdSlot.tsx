import React from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { getAdForSlot, getRateForSlot, AdSlotId } from '../services/adConfig';

/**
 * Espacio publicitario reutilizable.
 * - Sin anuncio configurado: marcador claro "Espacio publicitario — Tu anuncio aquí".
 * - Con anuncio: solo título, texto y enlace local. Sin rastreadores.
 */
export const AdSlot: React.FC<{ slot: AdSlotId; className?: string }> = ({ slot, className }) => {
  const ad = getAdForSlot(slot);
  return (
    <div
      className={`rounded-2xl border border-dashed border-gold-500/40 bg-obsidian-900/70 p-4 ${className || ''}`}
      aria-label="Espacio publicitario"
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        <Megaphone className="w-3.5 h-3.5 text-gold-400" /> Espacio publicitario
      </p>
      {ad ? (
        <div className="mt-2">
          <p className="text-sm font-bold text-white">{ad.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{ad.text}</p>
          {ad.link && (
            <a
              href={ad.link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
            >
              {ad.cta || 'Ver más'} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 mt-2">
          Tu anuncio aquí. Este espacio está disponible para anunciantes de la comunidad YC.
          {getRateForSlot(slot) && (
            <span className="block mt-1 text-gold-300 font-mono">Precio inicial propuesto: {getRateForSlot(slot)} (venta directa).</span>
          )}
        </p>
      )}
    </div>
  );
};
