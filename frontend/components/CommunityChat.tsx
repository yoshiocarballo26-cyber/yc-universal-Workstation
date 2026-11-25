import React, { useEffect, useRef, useState } from 'react';
import { MessagesSquare, Send, Flag, ShieldCheck, Users, Radio } from 'lucide-react';
import { COMMUNITY_RULES, COMMUNITY_CONSEQUENCES, useRulesAccepted, RulesModal } from './CommunityRules';

/**
 * Chat de comunidad — sala general.
 *
 * DÓNDE SE GUARDAN LOS MENSAJES (léelo antes de usarlo):
 * - LOCAL, en este dispositivo (localStorage, clave `yc-community-chat`).
 *   Se lee sin cuenta. No hay usuarios reales conectados.
 * - NO es en vivo: lo que escribes aquí solo se ve en este navegador.
 *   No hay nadie más en la sala hasta conectar Firebase.
 *
 * QUÉ FALTA PARA QUE FUNCIONE EN VIVO (pendiente, no inventado):
 * 1. Firestore en el proyecto `yc-universal` con una colección `chat`
 *    (hoy la app no tiene Firebase conectado en el frontend).
 * 2. Reglas de Firestore que permitan leer a todos y escribir con límites
 *    (nunca reglas abiertas del todo).
 * 3. Auth anónima de Firebase (opcional, para identificar sin cuenta real).
 * 4. Moderación en servidor (borrado por moderador, bloqueo) — hoy la
 *    moderación es solo local: filtro de groserías, límite de mensajes y
 *    "Reportar" que oculta el mensaje en este dispositivo.
 * 5. Presencia ("quién está en línea") y notificaciones.
 * Sin eso, este chat es una sala local de prueba, y así se dice en pantalla.
 */

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  reported?: boolean;
  mine?: boolean;
}

const STORAGE_KEY = 'yc-community-chat';
const BAD_WORDS = ['pendejo', 'puta', 'puto', 'mierda', 'culero', 'chinga', 'verga', 'cabron', 'cabrón', 'idiota', 'estupido', 'estúpido'];

const RULES = COMMUNITY_RULES.map((r) => `${r.title}: ${r.text}`);

function loadMessages(): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export const CommunityChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const [nick, setNick] = useState(() => localStorage.getItem('yc-chat-nick') || '');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const [rulesAccepted, acceptRules] = useRulesAccepted();
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const visible = messages.filter((m) => !m.reported);

  const send = () => {
    if (!rulesAccepted) {
      setNotice('Primero acepta las reglas de la comunidad para poder escribir.');
      return;
    }
    const clean = text.trim();
    if (clean.length < 1) return;
    if (clean.length > 300) return setNotice('El mensaje no puede pasar de 300 caracteres.');
    if (Date.now() - lastSent < 5000) return setNotice('Espera unos segundos antes de enviar otro mensaje.');
    const low = clean.toLowerCase();
    if (BAD_WORDS.some((w) => low.includes(w))) {
      return setNotice('Tu mensaje tiene palabras que no se permiten en la sala. Edítalo y vuelve a intentar.');
    }
    if (/https?:\/\//i.test(clean) && !/yc-suite\.web\.app|github\.com/i.test(clean)) {
      return setNotice('Por seguridad, los enlaces externos no se permiten en el chat (solo yc-suite y GitHub).');
    }
    const name = nick.trim() || 'Anónimo';
    localStorage.setItem('yc-chat-nick', name);
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, author: name, text: clean, createdAt: Date.now(), mine: true }]);
    setText('');
    setLastSent(Date.now());
    setNotice('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-obsidian-950 text-slate-100">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col overflow-hidden p-4 md:p-6 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MessagesSquare className="w-6 h-6 text-gold-400" /> Chat de la comunidad
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gold-400" /> Sala general · se lee sin cuenta
            </p>
          </div>
          <button onClick={() => setShowRules((v) => !v)} className="px-3 py-2 text-xs font-bold bg-obsidian-900 border border-gold-500/30 text-gold-300 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Reglas de la sala
          </button>
        </div>

        {/* Aviso honesto: no es en vivo todavía */}
        <div className="shrink-0 px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-xs text-gold-200 flex items-start gap-2">
          <Radio className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Sala local (no en vivo todavía).</strong> Tus mensajes solo se ven en este dispositivo.
            Para que la comunidad hable en vivo falta conectar Firebase (Firestore + reglas + moderación).
            Nadie más está conectado ahora: no hay usuarios simulados.
          </span>
        </div>

        {showRules && (
          <div className="shrink-0 bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white mb-2">Reglas de la sala</h2>
            <ol className="space-y-1.5">
              {RULES.map((r, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-gold-500 text-obsidian-950 text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ol>
            <h3 className="text-xs font-bold text-gold-400 uppercase tracking-wider mt-3 mb-1">Consecuencias</h3>
            <ul className="space-y-1">
              {COMMUNITY_CONSEQUENCES.map((c) => (
                <li key={c} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-gold-400">•</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Aceptación de reglas al entrar */}
        {!rulesAccepted && <RulesModal onAccept={acceptRules} />}

        {/* Mensajes */}
        <div ref={listRef} className="flex-1 overflow-y-auto bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4 space-y-3 min-h-[200px]">
          {visible.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              La sala está vacía en este dispositivo. Escribe el primer mensaje y saluda a la comunidad.
            </p>
          )}
          {visible.map((m) => (
            <div key={m.id} className={`max-w-[85%] ${m.mine ? 'ml-auto text-right' : ''}`}>
              <p className={`text-[11px] font-mono ${m.mine ? 'text-gold-300' : 'text-slate-500'}`}>
                {m.author} · {new Date(m.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className={`inline-block px-3 py-2 rounded-2xl text-sm text-left mt-0.5 ${m.mine ? 'bg-gold-500 text-obsidian-950 font-semibold' : 'bg-obsidian-800 text-slate-200 border border-obsidian-750'}`}>
                {m.text}
              </div>
              <div className="mt-1">
                <button
                  onClick={() => setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reported: true } : x)))}
                  className="text-[11px] text-slate-500 hover:text-gold-300 inline-flex items-center gap-1"
                >
                  <Flag className="w-3 h-3" /> Reportar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Escribir */}
        <div className="shrink-0 space-y-2">
          <div className="flex gap-2">
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Tu apodo (opcional)"
              maxLength={30}
              className="w-40 bg-obsidian-900 border border-obsidian-750 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500"
            />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="Escribe en la sala general…"
              maxLength={300}
              className="flex-1 min-w-0 bg-obsidian-900 border border-obsidian-750 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button onClick={send} className="px-4 py-2.5 bg-gold-500 text-obsidian-950 rounded-xl font-bold" title="Enviar mensaje">
              <Send className="w-4 h-4" />
            </button>
          </div>
          {notice && <p className="text-xs font-mono px-3 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-200">{notice}</p>}
          <p className="text-[11px] text-slate-500 text-center">
            Sin cuenta para leer. Sin datos privados: solo apodo y mensaje. Máx. 300 caracteres por mensaje.
          </p>
        </div>
      </div>
    </div>
  );
};
