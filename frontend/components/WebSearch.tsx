import React, { useEffect, useMemo, useState } from 'react';
import { WorkstationFile } from '../types';
import {
  Search, ExternalLink, FolderSearch, Globe, Clock, X, Plus, Star,
  ArrowLeft, ArrowRight, RotateCw, Home, Bookmark, ChevronDown,
} from 'lucide-react';

/**
 * Navegador integrado — diseño UX/UI de navegador real, dentro de lo que
 * una app web puede hacer sin claves de pago.
 *
 * DECISIONES UX/UI (documentadas, no inventadas):
 * - Pestañas: varias búsquedas a la vez, cada una con su propio historial
 *   de navegación (atrás/adelante), como en Chrome. Se guardan en este
 *   dispositivo (localStorage) y se recuperan al volver.
 * - Omnibox: una sola barra arriba que entiende URL y búsqueda. Si escribes
 *   una dirección (ej. yc-suite.web.app) abre esa página; si escribes
 *   palabras, busca con el motor elegido.
 * - Atrás / Adelante / Recargar: funcionan sobre el historial de la pestaña
 *   activa. "Inicio" vuelve a la página de inicio del navegador (sugerencias).
 * - Favoritos: estrella en la barra para guardar la página actual; lista de
 *   favoritos local, sin cuenta.
 * - Historial: todo lo abierto queda en historial local, con borrar.
 * - Móvil: barra de pestañas con scroll horizontal, controles grandes,
 *   todo táctil; escritorio: misma barra, más ancha.
 *
 * LÍMITE HONESTO: los motores y casi todos los sitios bloquean que otra
 * página los meta dentro de un marco (X-Frame-Options / CSP) y bloquean
 * leer sus resultados (CORS) sin una clave de API de pago. Por eso las
 * páginas se ABREN en una pestaña nueva del navegador del sistema, y la
 * Workstation guarda la pestaña, el historial y los favoritos. La app no
 * agrega rastreadores: solo construye la URL y la abre.
 * Lo que SÍ funciona dentro de la app, sin internet: buscar en tu biblioteca
 * y abrir tus archivos directamente.
 */

const ENGINES: { id: string; label: string; url: (q: string) => string }[] = [
  { id: 'duckduckgo', label: 'DuckDuckGo (privado)', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  { id: 'google', label: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: 'bing', label: 'Bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { id: 'youtube', label: 'YouTube', url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  { id: 'github', label: 'GitHub', url: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories` },
];

const SUGGESTIONS = [
  'YC Editor 3D',
  'cómo exportar STL para imprimir en 3D',
  'música boom bap 80 bpm',
  'Feria de las Carnitas Tacámbaro',
  'cómo quitar el fondo de una foto',
];

const QUICK_LINKS = [
  { label: 'YC Editor 3D', url: 'https://yc-suite.web.app' },
  { label: 'YC Universal (Firebase)', url: 'https://yc-universal.web.app' },
  { label: 'AURA-ID', url: 'https://aura-id-33652.web.app' },
];

interface BrowserTab {
  id: string;
  title: string;
  entries: string[]; // URLs ya abiertas en esta pestaña
  index: number; // posición actual en entries
  engineId: string;
}

interface Favorite {
  title: string;
  url: string;
}

function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return true;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(t) && !/\s/.test(t)) return true;
  return false;
}

function normalizeUrl(text: string): string {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function titleFor(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname.slice(0, 24) : '');
  } catch {
    return url.slice(0, 28);
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface WebSearchProps {
  files: WorkstationFile[];
  onOpenFile: (file: WorkstationFile) => void;
}

export const WebSearch: React.FC<WebSearchProps> = ({ files, onOpenFile }) => {
  const [tabs, setTabs] = useState<BrowserTab[]>(() =>
    load<BrowserTab[]>('yc-browser-tabs', [
      { id: `tab-${Date.now()}`, title: 'Nueva pestaña', entries: [], index: -1, engineId: 'duckduckgo' },
    ])
  );
  const [activeId, setActiveId] = useState<string>(() => tabs[0]?.id || '');
  const [omnibox, setOmnibox] = useState('');
  const [history, setHistory] = useState<string[]>(() => load<string[]>('yc-search-history', []));
  const [favorites, setFavorites] = useState<Favorite[]>(() => load<Favorite[]>('yc-browser-favorites', []));
  const [showHistory, setShowHistory] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeId) || tabs[0];
  const currentUrl = activeTab && activeTab.index >= 0 ? activeTab.entries[activeTab.index] : '';
  const canBack = !!activeTab && activeTab.index > 0;
  const canForward = !!activeTab && activeTab.index < activeTab.entries.length - 1;
  const isFavorite = !!currentUrl && favorites.some((f) => f.url === currentUrl);

  useEffect(() => {
    localStorage.setItem('yc-browser-tabs', JSON.stringify(tabs));
  }, [tabs]);
  useEffect(() => {
    localStorage.setItem('yc-search-history', JSON.stringify(history.slice(0, 50)));
  }, [history]);
  useEffect(() => {
    localStorage.setItem('yc-browser-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    setOmnibox(currentUrl || '');
  }, [currentUrl, activeId]);

  const localResults = useMemo(() => {
    const q = omnibox.trim();
    if (!q || looksLikeUrl(q)) return [];
    return files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  }, [omnibox, files]);

  const openUrl = (url: string, tabId?: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setHistory((prev) => [url, ...prev.filter((h) => h !== url)].slice(0, 50));
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== (tabId || activeId)) return t;
        const entries = [...t.entries.slice(0, t.index + 1), url];
        return { ...t, entries, index: entries.length - 1, title: titleFor(url) };
      })
    );
  };

  const navigate = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const engine = ENGINES.find((e) => e.id === activeTab.engineId) || ENGINES[0];
    const url = looksLikeUrl(clean) ? normalizeUrl(clean) : engine.url(clean);
    openUrl(url);
  };

  const newTab = () => {
    const tab: BrowserTab = { id: `tab-${Date.now()}`, title: 'Nueva pestaña', entries: [], index: -1, engineId: activeTab?.engineId || 'duckduckgo' };
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    setOmnibox('');
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId) setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const goBack = () => {
    if (!canBack || !activeTab) return;
    const url = activeTab.entries[activeTab.index - 1];
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, index: t.index - 1, title: titleFor(url) } : t)));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const goForward = () => {
    if (!canForward || !activeTab) return;
    const url = activeTab.entries[activeTab.index + 1];
    setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? { ...t, index: t.index + 1, title: titleFor(url) } : t)));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const reload = () => {
    if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleFavorite = () => {
    if (!currentUrl) return;
    if (isFavorite) {
      setFavorites((prev) => prev.filter((f) => f.url !== currentUrl));
    } else {
      setFavorites((prev) => [{ title: titleFor(currentUrl), url: currentUrl }, ...prev]);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-obsidian-950 text-slate-100">
      {/* Barra de pestañas */}
      <div className="flex items-center gap-1 px-2 pt-2 bg-obsidian-900 border-b border-obsidian-800 overflow-x-auto no-scrollbar shrink-0">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-semibold cursor-pointer whitespace-nowrap border-b-2 transition ${t.id === activeId ? 'bg-obsidian-950 text-gold-300 border-gold-500' : 'bg-obsidian-850 text-slate-400 border-transparent hover:text-white'}`}
            title={t.title}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[140px] truncate">{t.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
              className="p-0.5 rounded hover:bg-obsidian-700 text-slate-500 hover:text-rose-400"
              title="Cerrar pestaña"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={newTab} className="p-2 rounded-lg text-slate-400 hover:text-gold-300 hover:bg-obsidian-850 shrink-0" title="Nueva pestaña">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de navegación: atrás / adelante / recargar / omnibox / favorito / historial */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-obsidian-950 border-b border-obsidian-800 shrink-0 flex-wrap">
        <button onClick={goBack} disabled={!canBack} className="p-2 rounded-lg text-slate-300 hover:bg-obsidian-850 disabled:opacity-30" title="Atrás">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={goForward} disabled={!canForward} className="p-2 rounded-lg text-slate-300 hover:bg-obsidian-850 disabled:opacity-30" title="Adelante">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={reload} disabled={!currentUrl} className="p-2 rounded-lg text-slate-300 hover:bg-obsidian-850 disabled:opacity-30" title="Recargar">
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setOmnibox('');
            setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, title: 'Nueva pestaña' } : t)));
          }}
          className="p-2 rounded-lg text-slate-300 hover:bg-obsidian-850"
          title="Inicio del navegador"
        >
          <Home className="w-4 h-4" />
        </button>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={omnibox}
            onChange={(e) => setOmnibox(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(omnibox);
            }}
            placeholder="Busca o escribe una dirección web…"
            className="w-full bg-obsidian-900 border border-obsidian-750 focus:border-gold-500/60 rounded-full pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            aria-label="Barra de dirección y búsqueda"
          />
        </div>
        <button onClick={() => navigate(omnibox)} className="px-4 py-2 text-sm font-bold bg-gold-500 text-obsidian-950 rounded-full shrink-0">
          Ir
        </button>
        <button onClick={toggleFavorite} disabled={!currentUrl} className={`p-2 rounded-lg hover:bg-obsidian-850 disabled:opacity-30 ${isFavorite ? 'text-gold-400' : 'text-slate-300'}`} title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}>
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        <button onClick={() => setShowHistory((v) => !v)} className="p-2 rounded-lg text-slate-300 hover:bg-obsidian-850 flex items-center gap-1" title="Historial">
          <Clock className="w-4 h-4" />
          <ChevronDown className={`w-3 h-3 transition ${showHistory ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Motor de búsqueda */}
      <div className="flex items-center gap-2 px-3 py-2 bg-obsidian-950 border-b border-obsidian-800 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-xs text-slate-400 shrink-0">Motor:</span>
        {ENGINES.map((e) => (
          <button
            key={e.id}
            onClick={() => setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, engineId: e.id } : t)))}
            className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${activeTab?.engineId === e.id ? 'bg-gold-500 text-obsidian-950 border-gold-500' : 'bg-obsidian-900 text-slate-300 border-obsidian-750'}`}
          >
            {e.label}
          </button>
        ))}
        <span className="text-[11px] text-slate-500 ml-auto shrink-0 hidden md:block">
          Los resultados se abren en una pestaña nueva del navegador.
        </span>
      </div>

      {/* Contenido: inicio / historial / resultados locales */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {showHistory && (
            <div className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-400" /> Historial (solo en tu dispositivo)
                </h2>
                <button onClick={() => setHistory([])} className="text-xs text-rose-400 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Borrar historial
                </button>
              </div>
              {history.length === 0 && <p className="text-xs text-slate-500">Aún no has abierto nada.</p>}
              {history.map((h) => (
                <button key={h} onClick={() => openUrl(h)} className="block w-full text-left text-xs text-slate-300 hover:text-gold-300 py-1.5 truncate">
                  {titleFor(h)} — <span className="text-slate-500 font-mono">{h}</span>
                </button>
              ))}
            </div>
          )}

          {favorites.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <Bookmark className="w-4 h-4 text-gold-400" /> Favoritos
              </h2>
              <div className="flex flex-wrap gap-2">
                {favorites.map((f) => (
                  <button key={f.url} onClick={() => openUrl(f.url)} className="px-3 py-2 rounded-xl text-xs font-bold bg-obsidian-900 border border-gold-500/30 text-gold-300 hover:bg-gold-500/15 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" /> {f.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resultados locales en la biblioteca */}
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <FolderSearch className="w-4 h-4 text-gold-400" /> En tu biblioteca ({localResults.length})
            </h2>
            {omnibox.trim() === '' && (
              <>
                <p className="text-sm text-slate-500 mb-3">Escribe en la barra de arriba para buscar entre tus archivos, o usa un acceso rápido:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK_LINKS.map((l) => (
                    <button key={l.url} onClick={() => openUrl(l.url)} className="px-3 py-2 rounded-xl text-xs font-bold bg-obsidian-900 border border-obsidian-800 text-slate-200 hover:border-gold-500/40 flex items-center gap-1.5">
                      {l.label} <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
                    </button>
                  ))}
                </div>
                <h3 className="text-xs font-bold text-slate-400 mb-2">Sugerencias de búsqueda</h3>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => navigate(s)} className="px-2.5 py-1.5 rounded-lg text-xs bg-obsidian-900 border border-obsidian-800 text-slate-300 hover:border-gold-500/40">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {omnibox.trim() !== '' && !looksLikeUrl(omnibox) && localResults.length === 0 && (
              <p className="text-sm text-slate-500">Nada en tu biblioteca coincide con «{omnibox.trim()}». Pulsa Ir para buscarlo en la web.</p>
            )}
            {localResults.map((f) => (
              <button
                key={f.id}
                onClick={() => onOpenFile(f)}
                className="w-full text-left flex items-center justify-between gap-3 bg-obsidian-900 border border-obsidian-800 hover:border-gold-500/40 rounded-2xl p-3 mb-2 transition"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white truncate">{f.name}</span>
                  <span className="block text-[11px] text-slate-500 font-mono">{f.type} · {f.extension.toUpperCase()}</span>
                </span>
                <span className="text-gold-300 text-xs font-bold shrink-0">Abrir →</span>
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Sin rastreadores extra: la app solo construye la dirección y la abre. Tu historial y favoritos viven solo en tu dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
};
