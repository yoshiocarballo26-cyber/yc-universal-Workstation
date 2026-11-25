import React, { useMemo, useRef, useState } from 'react';
import { WorkstationFile, ModuleCategory } from '../types';
import { EditorMode } from './MediaEditor';
import { Bot, Send, X, Sparkles, Wand2, Scissors, FileText, Disc, BookOpen, Mic } from 'lucide-react';

/**
 * Agente asistente dentro de la Workstation.
 * - Explica las herramientas, guía paso a paso y sugiere qué hacer con el
 *   archivo abierto (foto, video, documento, audio).
 * - Ejecuta acciones simples dentro de la app: navegar a un módulo, abrir
 *   el editor con el archivo actual, abrir las guías o el podcast.
 * - Respuestas LOCALES por reglas (palabras clave + tipo de archivo).
 *   No es IA en la nube y así se dice en el panel: si algún día se conecta
 *   Vertex AI (backend + credenciales, ver services/aiAssist.ts), el agente
 *   podrá usarlo; hoy todo funciona sin clave y sin internet.
 */

interface AgentPanelProps {
  open: boolean;
  onClose: () => void;
  activeFile: WorkstationFile | null;
  onNavigate: (module: ModuleCategory) => void;
  onOpenEditor: (file: WorkstationFile, mode: EditorMode) => void;
  onImportClick: () => void;
}

interface Msg {
  from: 'agent' | 'user';
  text: string;
}

const GUIDE_TEXT: Record<string, string> = {
  foto: 'Con una foto puedes: mejorarla (Corrección automática), quitarle el fondo tocándolo, ponerle filtros, texto y stickers, y exportarla en PNG. Todo está en el Editor.',
  video: 'Con un video puedes: recortar el tramo, ponerle filtros, texto y stickers, y exportarlo en WebM (sin audio) o sacar un cuadro en PNG. Está en el Editor, pestaña Video.',
  documento: 'Con un documento puedes leerlo, editarlo, resaltar y firmar, y exportarlo en PDF real con el botón de descarga.',
  audio: 'Con un audio puedes escucharlo en el Reproductor, usarlo como música de fondo para grabar un episodio de Podcast, o ponerle música a tus fotos en el Editor.',
  musica: 'Para ponerle música a una foto: Editor → pestaña "Foto + música", agrega fotos y tu canción, elige segundos por foto y volumen, y exporta el video.',
  podcast: 'En Podcast puedes escuchar tus episodios de audio y grabar uno nuevo con tu voz y música de fondo, todo local.',
  fondo: 'Para quitar el fondo de una foto: Editor → activa "Quitar fondo", toca el fondo en la vista previa, ajusta tolerancia y borde suave, y exporta en PNG.',
  exportar: 'Para exportar: en Documentos el botón de descarga da un PDF real; en el Editor, el botón de exportar da PNG (foto) o WebM (video).',
  importar: 'Para importar: botón dorado "Importar" arriba, siempre visible. También desde Archivos. Si el archivo es muy grande, se abre solo para esa sesión.',
  '3d': 'Los modelos 3D se ven aquí, pero se editan en YC Editor 3D: abre el botón dorado "Abrir en YC Editor 3D".',
  buscar: 'Para buscar: ve a "Buscar", escribe lo que buscas y verás primero tus archivos. Para la web, elige el motor y los resultados se abren en una pestaña nueva.',
};

function answerFor(input: string, file: WorkstationFile | null): string {
  const q = input.toLowerCase();
  for (const [key, text] of Object.entries(GUIDE_TEXT)) {
    if (q.includes(key)) return text;
  }
  if (q.includes('hola') || q.includes('qué puedes') || q.includes('que puedes') || q.includes('ayuda')) {
    return 'Soy el asistente de la Workstation (respuestas locales, sin IA en la nube). Puedo explicarte cada herramienta, guiarte paso a paso y llevarte al módulo que necesites. Pregúntame, por ejemplo: "¿cómo quito el fondo de una foto?" o "¿cómo hago un podcast?".';
  }
  if (q.includes('gracias')) return 'De nada. Aquí estoy para lo que necesites dentro de la Workstation.';
  if (file) {
    return `Tienes abierto «${file.name}» (${file.type}). ${suggestionFor(file)} Si quieres, dime qué quieres hacer con él y te llevo.`;
  }
  return 'Puedo ayudarte con eso dentro de la Workstation. Prueba preguntando por una herramienta: foto, video, documento, audio, podcast, fondo o exportar. O usa los botones de abajo.';
}

export function suggestionFor(file: WorkstationFile): string {
  switch (file.type) {
    case 'image':
      return 'Sugerencia: mejórala con la corrección automática, quítale el fondo si es de un solo color, o ponle música y expórtala como video corto.';
    case 'video':
      return 'Sugerencia: recorta el tramo que sirve, ponle un filtro y texto, y expórtalo en WebM.';
    case 'audio':
      return 'Sugerencia: escúchalo en el Reproductor, úsalo de fondo en un episodio de Podcast, o ponlo como música de tus fotos.';
    case 'document':
    case 'spreadsheet':
      return 'Sugerencia: léelo, anota o firma, y expórtalo en PDF real.';
    case 'model3d':
      return 'Sugerencia: gíralo para verlo; para editarlo, ábrelo en YC Editor 3D.';
    case 'code':
      return 'Sugerencia: edítalo en el Editor de Código y guárdalo con el botón Guardar.';
    case 'archive':
      return 'Sugerencia: abre el ZIP para ver qué trae dentro sin salir de la app.';
    default:
      return 'Sugerencia: ábrelo desde Archivos para ver su herramienta.';
  }
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  open,
  onClose,
  activeFile,
  onNavigate,
  onOpenEditor,
  onImportClick,
}) => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: 'agent',
      text: 'Hola, soy tu asistente dentro de la Workstation. Te explico las herramientas, te guío paso a paso y te llevo a donde necesites. Todo lo que te digo sale de guías locales: no uso IA en la nube ni subo tus archivos.',
    },
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const quickActions = useMemo(() => {
    const actions: { label: string; icon: React.ReactNode; run: () => void }[] = [
      { label: 'Abrir el Editor', icon: <Sparkles className="w-4 h-4" />, run: () => onNavigate('editor') },
      { label: 'Ver Guías', icon: <BookOpen className="w-4 h-4" />, run: () => onNavigate('guides') },
      { label: 'Importar archivo', icon: <FileText className="w-4 h-4" />, run: onImportClick },
      { label: 'Ir al Podcast', icon: <Mic className="w-4 h-4" />, run: () => onNavigate('podcast') },
    ];
    if (activeFile?.type === 'image') {
      actions.unshift({
        label: 'Mejorar esta foto',
        icon: <Wand2 className="w-4 h-4" />,
        run: () => onOpenEditor(activeFile, 'photo'),
      });
      actions.unshift({
        label: 'Ponerle música a esta foto',
        icon: <Disc className="w-4 h-4" />,
        run: () => onOpenEditor(activeFile, 'music'),
      });
    }
    if (activeFile?.type === 'video') {
      actions.unshift({
        label: 'Recortar este video',
        icon: <Scissors className="w-4 h-4" />,
        run: () => onOpenEditor(activeFile, 'video'),
      });
    }
    return actions;
  }, [activeFile, onNavigate, onOpenEditor, onImportClick]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((prev) => [...prev, { from: 'user', text: clean }, { from: 'agent', text: answerFor(clean, activeFile) }]);
    setInput('');
    window.setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50);
  };

  if (!open) return null;

  return (
    <div className="fixed z-40 bottom-20 right-3 md:bottom-6 md:right-6 w-[calc(100vw-24px)] max-w-sm bg-obsidian-900 border border-gold-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-obsidian-950 border-b border-obsidian-800">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-gold-500/15 border border-gold-500/30 rounded-xl text-gold-400">
            <Bot className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Asistente YC</p>
            <p className="text-[11px] text-slate-400">Guía local · sin IA en la nube</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-800" title="Cerrar asistente">
          <X className="w-4 h-4" />
        </button>
      </div>

      {activeFile && (
        <div className="px-4 py-2 bg-gold-500/10 border-b border-gold-500/20 text-xs text-gold-200">
          Archivo abierto: <strong>{activeFile.name}</strong> — {suggestionFor(activeFile)}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto max-h-[45vh] p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.from === 'agent' ? 'bg-obsidian-800 text-slate-200 border border-obsidian-750' : 'bg-gold-500 text-obsidian-950 font-semibold ml-auto'}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {quickActions.map((a) => (
          <button key={a.label} onClick={a.run} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-obsidian-850 text-gold-300 border border-gold-500/30 hover:bg-gold-500/15">
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-obsidian-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          placeholder="Pregunta: foto, video, podcast, fondo…"
          className="flex-1 min-w-0 bg-obsidian-850 border border-obsidian-750 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
        />
        <button onClick={() => send(input)} className="px-3 py-2 bg-gold-500 text-obsidian-950 rounded-xl" title="Enviar">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
