import React, { useState, useEffect, useRef } from 'react';
import { 
  WorkstationFile, TabItem, ModuleCategory, FileTypeCategory, ProjectItem, ClipboardItem 
} from './types';
import { 
  COMPATIBILITY_MATRIX, INITIAL_FILES 
} from './constants';
import { 
  getStoredFiles, saveStoredFiles, detectFileType, getStoredProjects, 
  saveStoredProjects, getStoredClipboard, saveStoredClipboard 
} from './services/fileService';
import { FileManager } from './components/FileManager';
import { MediaPlayer } from './components/MediaPlayer';
import { DocumentViewer } from './components/DocumentViewer';
import { CodeEditor } from './components/CodeEditor';
import { ImageViewer } from './components/ImageViewer';
import { ThreeViewer } from './components/ThreeViewer';
import { ArchiveViewer } from './components/ArchiveViewer';
import { UtilityTools } from './components/UtilityTools';
import { ProjectManager } from './components/ProjectManager';
import { ClipboardManager } from './components/ClipboardManager';
import { HomeScreen, YC_EDITOR_URL } from './components/HomeScreen';
import { Guides } from './components/Guides';
import { MediaEditor, EditorRequest, EditorMode } from './components/MediaEditor';
import { PodcastStudio } from './components/PodcastStudio';
import { MusicServices } from './components/MusicServices';
import { WebSearch } from './components/WebSearch';
import { Comments } from './components/Comments';
import { CommunityChat } from './components/CommunityChat';
import { SecurityPrivacy } from './components/SecurityPrivacy';
import { AgentPanel } from './components/AgentPanel';

import { 
  FolderGit2, Disc, FileText, Code2, Image as ImgIcon, Box, 
  Archive, Wrench, X, Plus, Kanban, ClipboardList, Upload, Home, BookOpen,
  Sparkles, Mic, Search, Bot, MessageSquare, MessagesSquare, ShieldCheck
} from 'lucide-react';

// Navegación agrupada por tarea, con nombres cortos y claros.
// No se elimina ningún módulo: los 10 de antes siguen visibles, más los nuevos.
const NAV_GROUPS: {
  label: string;
  items: { id: ModuleCategory; label: string; icon: React.ReactNode }[];
}[] = [
  {
    label: 'Inicio',
    items: [
      { id: 'inicio', label: 'Inicio', icon: <Home className="w-4 h-4" /> },
      { id: 'buscar', label: 'Buscar', icon: <Search className="w-4 h-4" /> },
      { id: 'comments', label: 'Comentarios', icon: <MessageSquare className="w-4 h-4" /> },
      { id: 'chat', label: 'Chat comunidad', icon: <MessagesSquare className="w-4 h-4" /> },
      { id: 'seguridad', label: 'Seguridad', icon: <ShieldCheck className="w-4 h-4" /> },
      { id: 'guides', label: 'Guías', icon: <BookOpen className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Escuchar y ver',
    items: [
      { id: 'media', label: 'Reproductor', icon: <Disc className="w-4 h-4" /> },
      { id: 'podcast', label: 'Podcast', icon: <Mic className="w-4 h-4" /> },
      { id: 'music', label: 'Música online', icon: <Music className="w-4 h-4" /> },
      { id: 'images', label: 'Imágenes', icon: <ImgIcon className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Crear',
    items: [
      { id: 'editor', label: 'Editor foto/video', icon: <Sparkles className="w-4 h-4" /> },
      { id: 'documents', label: 'Documentos', icon: <FileText className="w-4 h-4" /> },
      { id: 'code', label: 'Código', icon: <Code2 className="w-4 h-4" /> },
      { id: '3d', label: 'Modelos 3D', icon: <Box className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Organizar',
    items: [
      { id: 'files', label: 'Archivos', icon: <FolderGit2 className="w-4 h-4" /> },
      { id: 'projects', label: 'Proyectos', icon: <Kanban className="w-4 h-4" /> },
      { id: 'clipboard', label: 'Portapapeles', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'archive', label: 'ZIP', icon: <Archive className="w-4 h-4" /> },
      { id: 'tools', label: 'Herramientas', icon: <Wrench className="w-4 h-4" /> },
    ],
  },
];

type UploadStatus = { kind: 'idle' | 'loading' | 'success' | 'error'; message: string };

export default function App() {
  const [files, setFiles] = useState<WorkstationFile[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [activeModule, setActiveModule] = useState<ModuleCategory>('inicio');
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ kind: 'idle', message: '' });
  const [agentOpen, setAgentOpen] = useState(false);
  const [editorRequest, setEditorRequest] = useState<EditorRequest | null>(null);
  const globalFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenEditor = (file: WorkstationFile, mode: EditorMode) => {
    setEditorRequest({ file, mode });
    setActiveModule('editor');
  };

  // Initialize stored state
  useEffect(() => {
    const loadedFiles = getStoredFiles();
    setFiles(loadedFiles);

    const loadedProjects = getStoredProjects();
    setProjects(loadedProjects);

    const loadedClipboard = getStoredClipboard();
    setClipboardItems(loadedClipboard);

    // Open initial README tab
    const readme = loadedFiles.find((f) => f.name.includes('BIENVENIDO'));
    if (readme) {
      setOpenTabs([
        {
          id: `tab-${readme.id}`,
          fileId: readme.id,
          title: readme.name,
          category: readme.type,
          extension: readme.extension
        }
      ]);
      setActiveTabId(`tab-${readme.id}`);
    }
  }, []);

  const handleOpenFile = (file: WorkstationFile) => {
    const existing = openTabs.find((t) => t.fileId === file.id);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: TabItem = {
        id: `tab-${file.id}-${Date.now()}`,
        fileId: file.id,
        title: file.name,
        category: file.type,
        extension: file.extension
      };
      setOpenTabs([...openTabs, newTab]);
      setActiveTabId(newTab.id);
    }

    // Switch view module to match file type
    if (file.type === 'audio' || file.type === 'video') setActiveModule('media');
    else if (file.type === 'document' || file.type === 'spreadsheet') setActiveModule('documents');
    else if (file.type === 'code') setActiveModule('code');
    else if (file.type === 'image') setActiveModule('images');
    else if (file.type === 'model3d') setActiveModule('3d');
    else if (file.type === 'archive') setActiveModule('archive');
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const updated = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(updated);
    if (activeTabId === tabId) {
      setActiveTabId(updated.length > 0 ? updated[updated.length - 1].id : null);
    }
  };

  const handleCreateNewFile = (name: string, category: FileTypeCategory, customContent?: string) => {
    const { extension } = detectFileType(name);
    const newFile: WorkstationFile = {
      id: `f-${Date.now()}`,
      name: name,
      path: `/${name}`,
      size: customContent ? customContent.length : 120,
      type: category,
      extension: extension || 'txt',
      mimeType: 'text/plain',
      lastModified: Date.now(),
      content: customContent || (category === 'code' ? '// Nuevo archivo YC Workstation\n' : 'Documento en blanco creado.')
    };

    const nextFiles = [newFile, ...files];
    setFiles(nextFiles);
    saveStoredFiles(nextFiles);
    handleOpenFile(newFile);
  };

  const handleDeleteFile = (id: string) => {
    const nextFiles = files.filter((f) => f.id !== id);
    setFiles(nextFiles);
    saveStoredFiles(nextFiles);
    setOpenTabs(openTabs.filter((t) => t.fileId !== id));
  };

  const handleToggleFavorite = (id: string) => {
    const nextFiles = files.map((f) => (f.id === id ? { ...f, favorite: !f.favorite } : f));
    setFiles(nextFiles);
    saveStoredFiles(nextFiles);
  };

  const handleUploadLocalFile = async (rawFile: File) => {
    setUploadStatus({ kind: 'loading', message: `Importando «${rawFile.name}»…` });
    try {
      const { category, extension } = detectFileType(rawFile.name, rawFile.type);

      let content = '';
      if (category === 'code' || category === 'document' || category === 'spreadsheet' || extension === 'svg') {
        content = await rawFile.text();
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
          reader.readAsDataURL(rawFile);
        });
      }

      const newFile: WorkstationFile = {
        id: `f-uploaded-${Date.now()}`,
        name: rawFile.name,
        path: `/Importados/${rawFile.name}`,
        size: rawFile.size,
        type: category,
        extension: extension,
        mimeType: rawFile.type || 'application/octet-stream',
        lastModified: rawFile.lastModified || Date.now(),
        content: content
      };

      const nextFiles = [newFile, ...files];
      setFiles(nextFiles);
      // Si el guardado falla (normalmente por límite de localStorage con
      // archivos grandes), el archivo igual se abre solo para esta sesión.
      const saved = saveStoredFiles(nextFiles);
      if (!saved) {
        setUploadStatus({
          kind: 'error',
          message: `«${rawFile.name}» se abrió solo para esta sesión: es demasiado grande para guardarse en este navegador. Descarga una copia fuera de la app.`,
        });
      } else {
        setUploadStatus({ kind: 'success', message: `Archivo importado: ${rawFile.name}` });
        window.setTimeout(() => setUploadStatus({ kind: 'idle', message: '' }), 5000);
      }
      handleOpenFile(newFile);
    } catch (err) {
      console.error('Error importing file', err);
      setUploadStatus({
        kind: 'error',
        message: `No se pudo importar «${rawFile.name}». Inténtalo de nuevo.`,
      });
    }
  };

  const handleGlobalImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadLocalFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleUpdateFileContent = (newContent: string) => {
    const activeTab = openTabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const nextFiles = files.map((f) => {
      if (f.id === activeTab.fileId) {
        return {
          ...f,
          content: newContent,
          size: newContent.length,
          lastModified: Date.now()
        };
      }
      return f;
    });

    setFiles(nextFiles);
    saveStoredFiles(nextFiles);
  };

  const handleUpdateProjects = (updated: ProjectItem[]) => {
    setProjects(updated);
    saveStoredProjects(updated);
  };

  const handleUpdateClipboard = (updated: ClipboardItem[]) => {
    setClipboardItems(updated);
    saveStoredClipboard(updated);
  };

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const activeFile = activeTab ? files.find((f) => f.id === activeTab.fileId) : null;

  const renderNavButton = (item: { id: ModuleCategory; label: string; icon: React.ReactNode }) => {
    const isActive = activeModule === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveModule(item.id as ModuleCategory)}
        className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
          isActive
            ? 'bg-gradient-to-r from-gold-500/20 to-gold-500/5 text-gold-300 border border-gold-500/30 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
            : 'text-slate-400 hover:text-white hover:bg-obsidian-850'
        }`}
        title={item.label}
      >
        <span className={`${isActive ? 'text-gold-400' : 'text-slate-400'}`}>
          {item.icon}
        </span>
        <span className="ml-3 hidden md:block">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-obsidian-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Global Left Navigation Sidebar (escritorio) */}
      <aside className="hidden md:flex w-64 bg-obsidian-900 border-r border-obsidian-800 flex-col justify-between shrink-0 select-none z-20">
        <div>
          {/* Brand Header */}
          <div className="h-14 flex items-center px-4 border-b border-obsidian-800 bg-obsidian-950/40">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.35)] shrink-0">
              <span className="font-bold text-obsidian-950 text-sm tracking-tighter">YC</span>
            </div>
            <div className="ml-3">
              <h1 className="text-xs font-bold text-white tracking-widest uppercase">WORKSTATION</h1>
              <p className="text-[10px] text-gold-400 font-mono tracking-tight">UNIVERSAL SYSTEM</p>
            </div>
          </div>

          {/* Module Nav Links, agrupados por tarea */}
          <nav className="p-2 space-y-3 mt-2 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => renderNavButton(item))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* System Status Footer */}
        <div className="p-3 border-t border-obsidian-800 bg-obsidian-950/60 text-[11px] font-mono text-slate-400">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-gold-400">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
              Local primero
            </span>
            <span className="text-gold-400">PWA Lista</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Tus archivos se quedan en tu dispositivo
          </div>
          <div className="text-[10px] text-slate-500">
            {files.length} archivos • {projects.length} proyectos activos
          </div>
          <div className="text-[10px] text-gold-300/80 mt-1.5">
            Consejo: toca el botón dorado del asistente (abajo a la derecha) si no sabes por dónde empezar.
          </div>
        </div>
      </aside>

      {/* 2. Main Central Workstation Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-obsidian-950 pb-16 md:pb-0">
        {/* Top Header Tabs Bar */}
        <header className="h-12 bg-obsidian-900 border-b border-obsidian-800 flex items-center justify-between px-3 shrink-0 gap-2">
          {/* Mobile brand */}
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0">
              <span className="font-bold text-obsidian-950 text-[11px]">YC</span>
            </div>
          </div>

          {/* Scrollable Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-1 max-w-4xl py-1">
            {openTabs.map((tab) => {
              const isCurrent = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    if (tab.category === 'audio' || tab.category === 'video') setActiveModule('media');
                    else if (tab.category === 'document' || tab.category === 'spreadsheet') setActiveModule('documents');
                    else if (tab.category === 'code') setActiveModule('code');
                    else if (tab.category === 'image') setActiveModule('images');
                    else if (tab.category === 'model3d') setActiveModule('3d');
                    else if (tab.category === 'archive') setActiveModule('archive');
                  }}
                  className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all border shrink-0 ${
                    isCurrent
                      ? 'bg-obsidian-800 text-gold-300 border-gold-500/40 shadow-sm'
                      : 'bg-obsidian-900 text-slate-400 hover:text-white border-transparent hover:bg-obsidian-850'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 rounded hover:bg-obsidian-700 text-slate-500 hover:text-rose-400 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setActiveModule('files')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-gold-300 hover:bg-obsidian-850 transition"
              title="Abrir nuevo archivo"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Global Import — siempre visible */}
          <input
            type="file"
            ref={globalFileInputRef}
            onChange={handleGlobalImportChange}
            className="hidden"
          />
          <button
            onClick={() => globalFileInputRef.current?.click()}
            className="shrink-0 px-3 py-1.5 text-xs font-bold bg-gold-500 text-obsidian-950 hover:bg-gold-400 rounded-xl flex items-center gap-1.5 transition"
            title="Importar archivo desde tu dispositivo"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {/* Quick System Badge */}
          <div className="hidden lg:flex items-center space-x-3 text-xs font-mono shrink-0">
            <span className="text-slate-500">YC Station OS</span>
            <span className="px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20 text-[10px]">
              OBSIDIAN & GOLD
            </span>
          </div>
        </header>

        {/* Upload / action status banner */}
        {uploadStatus.kind !== 'idle' && (
          <div
            className={`shrink-0 px-4 py-2 text-xs font-mono flex items-center justify-between gap-3 ${
              uploadStatus.kind === 'error'
                ? 'bg-rose-500/15 text-rose-300 border-b border-rose-500/30'
                : uploadStatus.kind === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/30'
                : 'bg-gold-500/15 text-gold-300 border-b border-gold-500/30'
            }`}
          >
            <span>{uploadStatus.message}</span>
            <button
              onClick={() => setUploadStatus({ kind: 'idle', message: '' })}
              className="shrink-0 px-1 text-current opacity-70 hover:opacity-100"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Workspace Display Area Based on Module */}
        <section className="flex-1 flex overflow-hidden">
          {activeModule === 'inicio' && (
            <HomeScreen
              files={files}
              onOpenFile={handleOpenFile}
              onUploadLocalFile={handleUploadLocalFile}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'guides' && <Guides />}

          {activeModule === 'buscar' && (
            <WebSearch files={files} onOpenFile={handleOpenFile} />
          )}

          {activeModule === 'comments' && <Comments />}

          {activeModule === 'chat' && <CommunityChat />}

          {activeModule === 'seguridad' && <SecurityPrivacy />}

          {activeModule === 'editor' && (
            <MediaEditor
              files={files}
              request={editorRequest}
              onRequestConsumed={() => setEditorRequest(null)}
            />
          )}

          {activeModule === 'podcast' && (
            <PodcastStudio
              files={files}
              onFileGenerated={(newF) => {
                const nextFiles = [newF, ...files];
                setFiles(nextFiles);
                saveStoredFiles(nextFiles);
              }}
            />
          )}

          {activeModule === 'music' && <MusicServices />}

          {activeModule === 'files' && (
            <FileManager
              files={files}
              onOpenFile={handleOpenFile}
              onCreateNewFile={handleCreateNewFile}
              onDeleteFile={handleDeleteFile}
              onToggleFavorite={handleToggleFavorite}
              onUploadLocalFile={handleUploadLocalFile}
            />
          )}

          {activeModule === 'projects' && (
            <ProjectManager
              projects={projects}
              allFiles={files}
              onUpdateProjects={handleUpdateProjects}
              onOpenFile={handleOpenFile}
            />
          )}

          {activeModule === 'clipboard' && (
            <ClipboardManager
              items={clipboardItems}
              onUpdateItems={handleUpdateClipboard}
            />
          )}

          {activeModule === 'media' && (
            activeFile ? (
              <MediaPlayer 
                file={activeFile} 
                allMediaFiles={files.filter(f => f.type === 'audio' || f.type === 'video')}
                onSelectTrack={handleOpenFile}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Disc className="w-16 h-16 text-slate-700 mb-4 animate-spin-slow" />
                <h3 className="text-lg font-bold text-white">Reproductor Multimedia YC</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                  Abra una pista de audio (MP3, WAV, FLAC, OGG) o video (MP4, WebM) desde el explorador.
                </p>
                <button
                  onClick={() => setActiveModule('files')}
                  className="mt-4 px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
                >
                  Ir al Explorador
                </button>
              </div>
            )
          )}

          {activeModule === 'documents' && (
            activeFile ? (
              <DocumentViewer
                file={activeFile}
                onUpdateFileContent={handleUpdateFileContent}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <FileText className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white">Lector & Editor Universal de Documentos</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                  Compatible con PDF, DOCX, CSV, RTF y libros digitales.
                </p>
                <button
                  onClick={() => setActiveModule('files')}
                  className="mt-4 px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
                >
                  Seleccionar Documento
                </button>
              </div>
            )
          )}

          {activeModule === 'code' && (
            activeFile ? (
              <CodeEditor
                file={activeFile}
                onSaveContent={handleUpdateFileContent}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Code2 className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white">Editor de Código & Texto</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                  Soporte Markdown, JavaScript, HTML, CSS, JSON, YAML y LOG.
                </p>
                <button
                  onClick={() => setActiveModule('files')}
                  className="mt-4 px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
                >
                  Abrir Archivo de Código
                </button>
              </div>
            )
          )}

          {activeModule === 'images' && (
            activeFile ? (
              <ImageViewer file={activeFile} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <ImgIcon className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white">Visor & Conversor de Imágenes</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                  Zoom suave, rotación, ajuste de brillo y soporte SVG nativo.
                </p>
                <button
                  onClick={() => setActiveModule('files')}
                  className="mt-4 px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
                >
                  Elegir Imagen
                </button>
              </div>
            )
          )}

          {activeModule === '3d' && (
            activeFile ? (
              <ThreeViewer file={activeFile} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Box className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white">Visor Tridimensional Three.js</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                  Visualice archivos STL, OBJ y geometrías tridimensionales interactivas.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setActiveModule('files')}
                    className="px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
                  >
                    Explorar Modelos 3D
                  </button>
                  <a
                    href={YC_EDITOR_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-xs font-bold bg-gold-500/20 text-gold-300 border border-gold-500/40 rounded-xl"
                  >
                    Abrir en YC Editor 3D
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-3">
                  La edición 3D se hace en YC Editor 3D.
                </p>
              </div>
            )
          )}

          {activeModule === 'archive' && (
            activeFile ? (
              <ArchiveViewer file={activeFile} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Archive className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-lg font-bold text-white">Compresión & Extracción Segura</h3>
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                  Inspeccione contenedores ZIP y extraiga elementos sin salir de su navegador.
                </p>
                <button
                  onClick={() => setActiveModule('files')}
                  className="mt-4 px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 rounded-xl"
                >
                  Abrir Archivo Comprimido
                </button>
              </div>
            )
          )}

          {activeModule === 'tools' && (
            <UtilityTools 
              files={files} 
              onFileGenerated={(newF) => {
                const nextFiles = [newF, ...files];
                setFiles(nextFiles);
                saveStoredFiles(nextFiles);
              }}
            />
          )}
        </section>
      </main>

      {/* 3. Navegación móvil propia (barra inferior) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-obsidian-900/95 backdrop-blur border-t border-obsidian-800 flex items-stretch justify-around px-1 py-1.5">
        <button
          onClick={() => setActiveModule('inicio')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold ${activeModule === 'inicio' ? 'text-gold-300' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5" /> Inicio
        </button>
        <button
          onClick={() => setActiveModule('editor')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold ${activeModule === 'editor' ? 'text-gold-300' : 'text-slate-400'}`}
        >
          <Sparkles className="w-5 h-5" /> Editor
        </button>
        <button
          onClick={() => globalFileInputRef.current?.click()}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-bold text-obsidian-950"
          title="Importar archivo"
        >
          <span className="w-10 h-10 -mt-6 rounded-full bg-gold-500 border-4 border-obsidian-950 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            <Upload className="w-5 h-5" />
          </span>
          Importar
        </button>
        <button
          onClick={() => setActiveModule('files')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold ${activeModule === 'files' ? 'text-gold-300' : 'text-slate-400'}`}
        >
          <FolderGit2 className="w-5 h-5" /> Archivos
        </button>
        <button
          onClick={() => setActiveModule('guides')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-semibold ${activeModule === 'guides' ? 'text-gold-300' : 'text-slate-400'}`}
        >
          <BookOpen className="w-5 h-5" /> Guías
        </button>
      </nav>

      {/* Asistente YC: botón flotante + panel */}
      {!agentOpen && (
        <button
          onClick={() => setAgentOpen(true)}
          className="fixed z-40 bottom-20 right-3 md:bottom-6 md:right-6 w-12 h-12 rounded-full bg-gold-500 text-obsidian-950 flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.5)] hover:bg-gold-400 transition"
          title="Asistente YC: te guía y te lleva a cada herramienta"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}
      <AgentPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        activeFile={activeFile}
        onNavigate={setActiveModule}
        onOpenEditor={handleOpenEditor}
        onImportClick={() => globalFileInputRef.current?.click()}
      />
    </div>
  );
}
