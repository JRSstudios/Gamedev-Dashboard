import type { CheatEntry } from './types'

const SR = 'https://docs.unity3d.com/6000.6/Documentation/ScriptReference'
const MANUAL = 'https://docs.unity3d.com/6000.6/Documentation/Manual'

export const START: CheatEntry[] = [
  {
    id: 'start-project',
    title: 'Unity 6.6 installieren und ein Projekt anlegen',
    category: 'start',
    perspectives: [],
    level: 1,
    summary: 'Unity Hub verwaltet Editor-Versionen und Projekte. Für 2D nimmst du die Vorlage „Universal 2D“, für 3D „Universal 3D“ (beide nutzen URP).',
    steps: [
      'Unity Hub installieren und mit deinem Unity-Konto anmelden.',
      'Installs → Install Editor → Unity 6.6 wählen. Unter „Modules“ „Windows Build Support“ (und ggf. „Web Build Support“) anhaken.',
      'Projects → New project → Vorlage „Universal 2D“ (2D-Spiele) oder „Universal 3D“ (3D-Spiele) wählen.',
      'Projektname und Speicherort festlegen (am besten ein interner Datenträger, kein USB-Stick) → Create project.',
      'Im Dashboard: „Unity-Projekt öffnen“ und genau diesen Ordner wählen, dann landen deine Assets per Drag & Drop direkt im Projekt.',
    ],
    code: [],
    pitfalls: [
      'Die Vorlage lässt sich später nur mühsam wechseln. 2.5D oder 3D mit Sprites? Nimm „Universal 3D“.',
      'Projekt nicht in OneDrive-/Cloud-Ordner legen: Unity schreibt sehr viele kleine Dateien und der Sync bremst oder sperrt sie.',
    ],
    docs: [`${MANUAL}/get-started.html`, `${MANUAL}/unity-hub.html`],
  },
  {
    id: 'start-editor',
    title: 'Der Editor in 5 Minuten',
    category: 'start',
    perspectives: [],
    level: 1,
    summary: 'Die wichtigsten Fenster: Scene (bauen), Game (spielen), Hierarchy (alles in der Szene), Inspector (Eigenschaften), Project (Dateien), Console (Meldungen und Fehler).',
    steps: [
      'Hierarchy: Rechtsklick → „Create Empty“ oder „3D Object“/„2D Object“, um Objekte anzulegen.',
      'Inspector: zeigt die Komponenten des ausgewählten Objekts. „Add Component“ fügt neue hinzu.',
      'Werkzeuge in der Szene: W = Verschieben, E = Drehen, R = Skalieren, T = Rechteck (2D/UI). F fokussiert das ausgewählte Objekt.',
      'Ctrl+P startet/stoppt den Play Mode. Änderungen im Play Mode werden beim Beenden zurückgesetzt!',
      'Ctrl+S speichert die Szene. Window → General → Console zeigt Fehler (rote Meldungen zuerst lösen).',
    ],
    code: [],
    pitfalls: ['Im Play Mode gemachte Einstellungen gehen verloren. Tipp: Edit → Preferences → Colors → „Playmode tint“ auffällig färben.'],
    docs: [`${MANUAL}/unity-editor.html`],
  },
  {
    id: 'start-gameobjects',
    title: 'GameObjects, Komponenten, Prefabs und Szenen',
    category: 'start',
    perspectives: [],
    level: 1,
    summary: 'Alles in Unity ist ein GameObject mit Komponenten (Transform, Renderer, Collider, deine Skripte). Prefabs sind wiederverwendbare Vorlagen, Szenen sind Level oder Menüs.',
    steps: [
      'Ein Objekt aus der Hierarchy ins Project-Fenster ziehen → es wird ein Prefab (blaues Würfel-Symbol).',
      'Prefab doppelklicken, um es zu bearbeiten. Änderungen gelten für alle Kopien in allen Szenen.',
      'Kopie in der Szene ändern → im Inspector „Overrides → Apply All“ überträgt sie auf das Prefab.',
      'Neue Szene: File → New Scene. Für das Spiel müssen Szenen in File → Build Profiles → Scene List stehen.',
      'Tags (z. B. „Player“, „Enemy“) und Layers (für Physik/Kamera) oben im Inspector setzen.',
    ],
    code: [],
    pitfalls: ['Gegner, Kugeln, Pickups immer als Prefab anlegen, sonst musst du jede Kopie einzeln ändern.'],
    docs: [`${MANUAL}/GameObjects.html`, `${MANUAL}/Prefabs.html`],
  },
  {
    id: 'cs-first-script',
    title: 'Dein erstes Skript und der Lebenszyklus',
    category: 'csharp',
    perspectives: [],
    level: 1,
    summary: 'Skripte sind Komponenten (Klassen, die von MonoBehaviour erben). Unity ruft bestimmte Methoden automatisch auf: Awake → Start → jedes Bild Update, für Physik FixedUpdate.',
    steps: [
      'Im Project-Fenster: Rechtsklick → Create → Scripting → MonoBehaviour Script. Dateiname = Klassenname (z. B. „Spinner“).',
      'Das Skript auf ein GameObject in der Hierarchy ziehen (oder Add Component → Name suchen).',
      'Doppelklick öffnet den Code-Editor (Visual Studio oder Rider). Speichern, zurück zu Unity: Unity kompiliert automatisch.',
      'Werte mit [SerializeField] erscheinen im Inspector und sind ohne Code änderbar.',
    ],
    code: [
      {
        file: 'Spinner.cs',
        text: `using UnityEngine;

// Rotates the object at a steady speed. Handy to check that your script runs.
public class Spinner : MonoBehaviour
{
    [SerializeField] private float degreesPerSecond = 90f; // adjustable in the Inspector

    private void Awake()
    {
        // Called once when loading (before Start). A good place for GetComponent.
    }

    private void Start()
    {
        Debug.Log("Spinner running on " + name);
    }

    private void Update()
    {
        // Time.deltaTime = seconds since the last frame -> same speed at 30 or 144 FPS
        transform.Rotate(0f, degreesPerSecond * Time.deltaTime, 0f);
    }
}`,
      },
    ],
    pitfalls: [
      'Dateiname und Klassenname müssen exakt gleich sein, sonst „The script class cannot be found“.',
      'Bewegung ohne Time.deltaTime läuft auf schnellen PCs schneller.',
      'Physik (Rigidbody) gehört in FixedUpdate, Eingaben lesen in Update.',
    ],
    docs: [`${MANUAL}/class-MonoBehaviour.html`, `${MANUAL}/execution-order.html`],
  },
  {
    id: 'cs-references',
    title: 'Komponenten und andere Objekte finden',
    category: 'csharp',
    perspectives: [],
    level: 1,
    summary: 'Andere Komponenten holst du mit GetComponent; Verweise auf andere Objekte ziehst du am einfachsten im Inspector in ein [SerializeField]-Feld.',
    steps: [
      'Feld anlegen: [SerializeField] private Transform target; → im Inspector das Objekt hineinziehen.',
      'Komponenten am selben Objekt: GetComponent<Rigidbody2D>() in Awake holen und speichern.',
      '[RequireComponent(typeof(...))] über der Klasse fügt fehlende Komponenten automatisch hinzu.',
      'Selten nötig: FindFirstObjectByType<T>() sucht in der ganzen Szene (langsam, nicht in Update benutzen).',
    ],
    code: [
      {
        file: 'Health.cs',
        text: `using UnityEngine;
using UnityEngine.Events;

// Health for the player or enemies. Other scripts call TakeDamage.
public class Health : MonoBehaviour
{
    [SerializeField] private int maxHealth = 5;
    public UnityEvent<int> onHealthChanged; // connect in the Inspector, e.g. to the health bar
    public UnityEvent onDied;

    public int Current { get; private set; }
    public int Max => maxHealth;

    private void Awake()
    {
        Current = maxHealth;
    }

    public void TakeDamage(int amount)
    {
        if (Current <= 0) return;
        Current = Mathf.Max(0, Current - amount);
        onHealthChanged?.Invoke(Current);
        if (Current == 0) onDied?.Invoke();
    }

    public void Heal(int amount)
    {
        Current = Mathf.Min(maxHealth, Current + amount);
        onHealthChanged?.Invoke(Current);
    }
}`,
      },
    ],
    pitfalls: ['GetComponent in Update ist unnötig teuer: einmal in Awake holen und in einem Feld speichern.', '„NullReferenceException“ heißt fast immer: Feld im Inspector nicht zugewiesen.'],
    docs: [`${SR}/Component.GetComponent.html`, `${SR}/RequireComponent.html`],
  },
  {
    id: 'cs-coroutines',
    title: 'Verzögern und Zeitabläufe (Coroutines)',
    category: 'csharp',
    perspectives: [],
    level: 2,
    summary: 'Mit Coroutines wartest du Sekunden ab, ohne das Spiel anzuhalten, z. B. Unverwundbarkeit nach Treffer, Respawn oder Blinken.',
    steps: [
      'Methode mit Rückgabetyp IEnumerator schreiben und darin yield return new WaitForSeconds(...) nutzen.',
      'Mit StartCoroutine(...) starten, mit StopCoroutine(...) stoppen.',
      'Coroutines laufen nur, solange das GameObject aktiv ist.',
    ],
    code: [
      {
        file: 'Blinker.cs',
        text: `using System.Collections;
using UnityEngine;

// Makes a sprite blink briefly after a hit (invincibility feedback).
public class Blinker : MonoBehaviour
{
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private float duration = 1f;
    [SerializeField] private float interval = 0.1f;

    public void Blink()
    {
        StopAllCoroutines();
        StartCoroutine(BlinkRoutine());
    }

    private IEnumerator BlinkRoutine()
    {
        float end = Time.time + duration;
        while (Time.time < end)
        {
            spriteRenderer.enabled = !spriteRenderer.enabled;
            yield return new WaitForSeconds(interval);
        }
        spriteRenderer.enabled = true;
    }
}`,
      },
    ],
    pitfalls: ['WaitForSeconds hängt von Time.timeScale ab. Im Pausenmenü (timeScale 0) stattdessen WaitForSecondsRealtime nehmen.'],
    docs: [`${MANUAL}/Coroutines.html`],
  },
]
