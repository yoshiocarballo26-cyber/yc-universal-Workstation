import React, { useRef } from 'react';
import { WorkstationFile, ModuleCategory } from '../types';
import {
  Upload, Play, FolderGit2, Disc, FileText, Code2, Image as ImgIcon,
  Box, Archive, Kanban, ClipboardList, Wrench, BookOpen, ExternalLink,
  Music, Sparkles, Mic, Search, MessageSquare, MessagesSquare, ShieldCheck
} from 'lucide-react';
import { AdSlot } from './AdSlot';

interface HomeScreenProps {
  files: WorkstationFile[];
  onOpenFile: (file: WorkstationFile) => void;
  onUploadLocalFile: (file: File) => void;
  onNavigate: (module: ModuleCategory) => void;
}

export const YC_EDITOR_URL = 'https://yc-suite.web.app';

export const HomeScreen: React.FC<HomeScreenProps> = ({
  files,
  onOpenFile,
  onUploadLocalFile,
  onNavigate
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaFiles = files.filter((f) => f.type === 'audio' || f.type === 'video');
  const firstMedia = mediaFiles[0] || null;

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadLocalFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const toolGroups: {
    title: string;
    items: { id: ModuleCategory; label: string; hint: string; icon: React.ReactNode }[];
  }[] = [
    {
      title: 'Escuchar y ver',
      items: [
        { id: 'media', label: 'Reproductor', hint: 'Música y video', icon: <Disc className="w-5 h-5" /> },
        { id: 'podcast', label: 'Podcast', hint: 'Escuchar y grabar episodios', icon: <Mic className="w-5 h-5" /> },
        { id: 'music', label: 'Música online', hint: 'Spotify y Amazon Music', icon: <Music className="w-5 h-5" /> },
        { id: 'images', label: 'Imágenes', hint: 'Ver y convertir', icon: <ImgIcon className="w-5 h-5" /> },
      ],
    },
    {
      title: 'Crear',
      items: [
        { id: 'editor', label: 'Editor foto/video', hint: 'Filtros, fondo, stickers, música', icon: <Sparkles className="w-5 h-5" /> },
        { id: 'documents', label: 'Documentos', hint: 'Leer, editar y exportar a PDF', icon: <FileText className="w-5 h-5" /> },
        { id: 'code', label: 'Código', hint: 'Editar texto y código', icon: <Code2 className="w-5 h-5" /> },
        { id: '3d', label: 'Modelos 3D', hint: 'Ver modelos; editar en YC Editor 3D', icon: <Box className="w-5 h-5" /> },
      ],
    },
    {
      title: 'Organizar',
      items: [
        { id: 'buscar', label: 'Buscar', hint: 'En tu biblioteca y en la web', icon: <Search className="w-5 h-5" /> },
        { id: 'comments', label: 'Comentarios', hint: 'Opiniones sobre la app', icon: <MessageSquare className="w-5 h-5" /> },
        { id: 'chat', label: 'Chat comunidad', hint: 'Sala general', icon: <MessagesSquare className="w-5 h-5" /> },
        { id: 'seguridad', label: 'Seguridad', hint: 'Privacidad y reglas', icon: <ShieldCheck className="w-5 h-5" /> },
        { id: 'files', label: 'Archivos', hint: 'Tu biblioteca', icon: <FolderGit2 className="w-5 h-5" /> },
        { id: 'projects', label: 'Proyectos', hint: 'Tareas y notas', icon: <Kanban className="w-5 h-5" /> },
        { id: 'clipboard', label: 'Portapapeles', hint: 'Textos guardados', icon: <ClipboardList className="w-5 h-5" /> },
        { id: 'archive', label: 'ZIP', hint: 'Comprimir y extraer', icon: <Archive className="w-5 h-5" /> },
        { id: 'tools', label: 'Herramientas', hint: 'Conversor y calculadora', icon: <Wrench className="w-5 h-5" /> },
      ],
    },
  ];
  const recentFiles = [...files].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0)).slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="text-center pt-2 md:pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-[11px] font-mono font-bold tracking-widest">
            <span>YC 🪐</span>
            <span className="text-slate-500">•</span>
            <span>LOCAL</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-4">Tu espacio digital.</h1>
          <p className="text-sm text-slate-400 mt-1">
            Archivos, música, documentos y creación en un solo lugar.
          </p>
        </div>

        {/* Reproductor al centro */}
        <div className="bg-obsidian-900 border border-gold-500/30 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-5 h-5 text-gold-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Reproductor</h2>
            <span className="text-[11px] text-slate-500 font-mono">Tu música comienza aquí</span>
          </div>
          {firstMedia ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-white truncate">{firstMedia.name}</p>
                <p className="text-xs text-slate-400 font-mono">
                  {firstMedia.extension.toUpperCase()} • {mediaFiles.length} pista(s) en tu biblioteca
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenFile(firstMedia)}
                  className="px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 hover:bg-gold-400 rounded-xl flex items-center gap-2 transition"
                >
                  <Play className="w-4 h-4 fill-current" /> Reproducir
                </button>
                <button
                  onClick={() => onNavigate('media')}
                  className="px-4 py-2 text-xs font-semibold bg-obsidian-850 hover:bg-obsidian-800 text-slate-200 border border-obsidian-750 rounded-xl transition"
                >
                  Ver lista
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Aún no hay música ni video. Importa un archivo para empezar a escuchar.
              </p>
              <button
                onClick={handleImportClick}
                className="px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 hover:bg-gold-400 rounded-xl flex items-center gap-2 transition"
              >
                <Upload className="w-4 h-4" /> Importar archivo
              </button>
            </div>
          )}
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-2 gap-3">
          <input type="file" ref={fileInputRef} onChange={handleImportChange} className="hidden" />
          <button
            onClick={handleImportClick}
            className="p-4 bg-gold-500 hover:bg-gold-400 text-obsidian-950 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.25)] transition"
          >
            <Upload className="w-5 h-5" /> Importar archivo
          </button>
          <button
            onClick={() => onNavigate('files')}
            className="p-4 bg-obsidian-900 hover:bg-obsidian-850 border border-obsidian-750 hover:border-gold-500/40 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <FolderGit2 className="w-5 h-5 text-gold-400" /> Mi biblioteca
          </button>
        </div>

        {/* Continúa donde ibas: archivos recientes */}
        {recentFiles.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">Continúa donde ibas</h2>
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onOpenFile(f)}
                  className="w-full flex items-center justify-between gap-3 bg-obsidian-900 hover:bg-obsidian-850 border border-obsidian-800 hover:border-gold-500/40 rounded-2xl px-4 py-3 text-left transition"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white truncate">{f.name}</span>
                    <span className="block text-[11px] text-slate-500 font-mono">{f.type} · {f.extension.toUpperCase()}</span>
                  </span>
                  <span className="text-gold-300 text-xs font-bold shrink-0">Abrir →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Herramientas agrupadas por tarea */}
        {toolGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-bold text-gold-400 uppercase tracking-wider mb-2">{group.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="p-4 bg-obsidian-900 hover:bg-obsidian-850 border border-obsidian-800 hover:border-gold-500/40 rounded-2xl text-left transition group"
                >
                  <span className="text-gold-400 group-hover:text-gold-300 block mb-2">{item.icon}</span>
                  <span className="block text-sm font-bold text-white">{item.label}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Modelos 3D: enlace al editor */}
        <div className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">¿Vas a editar o preparar una pieza 3D?</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Aquí solo se ve el modelo. La edición 3D se hace en YC Editor 3D.
            </p>
          </div>
          <a
            href={YC_EDITOR_URL}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-bold bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 rounded-xl flex items-center gap-2 transition"
          >
            Abrir en YC Editor 3D <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Guía corta de inicio */}
        <div className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Empieza en 3 pasos</h2>
          </div>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-gold-500 text-obsidian-950 text-xs font-bold flex items-center justify-center">1</span>
              <span><strong className="text-white">Importa un archivo</strong> con el botón dorado de arriba.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-gold-500 text-obsidian-950 text-xs font-bold flex items-center justify-center">2</span>
              <span><strong className="text-white">Tócalo en tu biblioteca</strong>: cada tipo de archivo abre su herramienta.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-gold-500 text-obsidian-950 text-xs font-bold flex items-center justify-center">3</span>
              <span><strong className="text-white">Guarda o exporta</strong> desde la herramienta que estés usando.</span>
            </li>
          </ol>
          <button
            onClick={() => onNavigate('guides')}
            className="mt-4 text-xs font-bold text-gold-300 hover:text-gold-400 flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-4 h-4" /> Ver todas las guías
          </button>
        </div>

        {/* Nota honesta */}
        <p className="text-center text-[11px] text-slate-500 font-mono pb-2">
          Tus archivos se quedan en tu dispositivo. Los archivos muy grandes pueden no guardarse al cerrar la app.
        </p>

        {/* Espacio publicitario: banner principal */}
        <AdSlot slot="inicio-banner" />
      </div>
    </div>
  );
};
