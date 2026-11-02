import type { CheatEntry } from './types'

const SR = 'https://docs.unity3d.com/6000.6/Documentation/ScriptReference'

export const MOVEMENT: CheatEntry[] = [
  {
    id: 'move-2d-platformer',
    title: '2D Jump’n’Run: Laufen, Springen, Coyote Time, Jump Buffer',
    category: 'movement',
    perspectives: ['2d-side'],
    level: 1,
    summary: 'Klassische Seitenansicht wie Celeste oder Hollow Knight. Mit Coyote Time (kurz nach der Kante noch springen) und Jump Buffer (Sprung kurz vor der Landung merken) fühlt sich die Steuerung sofort gut an.',
    steps: [
      'Spieler-Objekt: Sprite, „Rigidbody 2D“ (Body Type Dynamic, Collision Detection Continuous, Interpolate, Constraints → Freeze Rotation Z), „Capsule Collider 2D“.',
      'Skripte „PlayerInputReader“ (siehe Input-Eintrag) und „PlatformerController2D“ hinzufügen.',
      'Leeres Kind-Objekt „GroundCheck“ an die Füße setzen und ins Feld groundCheck ziehen.',
      'Boden-Objekte auf einen Layer „Ground“ legen und im Feld groundLayer auswählen.',
      'Gravity Scale am Rigidbody auf ca. 3 stellen, dann fühlt sich der Sprung weniger „schwebend“ an.',
    ],
    code: [
      {
        file: 'PlatformerController2D.cs',
        text: `using UnityEngine;

// Seitenansicht: laufen, springen, variable Sprunghöhe, Coyote Time und Jump Buffer.
[RequireComponent(typeof(Rigidbody2D), typeof(PlayerInputReader))]
public class PlatformerController2D : MonoBehaviour
{
    [Header("Laufen")]
    [SerializeField] private float moveSpeed = 8f;
    [SerializeField] private float acceleration = 60f;

    [Header("Springen")]
    [SerializeField] private float jumpVelocity = 14f;
    [SerializeField] private float coyoteTime = 0.1f;   // Sekunden nach Verlassen der Kante
    [SerializeField] private float jumpBuffer = 0.12f;  // Sekunden vor der Landung
    [SerializeField] private float jumpCutMultiplier = 0.5f; // Taste früh losgelassen = kleiner Sprung

    [Header("Boden")]
    [SerializeField] private Transform groundCheck;
    [SerializeField] private float groundRadius = 0.15f;
    [SerializeField] private LayerMask groundLayer;

    private Rigidbody2D body;
    private PlayerInputReader input;
    private SpriteRenderer sprite;
    private float lastGroundedTime = -10f;
    private float lastJumpPressedTime = -10f;

    public bool IsGrounded { get; private set; }

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        input = GetComponent<PlayerInputReader>();
        sprite = GetComponentInChildren<SpriteRenderer>();
    }

    private void Update()
    {
        IsGrounded = Physics2D.OverlapCircle(groundCheck.position, groundRadius, groundLayer);
        if (IsGrounded) lastGroundedTime = Time.time;
        if (input.JumpPressed) lastJumpPressedTime = Time.time;

        bool canJump = Time.time - lastGroundedTime <= coyoteTime;
        bool wantsJump = Time.time - lastJumpPressedTime <= jumpBuffer;
        if (canJump && wantsJump)
        {
            body.linearVelocity = new Vector2(body.linearVelocity.x, jumpVelocity);
            lastJumpPressedTime = -10f;
            lastGroundedTime = -10f;
        }

        // Taste früh losgelassen: Sprung abschneiden
        if (!input.JumpHeld && body.linearVelocity.y > 0f)
        {
            body.linearVelocity = new Vector2(body.linearVelocity.x, body.linearVelocity.y * jumpCutMultiplier);
        }

        if (sprite != null && Mathf.Abs(input.Move.x) > 0.01f) sprite.flipX = input.Move.x < 0f;
    }

    private void FixedUpdate()
    {
        float target = input.Move.x * moveSpeed;
        float x = Mathf.MoveTowards(body.linearVelocity.x, target, acceleration * Time.fixedDeltaTime);
        body.linearVelocity = new Vector2(x, body.linearVelocity.y);
    }

    private void OnDrawGizmosSelected()
    {
        if (groundCheck == null) return;
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(groundCheck.position, groundRadius);
    }
}`,
      },
    ],
    pitfalls: [
      'Spieler springt nie: Ground-Layer nicht gesetzt oder GroundCheck liegt nicht unter den Füßen (gelber Kreis im Scene-View sichtbar).',
      'Spieler bleibt an Wänden kleben: Physics Material 2D mit Friction 0 auf den Collider des Spielers legen.',
      'Unity 6: velocity heißt jetzt linearVelocity (alter Name ist veraltet).',
    ],
    docs: [`${SR}/Rigidbody2D-linearVelocity.html`, `${SR}/Physics2D.OverlapCircle.html`],
  },
  {
    id: 'move-2d-topdown',
    title: '2D Top-Down: in 8 Richtungen laufen',
    category: 'movement',
    perspectives: ['2d-top'],
    level: 1,
    summary: 'Ansicht von oben wie Stardew Valley oder Zelda. Keine Schwerkraft, Bewegung in alle Richtungen, diagonal nicht schneller.',
    steps: [
      'Spieler: Sprite, „Rigidbody 2D“ mit Gravity Scale 0, Freeze Rotation Z, Interpolate. Ein „Box Collider 2D“ oder „Capsule Collider 2D“ an den Füßen.',
      'Skripte „PlayerInputReader“ und „TopDownController2D“ hinzufügen.',
      'Wände: Tilemap mit „Tilemap Collider 2D“ (siehe 2D-Kapitel) oder einfache Box Collider 2D.',
      'Für Laufanimationen: im Animator Float-Parameter „MoveX“, „MoveY“, „Speed“ setzen (Blend Tree 2D).',
    ],
    code: [
      {
        file: 'TopDownController2D.cs',
        text: `using UnityEngine;

// Ansicht von oben: Bewegung in alle Richtungen, Blickrichtung für Animationen.
[RequireComponent(typeof(Rigidbody2D), typeof(PlayerInputReader))]
public class TopDownController2D : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float sprintMultiplier = 1.6f;
    [SerializeField] private Animator animator; // optional

    private Rigidbody2D body;
    private PlayerInputReader input;

    public Vector2 Facing { get; private set; } = Vector2.down;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        input = GetComponent<PlayerInputReader>();
    }

    private void Update()
    {
        if (input.Move.sqrMagnitude > 0.01f) Facing = input.Move.normalized;
        if (animator != null)
        {
            animator.SetFloat("MoveX", Facing.x);
            animator.SetFloat("MoveY", Facing.y);
            animator.SetFloat("Speed", input.Move.magnitude);
        }
    }

    private void FixedUpdate()
    {
        // ClampMagnitude: diagonal nicht schneller als geradeaus
        Vector2 move = Vector2.ClampMagnitude(input.Move, 1f);
        float speed = moveSpeed * (input.SprintHeld ? sprintMultiplier : 1f);
        body.linearVelocity = move * speed;
    }
}`,
      },
    ],
    pitfalls: ['Figur dreht sich bei Kollisionen: Freeze Rotation Z vergessen.', 'Objekte überlappen falsch: Edit → Project Settings → Graphics → Transparency Sort Mode „Custom Axis“ (0, 1, 0) für „wer weiter unten steht, ist vorne“.'],
    docs: [`${SR}/Rigidbody2D.html`],
  },
  {
    id: 'move-3d-third',
    title: '3D Third Person: kamerarelativ laufen, springen, drehen',
    category: 'movement',
    perspectives: ['3d-third'],
    level: 2,
    summary: 'Die Kamera schaut von hinten über die Schulter (Zelda, Fortnite). „Vorwärts“ ist immer dort, wohin die Kamera schaut, und die Figur dreht sich weich in Laufrichtung.',
    steps: [
      'Spieler: Capsule (oder dein Modell) mit „Character Controller“ (Height ~2, Center Y ~1). Keinen Rigidbody zusätzlich!',
      'Skripte „PlayerInputReader“ und „ThirdPersonController“ hinzufügen.',
      'Kamera: Cinemachine FreeLook Camera mit Tracking Target = Spieler (siehe Kamera-Kapitel).',
      'Im Feld cameraTransform die Main Camera eintragen (oder leer lassen, dann wird Camera.main genutzt).',
    ],
    code: [
      {
        file: 'ThirdPersonController.cs',
        text: `using UnityEngine;

// Third Person mit CharacterController: Bewegung relativ zur Kamera, Sprung, Schwerkraft.
[RequireComponent(typeof(CharacterController), typeof(PlayerInputReader))]
public class ThirdPersonController : MonoBehaviour
{
    [SerializeField] private float walkSpeed = 4f;
    [SerializeField] private float sprintSpeed = 7f;
    [SerializeField] private float turnSpeed = 720f;   // Grad pro Sekunde
    [SerializeField] private float jumpHeight = 1.2f;
    [SerializeField] private float gravity = -20f;
    [SerializeField] private Transform cameraTransform;

    private CharacterController controller;
    private PlayerInputReader input;
    private float verticalVelocity;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
        input = GetComponent<PlayerInputReader>();
        if (cameraTransform == null && Camera.main != null) cameraTransform = Camera.main.transform;
    }

    private void Update()
    {
        // Richtung der Kamera auf den Boden projizieren
        Vector3 forward = Vector3.ProjectOnPlane(cameraTransform.forward, Vector3.up).normalized;
        Vector3 right = Vector3.ProjectOnPlane(cameraTransform.right, Vector3.up).normalized;
        Vector3 move = forward * input.Move.y + right * input.Move.x;
        move = Vector3.ClampMagnitude(move, 1f);

        if (move.sqrMagnitude > 0.001f)
        {
            Quaternion target = Quaternion.LookRotation(move, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, target, turnSpeed * Time.deltaTime);
        }

        if (controller.isGrounded && verticalVelocity < 0f) verticalVelocity = -2f; // am Boden halten
        if (controller.isGrounded && input.JumpPressed) verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
        verticalVelocity += gravity * Time.deltaTime;

        float speed = input.SprintHeld ? sprintSpeed : walkSpeed;
        Vector3 velocity = move * speed + Vector3.up * verticalVelocity;
        controller.Move(velocity * Time.deltaTime);
    }
}`,
      },
    ],
    pitfalls: [
      'CharacterController und Rigidbody nicht kombinieren, die bekämpfen sich.',
      'isGrounded flackert auf Treppen: Step Offset und Slope Limit am Character Controller erhöhen.',
      'Figur „läuft rückwärts“: Modell schaut im Prefab nicht entlang der blauen Z-Achse. Modell als Kind-Objekt drehen, nicht das Spieler-Objekt.',
    ],
    docs: [`${SR}/CharacterController.Move.html`, `${SR}/Vector3.ProjectOnPlane.html`],
  },
  {
    id: 'move-3d-first',
    title: '3D First Person: laufen und mit der Maus umsehen',
    category: 'movement',
    perspectives: ['3d-first'],
    level: 2,
    summary: 'Ego-Perspektive wie in Shootern oder Erkundungsspielen. Der Körper dreht sich links/rechts, nur die Kamera schaut hoch/runter.',
    steps: [
      'Spieler: leeres Objekt mit „Character Controller“, Kind-Objekt „CameraPivot“ auf Augenhöhe (Y ~1.6). Die Main Camera als Kind von CameraPivot (Position 0,0,0).',
      'Skripte „PlayerInputReader“ und „FirstPersonController“ auf den Spieler, CameraPivot ins Feld eintragen.',
      'Der Mauszeiger wird beim Start gefangen. Escape gibt ihn frei (im Pausenmenü wieder sperren).',
      'Alternative mit Cinemachine: siehe Kamera-Eintrag „First Person“ (dann den Look-Teil hier weglassen).',
    ],
    code: [
      {
        file: 'FirstPersonController.cs',
        text: `using UnityEngine;
using UnityEngine.InputSystem;

// Ego-Perspektive: Körper dreht horizontal, CameraPivot vertikal.
[RequireComponent(typeof(CharacterController), typeof(PlayerInputReader))]
public class FirstPersonController : MonoBehaviour
{
    [SerializeField] private Transform cameraPivot;
    [SerializeField] private float walkSpeed = 4.5f;
    [SerializeField] private float sprintSpeed = 7f;
    [SerializeField] private float mouseSensitivity = 0.1f;   // Grad pro Pixel Mausbewegung
    [SerializeField] private float gamepadSensitivity = 180f; // Grad pro Sekunde bei vollem Stick
    [SerializeField] private float jumpHeight = 1.1f;
    [SerializeField] private float gravity = -20f;

    private CharacterController controller;
    private PlayerInputReader input;
    private float pitch;
    private float verticalVelocity;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
        input = GetComponent<PlayerInputReader>();
    }

    private void OnEnable()
    {
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void Update()
    {
        // Maus liefert Pixel pro Bild, der Stick -1..1 -> unterschiedlich skalieren
        bool usingMouse = Mouse.current != null && Mouse.current.delta.ReadValue().sqrMagnitude > 0f;
        Vector2 look = usingMouse ? input.Look * mouseSensitivity : input.Look * gamepadSensitivity * Time.deltaTime;

        transform.Rotate(0f, look.x, 0f);
        pitch = Mathf.Clamp(pitch - look.y, -85f, 85f);
        cameraPivot.localRotation = Quaternion.Euler(pitch, 0f, 0f);

        Vector3 move = transform.forward * input.Move.y + transform.right * input.Move.x;
        move = Vector3.ClampMagnitude(move, 1f) * (input.SprintHeld ? sprintSpeed : walkSpeed);

        if (controller.isGrounded && verticalVelocity < 0f) verticalVelocity = -2f;
        if (controller.isGrounded && input.JumpPressed) verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
        verticalVelocity += gravity * Time.deltaTime;

        controller.Move((move + Vector3.up * verticalVelocity) * Time.deltaTime);

        if (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
    }
}`,
      },
    ],
    pitfalls: ['Kamera zittert: Look nicht in FixedUpdate verarbeiten, immer in Update.', 'Man sieht in den eigenen Körper: Near Clip Plane der Kamera auf 0.05 senken.'],
    docs: [`${SR}/Cursor-lockState.html`, `${SR}/CharacterController.html`],
  },
  {
    id: 'move-rigidbody',
    title: '3D mit Physik: Kugel, Fahrzeug oder schwebendes Objekt',
    category: 'movement',
    perspectives: ['3d-third', '3d-top'],
    level: 2,
    summary: 'Wenn Physik das Spielgefühl ist (rollende Kugel, Rutschen, Schubsen): Rigidbody bewegen statt CharacterController.',
    steps: [
      'Objekt mit „Rigidbody“ (Interpolate, Collision Detection Continuous) und passendem Collider.',
      'Skripte „PlayerInputReader“ und „RigidbodyMover“ hinzufügen.',
      'Linear Damping (früher „Drag“) am Rigidbody steuert, wie schnell es ausrollt.',
    ],
    code: [
      {
        file: 'RigidbodyMover.cs',
        text: `using UnityEngine;

// Physikbasierte Bewegung mit Kräften, kamerarelativ.
[RequireComponent(typeof(Rigidbody), typeof(PlayerInputReader))]
public class RigidbodyMover : MonoBehaviour
{
    [SerializeField] private float force = 20f;
    [SerializeField] private float maxSpeed = 8f;
    [SerializeField] private float jumpImpulse = 6f;

    private Rigidbody body;
    private PlayerInputReader input;
    private Transform cam;
    private bool jumpQueued;

    private void Awake()
    {
        body = GetComponent<Rigidbody>();
        input = GetComponent<PlayerInputReader>();
        cam = Camera.main != null ? Camera.main.transform : transform;
    }

    private void Update()
    {
        if (input.JumpPressed) jumpQueued = true;
    }

    private void FixedUpdate()
    {
        Vector3 forward = Vector3.ProjectOnPlane(cam.forward, Vector3.up).normalized;
        Vector3 right = Vector3.ProjectOnPlane(cam.right, Vector3.up).normalized;
        Vector3 dir = Vector3.ClampMagnitude(forward * input.Move.y + right * input.Move.x, 1f);

        Vector3 flat = new Vector3(body.linearVelocity.x, 0f, body.linearVelocity.z);
        if (flat.magnitude < maxSpeed) body.AddForce(dir * force, ForceMode.Acceleration);

        bool grounded = Physics.Raycast(transform.position, Vector3.down, 0.6f);
        if (jumpQueued && grounded) body.AddForce(Vector3.up * jumpImpulse, ForceMode.VelocityChange);
        jumpQueued = false;
    }
}`,
      },
    ],
    pitfalls: ['Kräfte nur in FixedUpdate anwenden. Eingaben in Update merken (jumpQueued), sonst gehen Tastendrücke verloren.', 'Der Raycast trifft den eigenen Collider: Spieler auf eigenen Layer legen und LayerMask verwenden.'],
    docs: [`${SR}/Rigidbody.AddForce.html`, `${SR}/Rigidbody-linearVelocity.html`],
  },
  {
    id: 'move-isometric',
    title: 'Isometrisch und schräg von oben (Diablo-Stil)',
    category: 'movement',
    perspectives: ['iso', '3d-top'],
    level: 2,
    summary: 'Die Kamera steht schräg (z. B. 45° gedreht, 30° geneigt). Damit „hoch“ auf der Tastatur auch auf dem Bildschirm nach oben geht, wird die Eingabe um den Kamerawinkel gedreht.',
    steps: [
      'Kamera: Rotation X 30, Y 45. Für echten Iso-Look Projection „Orthographic“ (bei Cinemachine im Lens-Bereich).',
      'Spieler mit Character Controller, Skripte „PlayerInputReader“ und „IsometricController“.',
      'cameraYaw auf den Y-Winkel der Kamera setzen (hier 45).',
    ],
    code: [
      {
        file: 'IsometricController.cs',
        text: `using UnityEngine;

// Schräg von oben: Eingabe wird um den Kamerawinkel gedreht.
[RequireComponent(typeof(CharacterController), typeof(PlayerInputReader))]
public class IsometricController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private float cameraYaw = 45f;
    [SerializeField] private float turnSpeed = 900f;
    [SerializeField] private float gravity = -20f;

    private CharacterController controller;
    private PlayerInputReader input;
    private float verticalVelocity;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
        input = GetComponent<PlayerInputReader>();
    }

    private void Update()
    {
        Vector3 raw = new Vector3(input.Move.x, 0f, input.Move.y);
        Vector3 move = Quaternion.Euler(0f, cameraYaw, 0f) * Vector3.ClampMagnitude(raw, 1f);

        if (move.sqrMagnitude > 0.001f)
        {
            transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(move), turnSpeed * Time.deltaTime);
        }

        verticalVelocity = controller.isGrounded ? -2f : verticalVelocity + gravity * Time.deltaTime;
        controller.Move((move * moveSpeed + Vector3.up * verticalVelocity) * Time.deltaTime);
    }
}`,
      },
    ],
    pitfalls: ['Bei orthografischer Kamera wirkt „Field of View“ nicht, stattdessen Orthographic Size anpassen.'],
    docs: [`${SR}/Quaternion.Euler.html`],
  },
  {
    id: 'move-click',
    title: 'Klicken zum Laufen (NavMesh, Strategie/RPG)',
    category: 'movement',
    perspectives: ['3d-top', 'iso', '3d-third'],
    level: 2,
    summary: 'Die Figur läuft automatisch um Hindernisse herum zu dem Punkt, auf den du klickst. Basis ist das NavMesh (Package „AI Navigation“).',
    steps: [
      'Window → Package Manager → „AI Navigation“ installieren.',
      'Boden auswählen → Add Component → „NavMesh Surface“ → „Bake“. Blau markierte Flächen sind begehbar.',
      'Spieler: „Nav Mesh Agent“-Komponente + Skript „ClickToMove“.',
      'Nach Änderungen am Level erneut „Bake“ drücken.',
    ],
    code: [
      {
        file: 'ClickToMove.cs',
        text: `using UnityEngine;
using UnityEngine.AI;
using UnityEngine.InputSystem;

// Linksklick auf den Boden -> Figur läuft per NavMesh dorthin.
[RequireComponent(typeof(NavMeshAgent))]
public class ClickToMove : MonoBehaviour
{
    [SerializeField] private LayerMask groundLayers = ~0;

    private NavMeshAgent agent;
    private Camera cam;

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        cam = Camera.main;
    }

    private void Update()
    {
        if (Mouse.current == null || !Mouse.current.leftButton.wasPressedThisFrame) return;
        Ray ray = cam.ScreenPointToRay(Mouse.current.position.ReadValue());
        if (Physics.Raycast(ray, out RaycastHit hit, 500f, groundLayers))
        {
            agent.SetDestination(hit.point);
        }
    }
}`,
      },
    ],
    pitfalls: ['Agent bewegt sich nicht: NavMesh nicht gebacken oder der Agent steht nicht auf der blauen Fläche.', 'Klicks auf UI lösen Bewegung aus: vorher EventSystem.current.IsPointerOverGameObject() prüfen.'],
    docs: ['https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/index.html', `${SR}/AI.NavMeshAgent.SetDestination.html`],
  },
  {
    id: 'move-25d',
    title: '2.5D: Seitenansicht mit 3D-Grafik',
    category: 'movement',
    perspectives: ['2d-side'],
    level: 2,
    summary: '3D-Modelle, aber gespielt wird nur links/rechts (Little Nightmares, Trine). Am einfachsten: 3D-Physik mit gesperrter Z-Achse.',
    steps: [
      'Projekt-Vorlage „Universal 3D“.',
      'Spieler mit „Rigidbody“ (Constraints: Freeze Position Z, Freeze Rotation X/Y/Z) und Capsule Collider.',
      'Bewegung wie im 2D-Platformer, aber mit Rigidbody statt Rigidbody2D und Physics.CheckSphere statt Physics2D.OverlapCircle.',
      'Kamera: Cinemachine Follow Camera seitlich (Follow Offset z. B. 0, 2, -12), Perspektive mit kleinem Field of View (~30) für flachen Look.',
    ],
    code: [],
    pitfalls: ['2D- und 3D-Physik kennen sich nicht: Rigidbody2D-Objekte kollidieren nie mit 3D-Collidern.'],
    docs: [`${SR}/RigidbodyConstraints.html`],
  },
]
