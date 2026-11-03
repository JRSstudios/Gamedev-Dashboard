import type { CheatLocale } from './types'

/** Translations of the entries in ../extra.ts. */
export const extraEs: CheatLocale = {
  'sys-pooling': {
    title: 'Object pooling: disparos sin tirones',
    summary: 'En lugar de crear y destruir cada proyectil, tomas uno de una reserva y lo devuelves. Ahorra recolección de basura y evita pequeños tirones.',
    steps: [
      'Crea un prefab de proyectil con Rigidbody 2D/3D y el script “PooledProjectile”.',
      'Crea un objeto vacío “ProjectilePool” con el script del mismo nombre y arrastra el prefab a su campo.',
      'Para disparar llama a pool.Spawn(posición, dirección) en lugar de Instantiate.',
      'El proyectil se devuelve solo cuando acaba su vida o golpea algo.',
    ],
    pitfalls: [
      'Devolver dos veces el mismo objeto lanza un error (collectionCheck). No uses el objeto después de devolverlo.',
      'Los objetos devueltos conservan su estado: vuelve a poner velocidad, vida y color cada vez que tomes uno.',
    ],
  },
  'ai-state-machine': {
    title: 'Enemigos con estados: patrulla, persecución, ataque',
    summary: 'Una pequeña máquina de estados mantiene a los enemigos legibles: cada estado tiene su comportamiento y reglas claras de cambio en lugar de muchos if anidados.',
    steps: [
      'Dale al enemigo un Rigidbody 2D (en 3D funciona igual) y el script “EnemyStateMachine”.',
      'Crea dos objetos hijos vacíos como puntos de patrulla y arrástralos al campo “waypoints”.',
      'Ponle al jugador la etiqueta “Player”; ajusta el alcance de visión y de ataque en el Inspector.',
      'En la vista Scene, círculos amarillos y rojos muestran los alcances.',
    ],
    pitfalls: [
      'No hay jugador con la etiqueta “Player” en la escena: el enemigo solo patrulla. Pon la etiqueta arriba a la izquierda en el Inspector.',
      'El enemigo se cae o gira: Rigidbody 2D → Constraints → Freeze Rotation Z.',
    ],
  },
  '2d-moving-platform': {
    title: 'Plataforma móvil sobre la que viaja el jugador',
    summary: 'Una plataforma va y viene entre dos puntos. Si el jugador está encima, viaja con ella en lugar de resbalar.',
    steps: [
      'Crea un sprite de plataforma con Box Collider 2D y Rigidbody 2D (Body Type: Kinematic).',
      'Añade el script “MovingPlatform2D” y asigna dos objetos vacíos como punto inicial y final.',
      'El jugador necesita la etiqueta “Player”; se vuelve hijo de la plataforma al subir y se suelta al bajar.',
    ],
    pitfalls: ['¿Plataforma escalada? El jugador se deforma al viajar. Agranda el sprite (Draw Mode “Tiled”) en lugar del objeto.'],
  },
  '2d-parallax': {
    title: 'Fondo con parallax para dar profundidad',
    summary: 'Las capas de fondo se mueven más despacio que la cámara. Con solo tres capas (cielo, montañas, árboles) un mundo 2D parece mucho más profundo.',
    steps: [
      'Crea un sprite por capa de fondo y colócalo atrás en la sorting layer “Background”.',
      'Añade “ParallaxLayer” a cada capa; factor 0.1 para lo lejano, 0.5 para lo cercano.',
      'Para fondos que se repiten sin fin activa “repeatX”; el sprite debe encajar sin costuras.',
    ],
    pitfalls: ['¿El fondo tiembla? La cámara se mueve en FixedUpdate y la capa en LateUpdate. Con Cinemachine pon el “Update Method” del Brain en “Late Update”.'],
  },
  'sys-checkpoint': {
    title: 'Puntos de control y reaparición',
    summary: 'Cuando el jugador pasa por un punto de control, reaparece allí si muere o cae a un foso.',
    steps: [
      'Dale al jugador “Health” y “PlayerRespawn”; conecta onDied de Health con PlayerRespawn.Respawn.',
      'Punto de control: un objeto con Box Collider 2D (Is Trigger) y el script “Checkpoint”.',
      'Para fosos, pon un trigger ancho bajo el nivel y marca killZone en su script “Checkpoint”.',
    ],
    pitfalls: ['No reaparece: el jugador necesita un Rigidbody 2D; si no, el trigger no avisa de nada.'],
  },
  'ui-scene-fade': {
    title: 'Cambio de escena con fundido',
    summary: 'En lugar de un corte brusco, la imagen se funde a negro, la siguiente escena carga en segundo plano y vuelve a aparecer.',
    steps: [
      'Crea un canvas “Fader” con una Image negra a pantalla completa y un Canvas Group; pon un Sort Order alto (p. ej. 100).',
      'Pon el script “SceneFader” en el canvas, arrastra el Canvas Group a su campo, guarda el canvas como prefab y colócalo en la primera escena.',
      'Añade las escenas en File → Build Profiles → Scene List.',
      'Para cambiar llama a SceneFader.Instance.LoadScene("Level2"), p. ej. desde un trigger de meta o un botón de menú.',
    ],
    pitfalls: [
      'Error “Scene couldn’t be loaded”: la escena falta en la Scene List del perfil de build o el nombre está mal escrito.',
      '¿Dos faders tras cambiar de escena? Pon el fader solo en la primera escena; el script destruye las copias duplicadas.',
    ],
  },
  'sys-dialogue': {
    title: 'Diálogos sencillos con ScriptableObjects',
    summary: 'Los textos de diálogo son archivos propios en el proyecto y se cambian sin código. Una caja de texto los muestra línea a línea.',
    steps: [
      'Clic derecho en la ventana Project → Create → Game → Dialogue; escribe quién habla y las líneas.',
      'UI: crea un panel con dos textos TextMeshPro (nombre, texto), pon “DialogueBox” en el panel y asigna los textos.',
      'Inicia un diálogo con dialogueBox.Show(diálogo) y avanza con Next() (p. ej. con un botón o la tecla Interact).',
    ],
    pitfalls: ['TextMeshPro avisa de que falta una fuente: ejecuta una vez Window → TextMeshPro → Import TMP Essential Resources.'],
  },
  'sys-interact': {
    title: 'Interactuar con una tecla (puertas, cofres, PNJ)',
    summary: 'Cuando el jugador está lo bastante cerca de algo aparece un aviso; la tecla Interact (E / botón oeste del mando) activa lo que configures en el Inspector.',
    steps: [
      'Jugador: añade “PlayerInputReader” y “PlayerInteractor”.',
      'Objeto: Collider 2D con Is Trigger y el script “Interactable”; en “onInteract” elige qué pasa (p. ej. DialogueBox.Show o abrir una puerta).',
      'Opcional: arrastra un objeto de aviso (“Pulsa E”) al campo “prompt”; solo se muestra dentro del alcance.',
    ],
    pitfalls: ['No pasa nada al pulsar: las acciones del proyecto necesitan una acción “Interact” (los proyectos nuevos de Unity 6 la tienen).'],
  },
}
