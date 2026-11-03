import type { CheatLocale } from './types'

/** Translations of the entries in ../extra.ts. */
export const extraIt: CheatLocale = {
  'sys-pooling': {
    title: 'Object pooling: colpi senza scatti',
    summary: 'Invece di creare e distruggere ogni proiettile, ne prendi uno da una scorta e lo restituisci. Si risparmia garbage collection e si evitano piccoli scatti.',
    steps: [
      'Crea un prefab del proiettile con Rigidbody 2D/3D e lo script “PooledProjectile”.',
      'Crea un oggetto vuoto “ProjectilePool” con lo script omonimo e trascina il prefab nel campo.',
      'Per sparare chiama pool.Spawn(posizione, direzione) invece di Instantiate.',
      'Il proiettile si restituisce da solo quando scade la sua durata o colpisce qualcosa.',
    ],
    pitfalls: [
      'Restituire due volte lo stesso oggetto genera un errore (collectionCheck). Dopo la restituzione non usare più l’oggetto.',
      'Gli oggetti restituiti mantengono il loro stato: reimposta sempre velocità, durata e colore quando li prendi.',
    ],
  },
  'ai-state-machine': {
    title: 'Nemici con stati: pattuglia, inseguimento, attacco',
    summary: 'Una piccola macchina a stati rende i nemici leggibili: ogni stato ha il suo comportamento e regole chiare di passaggio invece di tanti if annidati.',
    steps: [
      'Dai al nemico un Rigidbody 2D (in 3D funziona allo stesso modo) e lo script “EnemyStateMachine”.',
      'Crea due oggetti figli vuoti come punti di pattuglia e trascinali nel campo “waypoints”.',
      'Assegna al giocatore il tag “Player”; imposta raggio visivo e di attacco nell’Inspector.',
      'Nella vista Scene cerchi gialli e rossi mostrano i raggi.',
    ],
    pitfalls: [
      'Nessun giocatore con tag “Player” nella scena: il nemico si limita a pattugliare. Imposta il tag in alto a sinistra nell’Inspector.',
      'Il nemico cade o ruota: Rigidbody 2D → Constraints → Freeze Rotation Z.',
    ],
  },
  '2d-moving-platform': {
    title: 'Piattaforma mobile su cui il giocatore viaggia',
    summary: 'Una piattaforma si muove avanti e indietro tra due punti. Se il giocatore ci sta sopra, viene trasportato invece di scivolare giù.',
    steps: [
      'Crea uno sprite piattaforma con Box Collider 2D e Rigidbody 2D (Body Type: Kinematic).',
      'Aggiungi lo script “MovingPlatform2D” e assegna due oggetti vuoti come punto di partenza e di arrivo.',
      'Il giocatore ha bisogno del tag “Player”; diventa figlio della piattaforma quando ci sale e viene staccato quando scende.',
    ],
    pitfalls: ['Piattaforma scalata? Il giocatore viene deformato durante il viaggio. Ingrandisci lo sprite (Draw Mode “Tiled”) invece dell’oggetto.'],
  },
  '2d-parallax': {
    title: 'Sfondo parallasse per dare profondità',
    summary: 'I livelli di sfondo si muovono più lentamente della telecamera. Già tre livelli (cielo, montagne, alberi) rendono un mondo 2D molto più profondo.',
    steps: [
      'Crea uno sprite per ogni livello di sfondo e mettilo dietro nel sorting layer “Background”.',
      'Aggiungi “ParallaxLayer” a ogni livello; factor 0.1 per ciò che è lontano, 0.5 per ciò che è vicino.',
      'Per sfondi che si ripetono all’infinito attiva “repeatX”; lo sprite deve affiancarsi senza giunture.',
    ],
    pitfalls: ['Lo sfondo trema? La telecamera si muove in FixedUpdate, il livello in LateUpdate. Con Cinemachine imposta “Update Method” del Brain su “Late Update”.'],
  },
  'sys-checkpoint': {
    title: 'Checkpoint e respawn',
    summary: 'Quando il giocatore attraversa un checkpoint, riappare lì dopo essere morto o caduto in una buca.',
    steps: [
      'Dai al giocatore “Health” e “PlayerRespawn”; collega onDied di Health a PlayerRespawn.Respawn.',
      'Checkpoint: oggetto con Box Collider 2D (Is Trigger) e lo script “Checkpoint”.',
      'Per le buche metti un ampio oggetto trigger sotto il livello e spunta killZone nel suo script “Checkpoint”.',
    ],
    pitfalls: ['Il respawn non avviene: il giocatore ha bisogno di un Rigidbody 2D, altrimenti il trigger non segnala nulla.'],
  },
  'ui-scene-fade': {
    title: 'Cambio scena con dissolvenza',
    summary: 'Invece di un taglio netto, l’immagine sfuma al nero, la scena successiva si carica in background e riappare.',
    steps: [
      'Crea un canvas “Fader” con un’immagine nera a tutto schermo e un Canvas Group; Sort Order alto (es. 100).',
      'Metti lo script “SceneFader” sul canvas, trascina il Canvas Group nel campo, salva il canvas come prefab e mettilo nella prima scena.',
      'Aggiungi le scene in File → Build Profiles → Scene List.',
      'Per cambiare chiama SceneFader.Instance.LoadScene("Level2"), ad esempio da un trigger di arrivo o da un pulsante del menu.',
    ],
    pitfalls: [
      'Errore “Scene couldn’t be loaded”: la scena manca nella Scene List del profilo di build o il nome è scritto male.',
      'Due fader dopo il cambio scena? Metti il fader solo nella prima scena; lo script distrugge da solo le copie doppie.',
    ],
  },
  'sys-dialogue': {
    title: 'Dialoghi semplici con ScriptableObject',
    summary: 'I testi dei dialoghi sono file a sé nel progetto e si modificano senza codice. Una casella di testo li mostra riga per riga.',
    steps: [
      'Clic destro nella finestra Project → Create → Game → Dialogue; inserisci chi parla e le righe.',
      'UI: crea un pannello con due testi TextMeshPro (nome, testo), metti “DialogueBox” sul pannello e assegna i testi.',
      'Avvia un dialogo con dialogueBox.Show(dialogo), prosegui con Next() (es. da un pulsante o dal tasto Interact).',
    ],
    pitfalls: ['TextMeshPro segnala un font mancante: esegui una volta Window → TextMeshPro → Import TMP Essential Resources.'],
  },
  'sys-interact': {
    title: 'Interagire con un tasto (porte, forzieri, PNG)',
    summary: 'Quando il giocatore è abbastanza vicino a qualcosa appare un suggerimento; il tasto Interact (E / gamepad ovest) attiva ciò che imposti nell’Inspector.',
    steps: [
      'Giocatore: aggiungi “PlayerInputReader” e “PlayerInteractor”.',
      'Oggetto: Collider 2D con Is Trigger e lo script “Interactable”; in “onInteract” scegli cosa succede (es. DialogueBox.Show o aprire una porta).',
      'Facoltativo: trascina un oggetto suggerimento (“Premi E”) nel campo “prompt”; appare solo nel raggio d’azione.',
    ],
    pitfalls: ['Non succede nulla premendo il tasto: tra le azioni del progetto deve esserci un’azione “Interact” (i nuovi progetti Unity 6 ce l’hanno).'],
  },
}
