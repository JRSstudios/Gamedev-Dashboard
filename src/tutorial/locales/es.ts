import type { TutorialLocale } from '../content'

export const es: TutorialLocale = {
  lessons: {
    start: {
      title: 'Inicio: tu proyecto y Unity',
      intro: 'El panel es el centro entre Unity, Blender y Krita. Todo pertenece a un proyecto, normalmente uno por juego.',
      steps: [
        'En la página de bienvenida elige "Abrir proyecto de Unity" y la carpeta que contiene Assets y ProjectSettings.',
        'Si quieres, la app enlaza las imágenes, sonidos y modelos que ya están en Assets.',
        'La página de inicio (Resumen) muestra ahora las tarjetas de Unity, Blender y Krita, tu bandeja de entrada, sugerencias y próximos pasos.',
        'Cambia de proyecto con el menú de proyectos arriba en la navegación.',
      ],
      tip: 'Al enlazar archivos no se copia nada: el panel solo recuerda dónde están.',
    },
    plugins: {
      title: 'Instalar los plugins',
      intro: 'Pequeños plugins conectan Unity, Blender y Krita con el panel. Solo hablan con este ordenador y solo ejecutan comandos fijos.',
      steps: [
        'Abre la página de Unity y haz clic en "Instalar". El paquete se copia en Packages de tu proyecto de Unity.',
        'Abre la página de Blender, instala el add-on y activa "Gamedev Dashboard" en Blender en Preferencias > Add-ons.',
        'Abre la página de Krita, instala el plugin, actívalo en Krita en Configuración > Configurar Krita > Gestor de plugins de Python y reinicia Krita.',
        'Cuando un programa está abierto, su tarjeta en la página de inicio muestra "conectado".',
      ],
      tip: 'Puedes desactivar la conexión en cualquier momento en Ajustes > General.',
    },
    assets: {
      title: 'Recursos y bandeja de entrada',
      intro: 'Concept art, inspiración, modelos y audio tienen cada uno su sección. Los archivos nuevos llegan primero a la bandeja de entrada.',
      steps: [
        'Arrastra archivos desde el Explorador a cualquier parte de la ventana. Se ordenan solos por tipo y nombre.',
        'Si la categoría está mal, mueve la tarjeta a otra columna. La app aprende y la próxima vez ordena mejor.',
        'En la bandeja de entrada de la página de inicio añades exportaciones nuevas al proyecto con un clic o las envías directamente a Unity.',
        'Las sugerencias señalan archivos que faltan, categorías equivocadas y otras cosas que conviene revisar.',
      ],
      tip: 'Con Claude activado, "Ordenar con Claude" propone categorías y etiquetas para toda una vista.',
    },
    blender: {
      title: 'Blender: exportar automáticamente',
      intro: 'Con el add-on, cada guardado en Blender exporta un FBX o GLB listo para Unity y revisa el modelo.',
      steps: [
        'Enlaza una carpeta de exportación en la página de Blender.',
        'Guarda en Blender (Ctrl+S). El add-on exporta con los ejes y la escala correctos.',
        'La revisión del modelo avisa de escala no aplicada, UV que faltan, caras de más de cuatro vértices y demasiados triángulos.',
        'Activa la importación automática y, si quieres, "copiar a Unity": en cada exportación se actualiza el mismo archivo en Unity.',
      ],
      tip: 'En Modelos 3D puedes girar el modelo, compararlo con el concept art y crear un prefab en Unity.',
    },
    krita: {
      title: 'Krita: pintar y usarlo en el juego',
      intro: 'El plugin de Krita exporta un PNG en cada guardado y puede exportar cada capa como un sprite propio.',
      steps: [
        'Enlaza la carpeta de Krita en la página de Krita.',
        'Guarda tu archivo .kra. El PNG aparece en la bandeja de entrada o, con importación automática, directamente en Concept art.',
        'Usa "Exportar capas como sprites" para personajes o tilesets hechos de capas.',
        'Para pixel art activa "Pixel art" en la página de Unity: los sprites se importan nítidos y sin compresión.',
      ],
      tip: 'Los archivos .kra muestran una vista previa en el panel incluso sin Krita.',
    },
    planning: {
      title: 'Objetivos y planificación del tiempo',
      intro: 'Los objetivos tienen pasos y una barra de progreso. El planificador muestra cuánto tiempo tienes de verdad.',
      steps: [
        'Crea un objetivo en Objetivos, divídelo en pasos y pon una fecha límite y una estimación en horas.',
        'En Planificador > Semana indica cuándo trabajas o tienes clase y cuándo tienes tiempo para gamedev. Las plantillas ayudan a empezar.',
        'Planificador > Mes muestra las horas libres por día. Haz clic en un día para marcarlo como libre u ocupado.',
        'Planificador > Tiempo por sección compara las horas planificadas con el tiempo registrado y avisa si una fecha límite no cuadra.',
        'Inicia el temporizador (Ctrl+T) y elige un objetivo o una sección para que el tiempo cuente allí.',
      ],
      tip: 'Si una fecha límite está en riesgo, aparece una sugerencia en la página de inicio.',
    },
    workspace: {
      title: 'Páginas, tablas y nodos',
      intro: 'Todo lo que escribirías en Notion, OneNote u Obsidian vive aquí, junto a tu juego.',
      steps: [
        'Las páginas son documentos de bloques: títulos, listas, listas de tareas, imágenes y tablas. Escribe **negrita**, *cursiva* y `código`.',
        'Crea subpáginas para un árbol de páginas y enlaza páginas con [[Título]]. Las referencias inversas muestran quién enlaza una página.',
        'Las tablas tienen columnas con tipo y se pueden ver como tabla, tablero kanban, calendario o galería.',
        'Nodos es un lienzo donde objetivos, páginas, recursos y notas se convierten en tarjetas que conectas.',
      ],
      tip: 'Usa "Hoy" en Páginas para una entrada de devlog por día.',
    },
    knowledge: {
      title: 'Chuleta y lluvia de ideas',
      intro: 'La chuleta explica Unity 6 paso a paso, con código para copiar. La lluvia de ideas convierte una idea en un plan.',
      steps: [
        'Filtra la chuleta por 2D o 3D y por vista, o busca un mensaje de error.',
        'Copia código con un clic o convierte los pasos de una entrada en un objetivo.',
        'En Lluvia de ideas describe una idea. La app encuentra entradas adecuadas de la chuleta; con Claude escribe un plan completo.',
        'Los errores de Unity del plugin tienen un botón "Buscar ayuda" que abre la entrada adecuada.',
      ],
      tip: 'Tus propias entradas en la chuleta se pueden buscar igual que las incluidas.',
    },
    claude: {
      title: 'Claude: clave API o Claude Code',
      intro: 'Claude puede investigar, planificar, ordenar y escribir scripts. Nada cambia sin tu confirmación.',
      steps: [
        'En Ajustes > IA elige la conexión: una clave API (se paga por uso) o tu Claude Code instalado (usa tu suscripción).',
        'La clave API se guarda en el almacén de credenciales de Windows, nunca en el archivo de datos.',
        'Abre el asistente con Ctrl+J. Conoce tu proyecto y propone acciones que revisas una por una.',
        'El resumen de uso muestra tokens y costes estimados; un límite mensual te avisa a tiempo.',
      ],
      tip: 'Solo se envían títulos, nombres y notas, nunca el contenido de tus archivos.',
    },
    templates: {
      title: 'Plantillas',
      intro: 'Las plantillas te dan ventaja: objetivos, páginas, tablas y presupuestos de tiempo para un tipo de juego.',
      steps: [
        'Abre Plantillas y filtra por 2D o 3D.',
        'Haz clic en una plantilla para ver todo lo que crea, incluidos los scripts de C#.',
        'Instálala en el proyecto actual o como proyecto nuevo. "Quitar" la elimina de nuevo.',
        'Comparte tu propio proyecto con "Exportar como plantilla".',
      ],
      tip: 'Los scripts solo se copian a Unity cuando haces clic en "Copiar a Unity" después de leerlos.',
    },
    backup: {
      title: 'Copia de seguridad, deshacer y exportar',
      intro: 'Tus datos se quedan en tu ordenador. Varias redes de seguridad los protegen.',
      steps: [
        'Ctrl+Z deshace el último cambio en toda la app, Ctrl+Y lo rehace.',
        'Cada día se guarda una instantánea de tus datos (las últimas 14). Restáurala en Ajustes > Datos.',
        'Elige una carpeta de copia de seguridad, por ejemplo en tu nube, para tener allí una copia de cada instantánea.',
        'Exporta un proyecto como JSON o Markdown, o importa notas de Obsidian y Notion.',
      ],
      tip: 'Ctrl+Mayús+Espacio abre una nota rápida incluso con la ventana en segundo plano.',
    },
    firstgame: {
      title: 'Minicurso: tu primer juego',
      intro: 'Quince entradas de la chuleta en buen orden te llevan de un proyecto vacío de Unity a la build de un plataformas 2D terminado.',
      steps: [
        'Lee las entradas de abajo una tras otra; cada una tiene pasos y código.',
        'Haz clic en "Crear como objetivo" para tener un objetivo con un paso por entrada.',
        'Marca un paso cuando la entrada funcione en tu proyecto.',
        'No te saltes la build final: un juego pequeño terminado enseña más que uno grande sin terminar.',
      ],
      tip: '¿Atascado? Busca el mensaje de error en la chuleta o pregunta al asistente.',
    },
  },
  tour: {
    nav: { title: 'Navegación', text: 'Las secciones están agrupadas: Planificar, Conocimiento, Recursos y Herramientas. Haz clic en el nombre de un grupo para plegarlo.' },
    hub: { title: 'Tu centro', text: 'Unity, Blender y Krita de un vistazo. Un clic abre la página del programa.' },
    suggest: { title: 'Sugerencias', text: 'La app revisa tu proyecto y sugiere qué hacer. Aplica u oculta con un clic.' },
    palette: { title: 'Paleta de comandos', text: 'Ctrl+K lo encuentra todo: secciones, páginas, entradas de la chuleta y comandos de Claude.' },
    planner: { title: 'Planificador', text: 'Hoy, semana, mes y tiempo por sección: planifica con el tiempo que realmente tienes.' },
    assistant: { title: 'Asistente', text: 'Ctrl+J abre Claude con tu proyecto como contexto. Cada cambio necesita tu confirmación.' },
    settings: { title: 'Ajustes', text: 'Idioma, tema, IA, datos y este recorrido. Aquí puedes reiniciar el recorrido cuando quieras.' },
  },
}
