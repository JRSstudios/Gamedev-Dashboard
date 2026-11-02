import type { CheatEntry } from './types'

const SR = 'https://docs.unity3d.com/6000.6/Documentation/ScriptReference'
const MANUAL = 'https://docs.unity3d.com/6000.6/Documentation/Manual'

/** Physics, animation and 2D-specific tools. */
export const WORLD: CheatEntry[] = [
  {
    id: 'phys-collisions',
    title: 'Kollisionen und Trigger (Treffer, Pickups, Fallen)',
    category: 'physics',
    perspectives: [],
    level: 1,
    summary: 'Collider sind die Hitbox. „Is Trigger“ = man läuft hindurch und bekommt nur eine Meldung (Münze, Ziel). Ohne Trigger prallt man ab (Wand, Gegner).',
    steps: [
      'Damit überhaupt Meldungen kommen, braucht mindestens eines der beiden Objekte einen Rigidbody (2D oder 3D).',
      '2D: OnTriggerEnter2D(Collider2D) / OnCollisionEnter2D(Collision2D). 3D: OnTriggerEnter(Collider) / OnCollisionEnter(Collision).',
      'Wer getroffen wurde, erkennst du am Tag (CompareTag("Player")) oder an einer Komponente (TryGetComponent<Health>).',
      'Rigidbody „Kinematic“: bewegt sich nur per Code (Plattformen), wird nicht von Schwerkraft gezogen.',
    ],
    code: [
      {
        file: 'Pickup2D.cs',
        text: `using UnityEngine;

// Münze/Herz in 2D: Collider2D mit "Is Trigger" an diesem Objekt.
public class Pickup2D : MonoBehaviour
{
    [SerializeField] private int healAmount = 1;
    [SerializeField] private AudioClip sound;

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        if (other.TryGetComponent(out Health health)) health.Heal(healAmount);
        if (sound != null) AudioSource.PlayClipAtPoint(sound, transform.position);
        Destroy(gameObject);
    }
}`,
      },
      {
        file: 'DamageOnTouch.cs',
        text: `using UnityEngine;

// Stacheln/Gegner in 3D: fügt bei Berührung Schaden zu.
public class DamageOnTouch : MonoBehaviour
{
    [SerializeField] private int damage = 1;

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.collider.TryGetComponent(out Health health)) health.TakeDamage(damage);
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.TryGetComponent(out Health health)) health.TakeDamage(damage);
    }
}`,
      },
    ],
    pitfalls: ['2D und 3D mischen geht nicht: Collider2D trifft nie einen 3D-Collider.', 'Methodenname falsch geschrieben (z. B. OnTriggerEnter2d): Unity ruft sie dann einfach nie auf.'],
    docs: [`${MANUAL}/collider-interactions.html`, `${SR}/MonoBehaviour.OnTriggerEnter2D.html`],
  },
  {
    id: 'phys-raycast',
    title: 'Raycasts und Layer: Sicht, Schüsse, Bodenprüfung',
    category: 'physics',
    perspectives: [],
    level: 2,
    summary: 'Ein Raycast schickt einen unsichtbaren Strahl und meldet, was er trifft. Mit LayerMasks bestimmst du, was getroffen werden darf.',
    steps: [
      'Layer anlegen: oben im Inspector → Layer → Add Layer (z. B. Ground, Enemy, Player).',
      'Edit → Project Settings → Physics (bzw. Physics 2D) → Layer Collision Matrix: festlegen, wer mit wem kollidiert.',
      'Im Skript [SerializeField] LayerMask anlegen und im Inspector die Layer anhaken.',
    ],
    code: [
      {
        file: 'LineOfSight.cs',
        text: `using UnityEngine;

// Prüft, ob dieses Objekt das Ziel sehen kann (keine Wand dazwischen).
public class LineOfSight : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private float viewDistance = 15f;
    [SerializeField] private LayerMask obstacles;

    public bool CanSeeTarget()
    {
        Vector3 toTarget = target.position - transform.position;
        if (toTarget.magnitude > viewDistance) return false;
        // Trifft der Strahl ein Hindernis, bevor er das Ziel erreicht?
        return !Physics.Raycast(transform.position, toTarget.normalized, toTarget.magnitude, obstacles);
    }

    private void OnDrawGizmosSelected()
    {
        if (target == null) return;
        Gizmos.color = CanSeeTarget() ? Color.green : Color.red;
        Gizmos.DrawLine(transform.position, target.position);
    }
}`,
      },
    ],
    pitfalls: ['Der Strahl startet im eigenen Collider und trifft sich selbst: eigenen Layer aus der Maske nehmen.'],
    docs: [`${SR}/Physics.Raycast.html`, `${MANUAL}/LayerBasedCollision.html`],
  },
  {
    id: 'anim-animator',
    title: 'Animationen steuern (Animator, Parameter, Übergänge)',
    category: 'animation',
    perspectives: [],
    level: 1,
    summary: 'Ein Animator Controller ist ein Zustandsdiagramm: Idle, Laufen, Springen. Parameter (Speed, IsGrounded, Jump) aus deinem Skript entscheiden, wann gewechselt wird.',
    steps: [
      'Project → Create → Animation → Animator Controller. Auf das Modell/Sprite in das Feld „Controller“ der Animator-Komponente ziehen.',
      'Window → Animation → Animator öffnen. Clips (Idle, Run, Jump) hineinziehen. Rechtsklick → Make Transition.',
      'Parameters-Tab: Float „Speed“, Bool „IsGrounded“, Trigger „Jump“ anlegen.',
      'Übergang Idle → Run: Condition „Speed Greater 0.1“, „Has Exit Time“ aus, Transition Duration 0.1.',
      'Skript „AnimatorBridge“ setzt die Parameter jedes Bild.',
    ],
    code: [
      {
        file: 'AnimatorBridge.cs',
        text: `using UnityEngine;

// Übergibt Bewegungswerte an den Animator. Funktioniert für 2D (Rigidbody2D) und 3D (CharacterController).
public class AnimatorBridge : MonoBehaviour
{
    private static readonly int SpeedId = Animator.StringToHash("Speed");
    private static readonly int GroundedId = Animator.StringToHash("IsGrounded");
    private static readonly int JumpId = Animator.StringToHash("Jump");

    [SerializeField] private Animator animator;
    private Rigidbody2D body2D;
    private CharacterController controller;
    private PlayerInputReader input;

    private void Awake()
    {
        body2D = GetComponent<Rigidbody2D>();
        controller = GetComponent<CharacterController>();
        input = GetComponent<PlayerInputReader>();
    }

    private void Update()
    {
        float speed = body2D != null ? Mathf.Abs(body2D.linearVelocity.x)
            : controller != null ? new Vector3(controller.velocity.x, 0f, controller.velocity.z).magnitude
            : 0f;
        bool grounded = controller != null ? controller.isGrounded : Mathf.Abs(body2D != null ? body2D.linearVelocity.y : 0f) < 0.01f;

        animator.SetFloat(SpeedId, speed);
        animator.SetBool(GroundedId, grounded);
        if (input != null && input.JumpPressed && grounded) animator.SetTrigger(JumpId);
    }
}`,
      },
    ],
    pitfalls: ['Animation hängt hinterher: „Has Exit Time“ bei Übergängen aus Bewegung abschalten.', 'Figur rutscht durch die Animation weg: beim Modell „Apply Root Motion“ am Animator ausschalten, wenn dein Skript die Bewegung macht.'],
    docs: [`${MANUAL}/class-AnimatorController.html`, `${SR}/Animator.SetFloat.html`],
  },
  {
    id: 'anim-2d-sprites',
    title: '2D-Sprite-Animation aus einem Spritesheet',
    category: 'animation',
    perspectives: ['2d-side', '2d-top'],
    level: 1,
    summary: 'Ein Spritesheet (z. B. aus Krita oder Aseprite) wird in Einzelbilder zerschnitten. Die Einzelbilder ziehst du in die Szene und Unity erzeugt daraus den Animations-Clip.',
    steps: [
      'Bild auswählen → Inspector: Texture Type „Sprite (2D and UI)“, Sprite Mode „Multiple“, Pixels Per Unit passend (z. B. 32 bei 32-px-Figuren), Filter Mode „Point (no filter)“ für Pixel-Art, Compression „None“ → Apply.',
      '„Open Sprite Editor“ → Slice → Type „Grid By Cell Size“ → Zellgröße → Slice → Apply.',
      'Im Project-Fenster das Bild aufklappen, die Einzelbilder einer Animation markieren und in die Hierarchy ziehen → Speicherort für Clip wählen.',
      'Weitere Clips (Run, Jump) per Animation-Fenster → „Create New Clip“ anlegen und Bilder auf die Zeitleiste ziehen. Sample-Rate anpassen (z. B. 12).',
      'Blickrichtung: SpriteRenderer.flipX statt eigener Links-Animationen.',
    ],
    code: [],
    pitfalls: ['Unscharfe Pixel: Filter Mode nicht auf Point oder Compression nicht auf None.', 'Figur „hüpft“ zwischen Bildern: im Sprite Editor den Pivot aller Bilder gleich setzen (z. B. Bottom Center).'],
    docs: [`${MANUAL}/sprite/sprite-editor/sprite-editor-landing.html`, `${MANUAL}/AnimationOverview.html`],
  },
  {
    id: 'anim-blendtree',
    title: '3D-Figuren: Mixamo, Humanoid und Blend Trees',
    category: 'animation',
    perspectives: ['3d-third', '3d-first'],
    level: 2,
    summary: 'Für 3D-Figuren nutzt man Humanoid-Rigs. Damit passen Animationen von verschiedenen Quellen. Ein Blend Tree mischt Gehen und Rennen stufenlos nach Geschwindigkeit.',
    steps: [
      'Modell auswählen → Rig → Animation Type „Humanoid“ → Apply. Das Gleiche für alle Animations-FBX.',
      'Bei Lauf-Animationen im Tab Animation „Loop Time“ anhaken.',
      'Im Animator: Rechtsklick → Create State → From New Blend Tree. Doppelklick, Parameter „Speed“, Motions: Idle (0), Walk (2), Run (6).',
      'AnimatorBridge setzt „Speed“ aus der echten Geschwindigkeit.',
    ],
    code: [],
    pitfalls: ['Figur schwebt oder versinkt: im Import-Tab Animation „Root Transform Position (Y)“ → „Bake Into Pose“ und „Based Upon: Feet“.'],
    docs: [`${MANUAL}/BlendTree-1DBlending.html`, `${MANUAL}/ConfiguringtheAvatar.html`],
  },
  {
    id: '2d-tilemap',
    title: 'Level bauen mit Tilemaps und Rule Tiles',
    category: '2d',
    perspectives: ['2d-side', '2d-top'],
    level: 1,
    summary: 'Tilemaps sind Raster, in die du Kacheln malst wie in einem Malprogramm. Rule Tiles wählen automatisch die richtige Kante oder Ecke.',
    steps: [
      'Hierarchy → 2D Object → Tilemap → Rectangular. Für Top-Down mehrere Tilemaps (Boden, Wände, Deko) mit unterschiedlicher Order in Layer.',
      'Window → 2D → Tile Palette → Create New Palette → Tileset-Bild (vorher in Einzelkacheln geschnitten) hineinziehen.',
      'Malen mit Pinsel (B), Radierer (D), Füllen (G). Aktive Tilemap oben in der Palette wählen!',
      'Kollision: an der Wand-/Boden-Tilemap „Tilemap Collider 2D“, dazu „Composite Collider 2D“ (Rigidbody 2D wird mit hinzugefügt → Body Type Static). Beim Tilemap Collider 2D „Composite Operation: Merge“.',
      'Rule Tile: Package „2D Tilemap Extras“ → Create → 2D → Tiles → Rule Tile, Regeln pro Nachbarschaft festlegen.',
    ],
    code: [],
    pitfalls: ['Spieler bleibt an Kachelkanten hängen: Composite Collider 2D verwenden (macht eine glatte Fläche).', 'Lücken/Linien zwischen Kacheln: Sprite Atlas verwenden oder Pixel Perfect Camera aktivieren.'],
    docs: [`${MANUAL}/tilemaps/tilemaps-landing.html`, 'https://docs.unity3d.com/Packages/com.unity.2d.tilemap.extras@latest'],
  },
  {
    id: '2d-pixelperfect-light',
    title: 'Pixel-Perfect-Look und 2D-Licht',
    category: '2d',
    perspectives: ['2d-side', '2d-top'],
    level: 2,
    summary: 'Pixel Perfect Camera verhindert zitternde und verzerrte Pixel. URP 2D Lights geben Atmosphäre (Fackeln, Höhlen, Tag/Nacht).',
    steps: [
      'Main Camera → Add Component → „Pixel Perfect Camera“. Assets Pixels Per Unit = PPU deiner Sprites, Reference Resolution z. B. 320×180.',
      'Mit Cinemachine: an der 2D-Kamera die Extension „Cinemachine Pixel Perfect“ hinzufügen.',
      'Licht: Hierarchy → Light → Global Light 2D (Grundhelligkeit, z. B. 0.3), dazu Spot Light 2D für Fackeln.',
      'Lichter wirken nur mit dem 2D Renderer (Standard in der Vorlage „Universal 2D“).',
    ],
    code: [],
    pitfalls: ['Alles schwarz: Global Light 2D fehlt oder Intensity 0.'],
    docs: ['https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.2/manual/2d-pixelperfect.html', 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.2/manual/Lights-2D-intro.html'],
  },
]
