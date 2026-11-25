import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, Star, Flag, Trash2, ShieldCheck } from 'lucide-react';
import { COMMUNITY_RULES, useRulesAccepted, RulesModal } from './CommunityRules';

/**
 * Comentarios — opiniones sobre la app y su contenido.
 *
 * DÓNDE SE GUARDAN (léelo antes de usarlo):
 * - LOCAL, en este dispositivo (localStorage, clave `yc-comments`).
 *   No hay cuenta obligatoria para leerlos ni para escribirlos.
 * - NO se comparten entre dispositivos ni entre usuarios: lo que escribes
 *   aquí solo se ve en este navegador. Para comentarios compartidos haría
 *   falta Firebase/Firestore con reglas y moderación de verdad; eso es
 *   FUTURO y no está implementado (la app hoy no tiene Firebase conectado
 *   en el frontend y sus reglas están cerradas por defecto).
 * - NO se pide ni se guarda ningún dato privado: solo apodo (opcional),
 *   texto y estrellas. Sin correo, sin cuenta, sin ubicación.
 *
 * MODERACIÓN BÁSICA (local):
 * - Filtro de palabras groseras comunes (lista corta en este archivo): si el
 *   texto las trae, no se publica y se avisa.
 * - Límite de 500 caracteres y un comentario cada 10 segundos.
 * - "Reportar" oculta el comentario en este dispositivo.
 * - Cada quien puede borrar sus propios comentarios (viven en su dispositivo).
 */

interface CommentItem {
  id: string;
  author: string;
  text: string;
  stars: number;
  about: string;
  createdAt: number;
  reported?: boolean;
}

const STORAGE_KEY = 'yc-comments';
const BAD_WORDS = ['pendejo', 'puta', 'puto', 'mierda', 'culero', 'chinga', 'verga', 'cabron', 'cabrón', 'idiota', 'estupido', 'estúpido'];

const ABOUT_OPTIONS = ['La app en general', 'Editor de fotos y video', 'Podcast', 'Música online', 'Navegador / Buscar', 'Reproductor', 'Documentos'];

function loadComments(): CommentItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export const Comments: React.FC = () => {
  const [comments, setComments] = useState<CommentItem[]>(() => loadComments());
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [stars, setStars] = useState(5);
  const [about, setAbout] = useState(ABOUT_OPTIONS[0]);
  const [notice, setNotice] = useState('');
  const [lastSent, setLastSent] = useState(0);
  const [rulesAccepted, acceptRules] = useRulesAccepted();
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }, [comments]);

  const visible = [...comments].filter((c) => !c.reported).sort((a, b) => b.createdAt - a.createdAt);
  const avg = visible.length ? (visible.reduce((s, c) => s + c.stars, 0) / visible.length).toFixed(1) : null;

  const publish = () => {
    if (!rulesAccepted) {
      setShowRules(true);
      return setNotice('Primero acepta las reglas de la comunidad para poder publicar.');
    }
    const clean = text.trim();
    if (clean.length < 3) return setNotice('Escribe un comentario de al menos 3 caracteres.');
    if (clean.length > 500) return setNotice('El comentario no puede pasar de 500 caracteres.');
    if (Date.now() - lastSent < 10000) return setNotice('Espera unos segundos antes de publicar otro comentario.');
    const low = clean.toLowerCase();
    if (BAD_WORDS.some((w) => low.includes(w))) {
      return setNotice('Tu comentario tiene palabras que no se permiten aquí. Edítalo y vuelve a intentar.');
    }
    const item: CommentItem = {
      id: `c-${Date.now()}`,
      author: author.trim() || 'Anónimo',
      text: clean,
      stars,
      about,
      createdAt: Date.now(),
    };
    setComments((prev) => [item, ...prev]);
    setText('');
    setLastSent(Date.now());
    setNotice('Comentario publicado en este dispositivo. Gracias por tu opinión.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-gold-400" /> Comentarios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ¿Qué te parece la Workstation? Deja tu opinión. Se lee sin cuenta y se guarda solo en este dispositivo.
          </p>
          {avg && (
            <p className="text-sm text-gold-300 mt-2 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-current" /> {avg} de 5 · {visible.length} comentario(s) en este dispositivo
            </p>
          )}
        </div>

        {/* Escribir */}
        <div className="bg-obsidian-900 border border-gold-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tu apodo (opcional)"
              maxLength={30}
              className="flex-1 min-w-[140px] bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
            />
            <select value={about} onChange={(e) => setAbout(e.target.value)} className="bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-200">
              {ABOUT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <div className="flex items-center gap-1" title="Calificación">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setStars(n)} className="p-0.5" title={`${n} estrella(s)`}>
                  <Star className={`w-5 h-5 ${n <= stars ? 'text-gold-400 fill-current' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe tu comentario… (máx. 500 caracteres)"
            maxLength={500}
            rows={3}
            className="w-full bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 resize-y"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-mono">{text.length}/500</span>
            <button onClick={publish} className="px-4 py-2 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-xl flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Publicar
            </button>
          </div>
          {notice && <p className="text-xs font-mono px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-200">{notice}</p>}
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
            Moderación básica: sin groserías, sin enlaces de spam. Reportar oculta el comentario en este dispositivo. Los comentarios son locales: no se comparten con otros usuarios todavía.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => setShowRules(true)} className="text-xs text-gold-300 underline">
              Ver las reglas de la comunidad
            </button>
            {rulesAccepted ? (
              <span className="text-[11px] text-emerald-400 font-mono">✓ Reglas aceptadas</span>
            ) : (
              <span className="text-[11px] text-gold-300 font-mono">Falta aceptar las reglas para publicar</span>
            )}
          </div>
          {showRules && <RulesModal onAccept={() => { acceptRules(); setShowRules(false); }} onClose={() => setShowRules(false)} />}
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {visible.length === 0 && (
            <p className="text-sm text-slate-500 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
              Aún no hay comentarios en este dispositivo. Sé el primero en dejar uno.
            </p>
          )}
          {visible.map((c) => (
            <article key={c.id} className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">
                  {c.author}{' '}
                  <span className="text-[11px] font-normal text-slate-500">
                    · {c.about} · {new Date(c.createdAt).toLocaleDateString('es-MX')} {new Date(c.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <span className="flex items-center gap-0.5" title={`${c.stars} de 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= c.stars ? 'text-gold-400 fill-current' : 'text-slate-600'}`} />
                  ))}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap break-words">{c.text}</p>
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, reported: true } : x)))}
                  className="text-[11px] text-slate-500 hover:text-gold-300 flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" /> Reportar
                </button>
                <button
                  onClick={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                  className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
