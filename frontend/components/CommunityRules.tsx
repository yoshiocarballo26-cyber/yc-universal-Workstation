import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

/**
 * Reglas de la comunidad YC — compartidas por el chat y los comentarios.
 * Se aceptan al entrar al chat (y valen también para comentarios).
 * La aceptación se guarda solo en este dispositivo (localStorage).
 */

export const COMMUNITY_RULES = [
  {
    title: 'Respeto ante todo',
    text: 'Trata a todos como quieres que te traten. Sin acoso, sin discriminación, sin burlas.',
  },
  {
    title: 'Sin insultos ni groserías',
    text: 'No se permiten insultos, groserías ni lenguaje ofensivo. Los mensajes con groserías no se publican.',
  },
  {
    title: 'Sin spam',
    text: 'Sin publicidad no autorizada, sin enlaces de estafas, sin repetir el mismo mensaje.',
  },
  {
    title: 'Sin contenido para adultos',
    text: 'Nada de contenido sexual, violento ni para adultos. La comunidad es para todos.',
  },
  {
    title: 'Sin datos privados',
    text: 'No compartas teléfonos, direcciones, claves ni datos privados tuyos ni de otros.',
  },
  {
    title: 'Habla de crear',
    text: 'Es una comunidad de creadores: Workstation, música, fotos, video y 3D. Mantén la conversación ahí.',
  },
];

export const COMMUNITY_CONSEQUENCES = [
  '1ª vez: aviso y se borra el mensaje.',
  '2ª vez: silencio temporal en la sala (no puedes escribir por un tiempo).',
  '3ª vez o falta grave: expulsión de la comunidad.',
  'Reportar un mensaje lo oculta en tu dispositivo y lo marca para moderación.',
];

const ACCEPT_KEY = 'yc-community-rules-accepted';

export function rulesAccepted(): boolean {
  try {
    return localStorage.getItem(ACCEPT_KEY) === '1';
  } catch {
    return false;
  }
}

export function useRulesAccepted(): [boolean, () => void] {
  const [accepted, setAccepted] = useState<boolean>(() => rulesAccepted());
  const accept = () => {
    try {
      localStorage.setItem(ACCEPT_KEY, '1');
    } catch {
      // Sin almacenamiento, la aceptación solo dura esta sesión.
    }
    setAccepted(true);
  };
  useEffect(() => {
    setAccepted(rulesAccepted());
  }, []);
  return [accepted, accept];
}

export const RulesModal: React.FC<{ onAccept: () => void; onClose?: () => void }> = ({ onAccept, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-obsidian-900 border border-gold-500/40 rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold-400" /> Reglas de la comunidad YC
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">Para escribir en el chat y en comentarios, acepta estas reglas.</p>
      <ol className="mt-4 space-y-3">
        {COMMUNITY_RULES.map((r, i) => (
          <li key={r.title} className="flex gap-3 text-sm">
            <span className="w-6 h-6 shrink-0 rounded-full bg-gold-500 text-obsidian-950 text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <span>
              <strong className="text-white">{r.title}.</strong> <span className="text-slate-300">{r.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider mt-4 mb-1">Consecuencias</h3>
      <ul className="space-y-1">
        {COMMUNITY_CONSEQUENCES.map((c) => (
          <li key={c} className="text-xs text-slate-300 flex gap-2">
            <span className="text-gold-400">•</span> {c}
          </li>
        ))}
      </ul>
      <button onClick={onAccept} className="w-full mt-5 px-4 py-2.5 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl">
        Acepto las reglas
      </button>
    </div>
  </div>
);
