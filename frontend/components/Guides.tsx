import React from 'react';
import { BookOpen, Upload, FolderOpen, Download, Disc, Save, Box, ExternalLink, Sparkles, Mic, Search } from 'lucide-react';
import { YC_EDITOR_URL } from './HomeScreen';

interface Guide {
  id: string;
  icon: React.ReactNode;
  title: string;
  goal: string;
  steps: string[];
  tip?: string;
}

const GUIDES: Guide[] = [
  {
    id: 'importar',
    icon: <Upload className="w-5 h-5" />,
    title: 'Importar un archivo',
    goal: 'Meter un archivo de tu dispositivo a la Workstation.',
    steps: [
      'Toca el botón dorado "Importar archivo" (arriba, siempre visible) o el mismo botón dentro de Archivos.',
      'Elige el archivo en tu dispositivo: música, video, documento, imagen, código, modelo 3D o ZIP.',
      'El archivo se abre solo en su herramienta. Si es muy grande (varios MB), puede que no se guarde al cerrar la app: guárdalo también fuera de ella.',
    ],
    tip: 'También puedes crear un archivo nuevo desde Archivos → "Crear Archivo".',
  },
  {
    id: 'abrir',
    icon: <FolderOpen className="w-5 h-5" />,
    title: 'Abrir un archivo en la herramienta correcta',
    goal: 'Que cada archivo se abra donde se trabaja.',
    steps: [
      'Ve a "Archivos" (Mi biblioteca) y busca tu archivo por nombre o por filtro.',
      'Tócalo una vez: se abre en su herramienta según su tipo.',
      'Audio y video abren el Reproductor; documentos abren Documentos; código abre el Editor de Código; imágenes abren el Visor; STL y OBJ abren el visor 3D; ZIP abre el extractor.',
      'El archivo queda en una pestaña arriba: puedes tener varios abiertos y cambiar entre ellos.',
    ],
    tip: 'Si un archivo abre la herramienta equivocada, revisa su extensión (por ejemplo, .mp3, .pdf, .stl).',
  },
  {
    id: 'exportar',
    icon: <Download className="w-5 h-5" />,
    title: 'Exportar tu trabajo',
    goal: 'Sacar de la app lo que hiciste, en un archivo real.',
    steps: [
      'Documento: abre el documento y toca el botón de descarga. Se descarga un PDF real con el texto, tus anotaciones y tu firma si la agregaste.',
      'Código o texto: abre el archivo en el Editor de Código y toca "Guardar". Para bajarlo a tu dispositivo, usa el botón de descarga del editor.',
      'Imagen: usa Herramientas → Conversor, elige la imagen y el formato (PNG, JPG o WebP) y descarga el resultado.',
      'Datos (CSV, JSON, Markdown): usa Herramientas → Conversor, pestaña "Datos & Estructuras", transforma y descarga.',
    ],
    tip: 'Antes, el botón de exportar de documentos descargaba un .txt. Ahora descarga un PDF de verdad.',
  },
  {
    id: 'reproductor',
    icon: <Disc className="w-5 h-5" />,
    title: 'Usar el reproductor',
    goal: 'Escuchar música y ver video con controles y subtítulos.',
    steps: [
      'Importa un archivo de audio (MP3, WAV, FLAC, OGG) o video (MP4, WebM).',
      'Toca Reproducir. Cambia la velocidad (0.75x a 2x), el volumen y adelanta o retrasa 10 segundos.',
      'En la pestaña "Lista" ves tu cola: reordena o quita pistas.',
      'En la pestaña "Subtítulos" carga un archivo .srt o .vtt para ver los subtítulos sincronizados. Tócalos para saltar a ese momento.',
    ],
    tip: 'El reproductor es el centro de la pantalla inicial: ahí ves tu primera pista sin buscarla.',
  },
  {
    id: 'guardar',
    icon: <Save className="w-5 h-5" />,
    title: 'Guardar y recuperar tu trabajo',
    goal: 'Que nada se pierda al cambiar de vista o cerrar la app.',
    steps: [
      'Todo lo que importas, creas o editas se guarda en tu dispositivo al momento.',
      'Las anotaciones y firmas de un documento se guardan por archivo: si cambias de vista y vuelves, ahí siguen.',
      'Si la app te avisa que un archivo no se pudo guardar, es porque es demasiado grande para el almacenamiento del navegador. Descárgalo o guárdalo fuera de la app.',
      'Si borras los datos del navegador o desinstalas la app, los archivos guardados se pierden: ten copia de lo importante fuera de la app.',
    ],
    tip: 'No hay cuenta ni nube: nadie más ve tus archivos, pero tampoco hay copia de seguridad automática.',
  },
  {
    id: 'editor',
    icon: <Sparkles className="w-5 h-5" />,
    title: 'Editar fotos y videos',
    goal: 'Mejorar una foto o un video, quitarle el fondo y exportarlo.',
    steps: [
      'Ve a "Editor foto/video" (menú Crear) y sube una foto o un video, o elige uno de tu biblioteca.',
      'Foto: elige un filtro, ajusta brillo, contraste y saturación, o toca "Corrección automática". Para quitar el fondo, activa "Quitar fondo" y toca el fondo en la vista previa.',
      'Agrega texto y stickers: escríbelos, agrégalos y arrástralos sobre la vista previa para moverlos.',
      'Video: marca el inicio y el fin del tramo, ponle filtro y texto, y exporta en WebM (sin audio) o el cuadro actual en PNG.',
      'Foto con música: pestaña "Foto + música", agrega fotos y tu canción, elige segundos por foto y volumen, y exporta el video con música.',
    ],
    tip: 'Todo se hace en tu dispositivo: nada se sube. El video exportado sale sin audio; la foto con música sí lleva tu canción.',
  },
  {
    id: 'podcast',
    icon: <Mic className="w-5 h-5" />,
    title: 'Escuchar y grabar un podcast',
    goal: 'Escuchar episodios de audio y grabar uno con tu voz.',
    steps: [
      'Ve a "Podcast": ahí están tus audios de la biblioteca como episodios.',
      'Toca un episodio para escucharlo: puedes adelantar o retrasar 15 segundos y cambiar la velocidad.',
      'Para grabar: ponle título, elige una música de fondo si quieres, toca "Empezar a grabar" y habla. El micrófono solo se usa mientras grabas.',
      'Toca "Detener y guardar": el episodio se guarda en tu biblioteca como audio WebM.',
    ],
    tip: 'La música de fondo queda bajita para que se escuche tu voz.',
  },
  {
    id: 'buscar',
    icon: <Search className="w-5 h-5" />,
    title: 'Buscar en la web y en tu biblioteca',
    goal: 'Encontrar archivos tuyos o buscar algo en internet.',
    steps: [
      'Ve a "Buscar" y escribe lo que buscas: primero aparecen los archivos de tu biblioteca que coinciden.',
      'Toca un archivo para abrirlo en su herramienta.',
      'Para buscar en la web, elige el motor (DuckDuckGo, Google, Bing, YouTube o GitHub) y toca "Buscar en la web": los resultados se abren en una pestaña nueva.',
      'Tu historial de búsqueda vive solo en tu dispositivo y lo puedes borrar ahí mismo.',
    ],
    tip: 'Los motores no dejan mostrar sus resultados dentro de la app sin una clave de pago, por eso se abren aparte.',
  },
  {
    id: 'musica',
    icon: <Disc className="w-5 h-5" />,
    title: 'Música online: Spotify y Amazon Music',
    goal: 'Buscar música en Spotify y Amazon Music.',
    steps: [
      'Ve a "Música online" (menú Escuchar y ver).',
      'Spotify: sin conectar, la búsqueda abre open.spotify.com. Conectando tu cuenta (Client ID de Spotify), buscas dentro de la app y escuchas previews de 30 s; la reproducción completa necesita Premium.',
      'Amazon Music: busca y se abre en Amazon Music. No hay reproducción dentro de la app: Amazon no tiene API pública abierta para eso.',
    ],
    tip: 'Tu música local sigue en el Reproductor y en Podcast, sin cuentas.',
  },
  {
    id: 'modelos-3d',
    icon: <Box className="w-5 h-5" />,
    title: 'Modelos 3D',
    goal: 'Ver un modelo aquí y editarlo donde corresponde.',
    steps: [
      'Importa un archivo STL u OBJ: se abre en el visor 3D.',
      'Gíralo arrastrando con el mouse o el dedo, cambia la figura de demostración y activa la vista de alambre.',
      'Para editar la pieza, cortarla, vaciarla o prepararla para imprimir, abre YC Editor 3D.',
    ],
    tip: 'La edición 3D no vive en la Workstation: vive en YC Editor 3D.',
  },
];

export const Guides: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-obsidian-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-6 h-6 text-gold-400" />
            <h1 className="text-xl font-bold text-white">Guías</h1>
          </div>
          <p className="text-sm text-slate-400">
            Guías cortas, paso a paso, para usar la Workstation sin ayuda. Empieza por la primera y sigue en orden.
          </p>
        </div>

        {GUIDES.map((guide, idx) => (
          <section
            key={guide.id}
            className="bg-obsidian-900 border border-obsidian-800 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-gold-500/10 border border-gold-500/30 rounded-xl text-gold-400 shrink-0">
                {guide.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">
                  {idx + 1}. {guide.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{guide.goal}</p>
              </div>
            </div>
            <ol className="mt-4 space-y-2">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-obsidian-800 border border-gold-500/30 text-gold-300 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            {guide.tip && (
              <p className="mt-4 text-xs text-gold-300/90 bg-gold-500/10 border border-gold-500/20 rounded-xl px-3 py-2">
                Consejo: {guide.tip}
              </p>
            )}
            {guide.id === 'modelos-3d' && (
              <a
                href={YC_EDITOR_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gold-500 text-obsidian-950 hover:bg-gold-400 rounded-xl transition"
              >
                Abrir en YC Editor 3D <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </section>
        ))}

        <p className="text-center text-[11px] text-slate-500 font-mono pb-2">
          ¿Falta una guía? Pídela y se agrega aquí.
        </p>
      </div>
    </div>
  );
};
