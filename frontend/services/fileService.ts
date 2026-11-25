import { WorkstationFile, ProjectItem, ClipboardItem, PDFAnnotation } from '../types';
import { INITIAL_FILES } from '../constants';

const FILES_STORAGE_KEY = 'yc_universal_workstation_files_v2';
const PROJECTS_STORAGE_KEY = 'yc_workstation_projects_v1';
const CLIPBOARD_STORAGE_KEY = 'yc_workstation_clipboard_v1';
const ANNOTATIONS_STORAGE_KEY = 'yc_workstation_annotations_v1';

// Ids de los archivos de ejemplo que traía la app y que ya no se
// incluyen. Si un usuario los tiene guardados de antes, se retiran
// solos al cargar (migración de una vez, sin borrar nada del usuario).
const REMOVED_DEMO_FILE_IDS = [
  'f-code-demo',
  'f-csv-data',
  'f-sample-pdf',
  'f-sample-audio',
  'f-sample-image',
  'f-sample-3d',
  'f-sample-archive',
];

export const getStoredFiles = (): WorkstationFile[] => {
  try {
    const raw = localStorage.getItem(FILES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(INITIAL_FILES));
      return INITIAL_FILES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_FILES;
    const cleaned = parsed.filter((f: WorkstationFile) => !REMOVED_DEMO_FILE_IDS.includes(f.id));
    if (cleaned.length !== parsed.length) {
      // Se retiraron archivos de ejemplo viejos: se guarda la lista limpia.
      try {
        localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(cleaned));
      } catch (err) {
        console.error('Error saving cleaned files to localStorage', err);
      }
    }
    return cleaned.length > 0 ? cleaned : INITIAL_FILES;
  } catch (err) {
    console.error('Error loading files from localStorage', err);
    return INITIAL_FILES;
  }
};

export const saveStoredFiles = (files: WorkstationFile[]): boolean => {
  try {
    localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
    return true;
  } catch (err) {
    // Suele ser QuotaExceededError con archivos grandes: localStorage
    // tiene un límite de unos 5 MB por sitio. Se avisa a quien llama.
    console.error('Error saving files to localStorage', err);
    return false;
  }
};

export const getStoredProjects = (): ProjectItem[] => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading projects', e);
    return [];
  }
};

export const saveStoredProjects = (projects: ProjectItem[]): boolean => {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (e) {
    console.error('Error saving projects', e);
    return false;
  }
};

export const getStoredClipboard = (): ClipboardItem[] => {
  try {
    const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading clipboard', e);
    return [];
  }
};

export const saveStoredClipboard = (items: ClipboardItem[]): boolean => {
  try {
    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error('Error saving clipboard', e);
    return false;
  }
};

// --- Anotaciones y firmas de documentos, persistentes por archivo ---
// Antes vivían solo en el estado del componente y se perdían al cambiar
// de vista. Ahora se guardan en localStorage, con clave por id de archivo.
export interface StoredAnnotations {
  annotations: PDFAnnotation[];
  signed: boolean;
  signatureText: string;
}

export const getStoredAnnotations = (fileId: string): StoredAnnotations => {
  const empty: StoredAnnotations = { annotations: [], signed: false, signatureText: 'YC Workstation' };
  try {
    const raw = localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    if (!raw) return empty;
    const map = JSON.parse(raw);
    const entry = map[fileId];
    if (!entry) return empty;
    return {
      annotations: Array.isArray(entry.annotations) ? entry.annotations : [],
      signed: !!entry.signed,
      signatureText: typeof entry.signatureText === 'string' ? entry.signatureText : 'YC Workstation',
    };
  } catch (e) {
    console.error('Error loading annotations', e);
    return empty;
  }
};

export const saveStoredAnnotations = (fileId: string, data: StoredAnnotations): boolean => {
  try {
    const raw = localStorage.getItem(ANNOTATIONS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[fileId] = data;
    localStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch (e) {
    console.error('Error saving annotations', e);
    return false;
  }
};

export const detectFileType = (fileName: string, mimeType?: string): { category: WorkstationFile['type']; extension: string } => {
  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'opus', 'aac'].includes(ext)) {
    return { category: 'audio', extension: ext };
  }
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
    return { category: 'video', extension: ext };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'tiff'].includes(ext)) {
    return { category: 'image', extension: ext };
  }
  if (['pdf'].includes(ext)) {
    return { category: 'document', extension: ext };
  }
  if (['docx', 'doc', 'odt', 'rtf', 'epub'].includes(ext)) {
    return { category: 'document', extension: ext };
  }
  if (['csv', 'tsv', 'xlsx', 'xls', 'ods'].includes(ext)) {
    return { category: 'spreadsheet', extension: ext };
  }
  if (['stl', 'obj', 'gltf', 'glb', 'ply'].includes(ext)) {
    return { category: 'model3d', extension: ext };
  }
  if (['zip', 'tar', 'gz', '7z', 'bz2', 'rar'].includes(ext)) {
    return { category: 'archive', extension: ext };
  }
  if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'xml', 'yaml', 'yml', 'md', 'txt', 'log', 'sh', 'py', 'sql', 'srt', 'vtt'].includes(ext)) {
    return { category: 'code', extension: ext };
  }

  // Fallback check on MIME
  if (mimeType?.startsWith('audio/')) return { category: 'audio', extension: ext || 'mp3' };
  if (mimeType?.startsWith('video/')) return { category: 'video', extension: ext || 'mp4' };
  if (mimeType?.startsWith('image/')) return { category: 'image', extension: ext || 'png' };

  return { category: 'unknown', extension: ext };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._\- \(\)]/g, '_').trim();
};

export const downloadBlobAsFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadTextAsFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  downloadBlobAsFile(blob, filename);
};
