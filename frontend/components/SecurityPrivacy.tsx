import React, { useState } from 'react';
import { ShieldCheck, Lock, EyeOff, Flag, FileWarning } from 'lucide-react';
import { COMMUNITY_RULES, COMMUNITY_CONSEQUENCES, RulesModal } from './CommunityRules';

/**
 * Seguridad y privacidad — apartado visible para los usuarios.
 *
 * Qué está protegido:
 * - Tus archivos se quedan en tu dispositivo (localStorage / sesión). La app
 *   no los sube a ningún servidor.
 * - Firestore cerrado por defecto: `firestore.rules` niega lectura y
 *   escritura (`allow read, write: if false`). Ninguna función de la app
 *   usa la nube hoy.
 * - Sin secretos ni claves en el frontend: no hay apiKey, contraseñas ni
 *   tokens en el código de la app. La única "clave" es el marcador
 *   `api-key-not-used` de la plantilla, que no es una clave real.
 * - Sin rastreadores externos por defecto: los anuncios son locales y no
 *   cargan scripts ni píxeles de terceros.
 * - Chat y comentarios: moderación básica (filtro de groserías, límites de
 *   tiempo y tamaño, reportar oculta el mensaje) y reglas de comunidad
 *   que se aceptan al entrar.
 *
 * Qué sigue pendiente (para Yoshio, no para los usuarios):
 * - Rotar los valores de `backend/.env.local` ANTES de subir el parche, y
 *   sacarlo del seguimiento de git (`git rm --cached backend/.env.local`).
 *   Ese archivo está en el repo público y puede contener secretos.
 * - Limpiar el historial de git si se quiere borrar del todo.
 * - El chat en vivo y los comentarios compartidos necesitan Firestore con
 *   reglas por colección y moderación en servidor (hoy son locales).
 */
export const SecurityPrivacy: React.FC = () => {
  const [showRules, setShowRules] = useState(false);

  const items = [
    {
      icon: <Lock className="w-5 h-5" />,
      title: 'Tus archivos se quedan contigo',
      text: 'Todo lo que importas, creas o editas vive en tu dispositivo. La Workstation no sube tus archivos a ningún servidor.',
    },
    {
      icon: <EyeOff className="w-5 h-5" />,
      title: 'Sin rastreadores',
      text: 'La app no usa rastreadores de terceros. Los espacios de anuncios son locales y no cargan scripts ni píxeles externos.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: 'Nube cerrada por defecto',
      text: 'Firestore está cerrado (nadie puede leer ni escribir en la nube desde la app) hasta que una función lo necesite de verdad.',
    },
    {
      icon: <Flag className="w-5 h-5" />,
      title: 'Reportar y moderar',
      text: 'En el chat y en comentarios puedes reportar cualquier mensaje: se oculta en tu dispositivo y queda marcado para moderación.',
    },
    {
      icon: <FileWarning className="w-5 h-5" />,
      title: 'Sin cuentas obligatorias',
      text: 'Leer comentarios y el chat no pide cuenta. Para escribir solo se pide un apodo (opcional) y aceptar las reglas de la comunidad.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-gold-400" /> Seguridad y privacidad
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cómo protegemos tus archivos y tu privacidad en la Workstation.
          </p>
        </div>

        {items.map((item) => (
          <div key={item.title} className="flex gap-4 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
            <span className="p-2.5 bg-gold-500/10 border border-gold-500/30 rounded-xl text-gold-400 shrink-0 h-fit">
              {item.icon}
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">{item.title}</h2>
              <p className="text-sm text-slate-300 mt-0.5">{item.text}</p>
            </div>
          </div>
        ))}

        <div className="bg-obsidian-900 border border-gold-500/30 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">Reglas de la comunidad</h2>
            <button onClick={() => setShowRules(true)} className="px-3 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl">
              Ver las reglas
            </button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {COMMUNITY_RULES.map((r) => (
              <li key={r.title} className="text-xs text-slate-300 flex gap-2">
                <span className="text-gold-400">•</span>
                <span><strong className="text-white">{r.title}:</strong> {r.text}</span>
              </li>
            ))}
          </ul>
          <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider mt-3 mb-1">Consecuencias</h3>
          <ul className="space-y-1">
            {COMMUNITY_CONSEQUENCES.map((c) => (
              <li key={c} className="text-xs text-slate-300 flex gap-2">
                <span className="text-gold-400">•</span> {c}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-slate-500 text-center font-mono">
          Si encuentras algo que no te cuadre en seguridad, repórtalo en el chat o en comentarios.
        </p>
      </div>
      {showRules && <RulesModal onAccept={() => setShowRules(false)} onClose={() => setShowRules(false)} />}
    </div>
  );
};
