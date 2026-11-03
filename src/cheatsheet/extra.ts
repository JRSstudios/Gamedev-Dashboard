import type { CheatEntry } from './types'

const SR = 'https://docs.unity3d.com/6000.6/Documentation/ScriptReference'
const MANUAL = 'https://docs.unity3d.com/6000.6/Documentation/Manual'

/** Common building blocks most small games need sooner or later. */
export const EXTRA: CheatEntry[] = [
  {
    id: 'sys-pooling',
    title: 'Object Pooling: Schüsse ohne Ruckler',
    category: 'systems',
    perspectives: [],
    level: 2,
    summary: 'Statt jedes Projektil neu zu erzeugen und zu zerstören, holst du es aus einem Vorrat und gibst es zurück. Das spart Garbage Collection und verhindert kleine Ruckler.',
    steps: [
      'Projektil-Prefab mit Rigidbody 2D/3D und dem Skript „PooledProjectile“ anlegen.',
      'Leeres Objekt „ProjectilePool“ mit dem gleichnamigen Skript erstellen und das Prefab ins Feld ziehen.',
      'Zum Schießen pool.Spawn(position, richtung) aufrufen statt Instantiate.',
      'Das Projektil gibt sich nach Ablauf der Lebenszeit oder bei einem Treffer selbst zurück.',
    ],
    code: [
      {
        file: 'PooledProjectile.cs',
        text: `using UnityEngine;
using UnityEngine.Pool;

// A projectile that returns itself to its pool instead of being destroyed.
[RequireComponent(typeof(Rigidbody2D))]
public class PooledProjectile : MonoBehaviour
{
    [SerializeField] private float speed = 14f;
    [SerializeField] private float lifetime = 2f;

    private Rigidbody2D body;
    private IObjectPool<PooledProjectile> pool;
    private float timeLeft;

    private void Awake() => body = GetComponent<Rigidbody2D>();

    public void Launch(IObjectPool<PooledProjectile> owner, Vector2 direction)
    {
        pool = owner;
        timeLeft = lifetime;
        body.linearVelocity = direction.normalized * speed;
    }

    private void Update()
    {
        timeLeft -= Time.deltaTime;
        if (timeLeft <= 0f) pool?.Release(this);
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (other.TryGetComponent(out Health health)) health.TakeDamage(1);
        pool?.Release(this);
    }
}`,
      },
      {
        file: 'ProjectilePool.cs',
        text: `using UnityEngine;
using UnityEngine.Pool;

// Keeps projectiles ready for reuse. Call Spawn instead of Instantiate.
public class ProjectilePool : MonoBehaviour
{
    [SerializeField] private PooledProjectile prefab;
    [SerializeField] private int startSize = 20;
    [SerializeField] private int maxSize = 100;

    private ObjectPool<PooledProjectile> pool;

    private void Awake()
    {
        pool = new ObjectPool<PooledProjectile>(
            () => Instantiate(prefab, transform),
            p => p.gameObject.SetActive(true),
            p => p.gameObject.SetActive(false),
            p => Destroy(p.gameObject),
            true, startSize, maxSize);
    }

    public PooledProjectile Spawn(Vector2 position, Vector2 direction)
    {
        PooledProjectile p = pool.Get();
        p.transform.position = position;
        p.Launch(pool, direction);
        return p;
    }
}`,
      },
    ],
    pitfalls: [
      'Release zweimal für dasselbe Objekt wirft eine Fehlermeldung (collectionCheck). Nach dem Zurückgeben nichts mehr mit dem Objekt machen.',
      'Zurückgegebene Objekte behalten ihren Zustand: Geschwindigkeit, Lebenszeit und Farbe beim Holen immer neu setzen.',
    ],
    docs: [`${SR}/Pool.ObjectPool_1.html`],
  },
  {
    id: 'ai-state-machine',
    title: 'Gegner mit Zuständen: Patrouille, Verfolgen, Angriff',
    category: 'ai',
    perspectives: [],
    level: 2,
    summary: 'Ein kleiner Zustandsautomat macht Gegner übersichtlich: Jeder Zustand hat eigenes Verhalten und klare Wechsel-Regeln statt vieler verschachtelter ifs.',
    steps: [
      'Gegner mit Rigidbody 2D (oder 3D-Variante analog) und dem Skript „EnemyStateMachine“ ausstatten.',
      'Zwei leere Kind-Objekte als Patrouillenpunkte anlegen und ins Feld „waypoints“ ziehen.',
      'Den Spieler mit dem Tag „Player“ versehen; Sicht- und Angriffsreichweite im Inspector einstellen.',
      'Im Scene-View zeigen gelbe und rote Kreise die Reichweiten.',
    ],
    code: [
      {
        file: 'EnemyStateMachine.cs',
        text: `using UnityEngine;

// Patrol between waypoints, chase the player when close, attack when in reach.
[RequireComponent(typeof(Rigidbody2D))]
public class EnemyStateMachine : MonoBehaviour
{
    private enum State { Patrol, Chase, Attack }

    [SerializeField] private Transform[] waypoints;
    [SerializeField] private float speed = 2.5f;
    [SerializeField] private float sightRange = 5f;
    [SerializeField] private float attackRange = 1.2f;
    [SerializeField] private float attackCooldown = 1f;

    private Rigidbody2D body;
    private Transform player;
    private State state = State.Patrol;
    private int waypoint;
    private float nextAttack;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        GameObject p = GameObject.FindWithTag("Player");
        if (p != null) player = p.transform;
    }

    private void FixedUpdate()
    {
        float distance = player != null ? Vector2.Distance(transform.position, player.position) : float.MaxValue;
        state = distance <= attackRange ? State.Attack : distance <= sightRange ? State.Chase : State.Patrol;

        switch (state)
        {
            case State.Patrol:
                if (waypoints == null || waypoints.Length == 0) { Stop(); break; }
                MoveTowards(waypoints[waypoint].position);
                if (Vector2.Distance(transform.position, waypoints[waypoint].position) < 0.2f)
                    waypoint = (waypoint + 1) % waypoints.Length;
                break;
            case State.Chase:
                MoveTowards(player.position);
                break;
            case State.Attack:
                Stop();
                if (Time.time >= nextAttack && player.TryGetComponent(out Health health))
                {
                    health.TakeDamage(1);
                    nextAttack = Time.time + attackCooldown;
                }
                break;
        }
    }

    private void MoveTowards(Vector2 target)
    {
        Vector2 direction = (target - body.position).normalized;
        body.linearVelocity = new Vector2(direction.x * speed, body.linearVelocity.y);
    }

    private void Stop() => body.linearVelocity = new Vector2(0f, body.linearVelocity.y);

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, sightRange);
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
    }
}`,
      },
    ],
    pitfalls: [
      'Kein Spieler mit Tag „Player“ in der Szene: Der Gegner patrouilliert nur. Tag im Inspector oben links setzen.',
      'Gegner fällt durch den Boden oder dreht sich: Rigidbody 2D → Constraints → Freeze Rotation Z.',
    ],
    docs: [`${MANUAL}/rigidbody2d-body-types.html`],
  },
  {
    id: '2d-moving-platform',
    title: 'Bewegte Plattform, auf der der Spieler mitfährt',
    category: '2d',
    perspectives: ['2d-side'],
    level: 2,
    summary: 'Eine Plattform fährt zwischen zwei Punkten hin und her. Steht der Spieler darauf, wird er mitgenommen statt herunterzurutschen.',
    steps: [
      'Plattform-Sprite mit Box Collider 2D und Rigidbody 2D (Body Type: Kinematic) anlegen.',
      'Skript „MovingPlatform2D“ hinzufügen und zwei leere Objekte als Start- und Endpunkt zuweisen.',
      'Der Spieler braucht das Tag „Player“; er wird beim Betreten Kind der Plattform und beim Verlassen wieder gelöst.',
    ],
    code: [
      {
        file: 'MovingPlatform2D.cs',
        text: `using UnityEngine;

// Moves between two points with a kinematic body and carries the player along.
[RequireComponent(typeof(Rigidbody2D))]
public class MovingPlatform2D : MonoBehaviour
{
    [SerializeField] private Transform pointA;
    [SerializeField] private Transform pointB;
    [SerializeField] private float speed = 2f;
    [SerializeField] private float waitTime = 0.5f;

    private Rigidbody2D body;
    private Vector2 target;
    private float waitUntil;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        body.bodyType = RigidbodyType2D.Kinematic;
        target = pointB.position;
    }

    private void FixedUpdate()
    {
        if (Time.time < waitUntil) return;
        Vector2 next = Vector2.MoveTowards(body.position, target, speed * Time.fixedDeltaTime);
        body.MovePosition(next);
        if (Vector2.Distance(next, target) < 0.01f)
        {
            target = target == (Vector2)pointA.position ? pointB.position : pointA.position;
            waitUntil = Time.time + waitTime;
        }
    }

    private void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.collider.CompareTag("Player")) collision.transform.SetParent(transform);
    }

    private void OnCollisionExit2D(Collision2D collision)
    {
        if (collision.collider.CompareTag("Player") && gameObject.activeInHierarchy) collision.transform.SetParent(null);
    }
}`,
      },
    ],
    pitfalls: ['Plattform skaliert? Dann wird der Spieler beim Mitfahren verzerrt. Lieber das Sprite (Draw Mode „Tiled“) statt des Objekts größer machen.'],
    docs: [`${SR}/Rigidbody2D.MovePosition.html`],
  },
  {
    id: '2d-parallax',
    title: 'Parallax-Hintergrund für Tiefe',
    category: '2d',
    perspectives: ['2d-side', '2d-top'],
    level: 1,
    summary: 'Hintergrundebenen bewegen sich langsamer als die Kamera. Schon drei Ebenen (Himmel, Berge, Bäume) lassen eine 2D-Welt viel tiefer wirken.',
    steps: [
      'Pro Hintergrundebene ein Sprite anlegen und im Sorting Layer „Background“ hinten einsortieren.',
      'Skript „ParallaxLayer“ auf jede Ebene; factor 0.1 für weit Entferntes, 0.5 für Nahes.',
      'Für endlos wiederholte Hintergründe „repeatX“ einschalten; das Sprite muss nahtlos kacheln.',
    ],
    code: [
      {
        file: 'ParallaxLayer.cs',
        text: `using UnityEngine;

// Follows the camera at a fraction of its movement. 0 = stays in the world, 1 = moves with the camera.
public class ParallaxLayer : MonoBehaviour
{
    [SerializeField, Range(0f, 1f)] private float factor = 0.3f;
    [SerializeField] private bool repeatX;

    private Transform cam;
    private Vector3 startPosition;
    private Vector3 camStart;
    private float width;

    private void Start()
    {
        cam = Camera.main.transform;
        startPosition = transform.position;
        camStart = cam.position;
        if (TryGetComponent(out SpriteRenderer sprite)) width = sprite.bounds.size.x;
    }

    private void LateUpdate()
    {
        Vector3 moved = cam.position - camStart;
        transform.position = startPosition + new Vector3(moved.x * factor, moved.y * factor, 0f);
        if (repeatX && width > 0f)
        {
            float travelled = moved.x * (1f - factor);
            if (travelled > width) startPosition.x += width;
            else if (travelled < -width) startPosition.x -= width;
            if (Mathf.Abs(travelled) > width) camStart.x = cam.position.x;
        }
    }
}`,
      },
    ],
    pitfalls: ['Ruckelt der Hintergrund? Die Kamera bewegt sich in FixedUpdate, die Ebene in LateUpdate. Mit Cinemachine: Brain „Update Method“ auf „Late Update“ stellen.'],
    docs: [`${SR}/MonoBehaviour.LateUpdate.html`],
  },
  {
    id: 'sys-checkpoint',
    title: 'Checkpoints und Respawn',
    category: 'systems',
    perspectives: [],
    level: 1,
    summary: 'Läuft der Spieler durch einen Checkpoint, wird er dort wieder abgesetzt, wenn er stirbt oder in eine Grube fällt.',
    steps: [
      'Spieler mit „Health“ und „PlayerRespawn“ ausstatten; onDied von Health mit PlayerRespawn.Respawn verbinden.',
      'Checkpoint: Objekt mit Box Collider 2D (Is Trigger) und dem Skript „Checkpoint“.',
      'Für Gruben ein breites Trigger-Objekt unter das Level legen und im Skript „Checkpoint“ killZone anhaken.',
    ],
    code: [
      {
        file: 'PlayerRespawn.cs',
        text: `using UnityEngine;

// Remembers the last checkpoint and puts the player back there.
public class PlayerRespawn : MonoBehaviour
{
    public Vector3 RespawnPoint { get; set; }

    private void Start() => RespawnPoint = transform.position;

    public void Respawn()
    {
        transform.position = RespawnPoint;
        if (TryGetComponent(out Rigidbody2D body)) body.linearVelocity = Vector2.zero;
        if (TryGetComponent(out Health health)) health.Heal(health.Max);
    }
}`,
      },
      {
        file: 'Checkpoint.cs',
        text: `using UnityEngine;

// Trigger that saves the respawn point, or (as a kill zone) sends the player back to it.
public class Checkpoint : MonoBehaviour
{
    [SerializeField] private bool killZone;

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.TryGetComponent(out PlayerRespawn player)) return;
        if (killZone) player.Respawn();
        else player.RespawnPoint = transform.position;
    }
}`,
      },
    ],
    pitfalls: ['Respawn passiert nicht: Der Spieler braucht einen Rigidbody 2D, sonst meldet der Trigger nichts.'],
    docs: [`${SR}/MonoBehaviour.OnTriggerEnter2D.html`],
  },
  {
    id: 'ui-scene-fade',
    title: 'Szenenwechsel mit Überblendung',
    category: 'ui',
    perspectives: [],
    level: 2,
    summary: 'Statt hart zu schneiden, blendet das Bild kurz nach Schwarz, die nächste Szene lädt im Hintergrund und wird wieder eingeblendet.',
    steps: [
      'Canvas „Fader“ mit einem bildschirmfüllenden schwarzen Image und einer Canvas Group anlegen; Sort Order hoch (z. B. 100).',
      'Skript „SceneFader“ auf den Canvas, die Canvas Group ins Feld ziehen, Canvas als Prefab speichern und in die erste Szene legen.',
      'Szenen über File → Build Profiles → Scene List hinzufügen.',
      'Zum Wechseln SceneFader.Instance.LoadScene("Level2") aufrufen, z. B. von einem Ziel-Trigger oder Menü-Knopf.',
    ],
    code: [
      {
        file: 'SceneFader.cs',
        text: `using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

// Fades to black, loads the next scene asynchronously, fades back in. Survives scene changes.
public class SceneFader : MonoBehaviour
{
    public static SceneFader Instance { get; private set; }

    [SerializeField] private CanvasGroup group;
    [SerializeField] private float duration = 0.4f;

    private bool busy;

    private void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        group.alpha = 0f;
        group.blocksRaycasts = false;
    }

    public void LoadScene(string sceneName)
    {
        if (!busy) StartCoroutine(Fade(sceneName));
    }

    private IEnumerator Fade(string sceneName)
    {
        busy = true;
        group.blocksRaycasts = true;
        yield return FadeTo(1f);
        AsyncOperation load = SceneManager.LoadSceneAsync(sceneName);
        while (!load.isDone) yield return null;
        yield return FadeTo(0f);
        group.blocksRaycasts = false;
        busy = false;
    }

    private IEnumerator FadeTo(float target)
    {
        float start = group.alpha;
        for (float t = 0f; t < duration; t += Time.unscaledDeltaTime)
        {
            group.alpha = Mathf.Lerp(start, target, t / duration);
            yield return null;
        }
        group.alpha = target;
    }
}`,
      },
    ],
    pitfalls: [
      'Fehler „Scene couldn’t be loaded“: Die Szene fehlt in der Scene List des Build-Profils oder der Name ist falsch geschrieben.',
      'Zwei Fader nach dem Szenenwechsel? Den Fader nur in die erste Szene legen; das Skript zerstört doppelte Kopien selbst.',
    ],
    docs: [`${SR}/SceneManagement.SceneManager.LoadSceneAsync.html`],
  },
  {
    id: 'sys-dialogue',
    title: 'Einfache Dialoge mit ScriptableObjects',
    category: 'systems',
    perspectives: [],
    level: 2,
    summary: 'Dialogtexte liegen als eigene Dateien im Projekt und lassen sich ohne Code ändern. Eine Textbox zeigt Zeile für Zeile an.',
    steps: [
      'Rechtsklick im Project-Fenster → Create → Game → Dialogue; Sprecher und Zeilen eintragen.',
      'UI: Panel mit zwei TextMeshPro-Texten (Name, Text) anlegen, Skript „DialogueBox“ auf das Panel und die Texte zuweisen.',
      'Dialog starten mit dialogueBox.Show(dialog), weiter mit Next() (z. B. über einen Knopf oder die Interact-Taste).',
    ],
    code: [
      {
        file: 'DialogueData.cs',
        text: `using UnityEngine;

// One conversation as an asset: Create > Game > Dialogue.
[CreateAssetMenu(menuName = "Game/Dialogue")]
public class DialogueData : ScriptableObject
{
    public string speaker;
    [TextArea(2, 5)] public string[] lines;
}`,
      },
      {
        file: 'DialogueBox.cs',
        text: `using TMPro;
using UnityEngine;

// Shows a dialogue line by line. Next() advances, the box hides itself after the last line.
public class DialogueBox : MonoBehaviour
{
    [SerializeField] private TMP_Text nameText;
    [SerializeField] private TMP_Text bodyText;

    private DialogueData current;
    private int index;

    public bool IsOpen => current != null;

    private void Awake() => gameObject.SetActive(false);

    public void Show(DialogueData dialogue)
    {
        if (dialogue == null || dialogue.lines.Length == 0) return;
        current = dialogue;
        index = 0;
        gameObject.SetActive(true);
        nameText.text = dialogue.speaker;
        bodyText.text = dialogue.lines[0];
    }

    public void Next()
    {
        if (current == null) return;
        index++;
        if (index >= current.lines.Length)
        {
            current = null;
            gameObject.SetActive(false);
            return;
        }
        bodyText.text = current.lines[index];
    }
}`,
      },
    ],
    pitfalls: ['TextMeshPro meldet fehlende Schrift: Window → TextMeshPro → Import TMP Essential Resources einmal ausführen.'],
    docs: [`${SR}/CreateAssetMenuAttribute.html`, `${MANUAL}/class-ScriptableObject.html`],
  },
  {
    id: 'sys-interact',
    title: 'Interagieren mit Taste (Türen, Truhen, NPCs)',
    category: 'systems',
    perspectives: [],
    level: 1,
    summary: 'Steht der Spieler nahe genug an etwas, erscheint ein Hinweis; mit der Interact-Taste (E / Gamepad West) passiert etwas, das du im Inspector festlegst.',
    steps: [
      'Spieler: „PlayerInputReader“ und „PlayerInteractor“ hinzufügen.',
      'Objekt: Collider 2D mit Is Trigger, Skript „Interactable“; unter „onInteract“ festlegen, was passiert (z. B. DialogueBox.Show oder Tür öffnen).',
      'Optional ein Hinweis-Objekt („E drücken“) ins Feld „prompt“ ziehen; es wird nur in Reichweite angezeigt.',
    ],
    code: [
      {
        file: 'Interactable.cs',
        text: `using UnityEngine;
using UnityEngine.Events;

// Something the player can use while standing in its trigger.
public class Interactable : MonoBehaviour
{
    [SerializeField] private GameObject prompt;
    public UnityEvent onInteract;

    private void Awake()
    {
        if (prompt != null) prompt.SetActive(false);
    }

    public void SetHighlighted(bool on)
    {
        if (prompt != null) prompt.SetActive(on);
    }

    public void Interact() => onInteract?.Invoke();
}`,
      },
      {
        file: 'PlayerInteractor.cs',
        text: `using UnityEngine;

// Remembers the closest Interactable the player touches and uses it on the Interact action.
[RequireComponent(typeof(PlayerInputReader))]
public class PlayerInteractor : MonoBehaviour
{
    private PlayerInputReader input;
    private Interactable current;

    private void Awake() => input = GetComponent<PlayerInputReader>();

    private void Update()
    {
        if (current != null && input.InteractPressed) current.Interact();
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.TryGetComponent(out Interactable found)) return;
        if (current != null) current.SetHighlighted(false);
        current = found;
        current.SetHighlighted(true);
    }

    private void OnTriggerExit2D(Collider2D other)
    {
        if (current != null && other.gameObject == current.gameObject)
        {
            current.SetHighlighted(false);
            current = null;
        }
    }
}`,
      },
    ],
    pitfalls: ['Nichts passiert beim Drücken: In den Project-wide Actions muss eine Aktion „Interact“ existieren (bei neuen Unity-6-Projekten vorhanden).'],
    docs: [`${SR}/Events.UnityEvent.html`],
  },
]
