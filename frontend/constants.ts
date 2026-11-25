import { CompatibilityMatrixItem, WorkstationFile } from './types';

export const COMPATIBILITY_MATRIX: CompatibilityMatrixItem[] = [
  // Multimedia - Audio
  { extension: 'mp3', name: 'Audio MPEG-3', category: 'audio', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'HTML5 WebAudio API + Visualizer', status: 'nativo' },
  { extension: 'wav', name: 'Waveform Audio', category: 'audio', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'HTML5 WebAudio API', status: 'nativo' },
  { extension: 'ogg', name: 'Ogg Vorbis Audio', category: 'audio', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'HTML5 Audio Engine', status: 'nativo' },
  { extension: 'flac', name: 'Free Lossless Audio Codec', category: 'audio', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'Browser Native Codec', status: 'nativo' },
  { extension: 'm4a', name: 'MPEG-4 Audio', category: 'audio', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'HTML5 Audio', status: 'nativo' },
  { extension: 'opus', name: 'Opus Interactive Audio', category: 'audio', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'WebAudio Codec', status: 'nativo' },

  // Multimedia - Video
  { extension: 'mp4', name: 'MPEG-4 Video', category: 'video', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'HTML5 Video Engine', status: 'nativo' },
  { extension: 'webm', name: 'WebM Open Media', category: 'video', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'VP8/VP9 Native Decoder', status: 'nativo' },
  { extension: 'mov', name: 'QuickTime Movie', category: 'video', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'media', engine: 'Browser QuickTime / MP4', status: 'nativo' },
  { extension: 'mkv', name: 'Matroska Video Container', category: 'video', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: false, primaryModule: 'media', engine: 'HTML5 Container Support', status: 'nativo' },

  // Documentos & PDF
  { extension: 'pdf', name: 'Portable Document Format', category: 'document', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'documents', engine: 'YC PDF Suite & Annotator', status: 'completado' },
  { extension: 'docx', name: 'Microsoft Word OpenXML', category: 'document', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'documents', engine: 'Universal Document Parser', status: 'virtualizado' },
  { extension: 'doc', name: 'Documento Word Legado', category: 'document', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: false, primaryModule: 'documents', engine: 'Legacy Text Reader', status: 'virtualizado' },
  { extension: 'odt', name: 'OpenDocument Text', category: 'document', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'documents', engine: 'ODF Parser Engine', status: 'virtualizado' },
  { extension: 'rtf', name: 'Rich Text Format', category: 'document', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'documents', engine: 'RTF Tokenizer', status: 'nativo' },
  { extension: 'epub', name: 'Electronic Publication', category: 'document', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: true, primaryModule: 'documents', engine: 'EPUB / eBook Pagination', status: 'virtualizado' },
  { extension: 'csv', name: 'Comma Separated Values', category: 'spreadsheet', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'documents', engine: 'YC Grid Matrix & Parser', status: 'completado' },
  { extension: 'xlsx', name: 'Excel Workbook', category: 'spreadsheet', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'documents', engine: 'Structured Sheet Engine', status: 'completado' },

  // Código & Texto
  { extension: 'txt', name: 'Texto Plano', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'Monaco Core Buffer', status: 'completado' },
  { extension: 'md', name: 'Markdown Formatted', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'Markdown Live Renderer', status: 'completado' },
  { extension: 'js', name: 'JavaScript ECMAScript', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'JS Syntax Highlighter & Runner', status: 'completado' },
  { extension: 'ts', name: 'TypeScript Source', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'TS Syntax Lexer', status: 'completado' },
  { extension: 'html', name: 'HyperText Markup Language', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'HTML Live Previewer', status: 'completado' },
  { extension: 'css', name: 'Cascading Style Sheets', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'CSS Analyzer', status: 'completado' },
  { extension: 'json', name: 'JavaScript Object Notation', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'JSON Schema Inspector & Tree', status: 'completado' },
  { extension: 'xml', name: 'eXtensible Markup Language', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'XML DOM Parser', status: 'completado' },
  { extension: 'yaml', name: 'YAML Ain\'t Markup Language', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'YAML Parser', status: 'completado' },
  { extension: 'log', name: 'System Log Stream', category: 'code', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'code', engine: 'Log Streamer with Filters', status: 'completado' },

  // Imágenes
  { extension: 'png', name: 'Portable Network Graphics', category: 'image', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'images', engine: 'Canvas 2D Matrix Engine', status: 'completado' },
  { extension: 'jpg', name: 'JPEG Image', category: 'image', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'images', engine: 'Canvas 2D Matrix Engine', status: 'completado' },
  { extension: 'jpeg', name: 'JPEG Image', category: 'image', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'images', engine: 'Canvas 2D Matrix Engine', status: 'completado' },
  { extension: 'webp', name: 'WebP Modern Image', category: 'image', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'images', engine: 'WebP GPU Pipeline', status: 'completado' },
  { extension: 'svg', name: 'Scalable Vector Graphics', category: 'image', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'images', engine: 'Vector XML Renderer', status: 'completado' },
  { extension: 'gif', name: 'Graphics Interchange Format', category: 'image', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: 'images', engine: 'Animated Canvas Decoder', status: 'completado' },
  { extension: 'bmp', name: 'Bitmap Image', category: 'image', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'images', engine: 'Direct Pixel Array Engine', status: 'nativo' },

  // Modelos 3D
  { extension: 'obj', name: 'Wavefront 3D Object', category: 'model3d', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: true, primaryModule: '3d', engine: 'Three.js OBJ Parser Engine', status: 'completado' },
  { extension: 'stl', name: 'Stereolithography CAD', category: 'model3d', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: true, primaryModule: '3d', engine: 'Three.js STL Mesh Engine', status: 'completado' },
  { extension: 'gltf', name: 'GL Transmission Format', category: 'model3d', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: '3d', engine: 'Three.js GLTFLoader', status: 'completado' },
  { extension: 'glb', name: 'Binary GLTF Container', category: 'model3d', canOpen: true, canView: true, canPlay: true, canEdit: false, canExport: true, primaryModule: '3d', engine: 'Three.js GLTFLoader', status: 'completado' },
  { extension: 'ply', name: 'Polygon File Format', category: 'model3d', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: false, primaryModule: '3d', engine: 'Three.js BufferGeometry Engine', status: 'completado' },

  // Compresión & Archivos
  { extension: 'zip', name: 'ZIP Archive Container', category: 'archive', canOpen: true, canView: true, canPlay: false, canEdit: true, canExport: true, primaryModule: 'archive', engine: 'Universal In-Memory Zip Engine', status: 'completado' },
  { extension: 'tar', name: 'Tarball Archive', category: 'archive', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: true, primaryModule: 'archive', engine: 'Tar Block Streamer', status: 'completado' },
  { extension: 'gz', name: 'GZip Compressed File', category: 'archive', canOpen: true, canView: true, canPlay: false, canEdit: false, canExport: false, primaryModule: 'archive', engine: 'Decompression Stream Native', status: 'nativo' }
];

export const INITIAL_FILES: WorkstationFile[] = [
  {
    id: 'f-readme',
    name: 'BIENVENIDO_YC_WORKSTATION.md',
    path: '/Documentos/BIENVENIDO_YC_WORKSTATION.md',
    size: 1480,
    type: 'code',
    extension: 'md',
    mimeType: 'text/markdown',
    lastModified: Date.now() - 3600000,
    favorite: true,
    content: `# YC UNIVERSAL WORKSTATION
### Tu espacio digital. Archivos, música, documentos y creación en un solo lugar.

## Empieza en 3 pasos
1. **Importa un archivo** con el botón dorado "Importar archivo" (arriba, siempre visible).
2. **Tócalo en tu biblioteca**: cada tipo de archivo abre su herramienta.
3. **Guarda o exporta** desde la herramienta que estés usando.

## Qué puedes hacer aquí
- **Reproductor**: audio y video, velocidad, subtítulos SRT/VTT y lista de reproducción.
- **Documentos**: leer, editar, anotar, firmar y exportar a PDF.
- **Código y texto**: editar y guardar en tu dispositivo.
- **Imágenes**: ver, girar y convertir de formato.
- **Modelos 3D**: ver el modelo aquí. Para editarlo o prepararlo para imprimir, ábrelo en YC Editor 3D: https://yc-suite.web.app
- **ZIP, proyectos, portapapeles y conversor** de formatos.

## Notas honestas
- Tus archivos se quedan en tu dispositivo; no hay cuenta ni nube.
- Los archivos muy grandes pueden no guardarse al cerrar la app: ten copia fuera de ella.
- Esta es una guía de inicio, no un documento real: puedes borrarla cuando quieras.
`
  }
];
