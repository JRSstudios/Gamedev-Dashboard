import type { CheatEntry } from './types'

const IS = 'https://docs.unity3d.com/Packages/com.unity.inputsystem@1.19/manual'

export const INPUT: CheatEntry[] = [
  {
    id: 'input-setup',
    title: 'Neues Input System: einrichten',
    category: 'input',
    perspectives: [],
    level: 1,
    summary: 'Unity 6.6 nutzt das Input System Package. Neue Projekte bringen eine projektweite Action-Datei mit Aktionen wie Move, Look, Jump, Attack, Sprint und Interact mit, für Tastatur, Maus und Gamepad.',
    steps: [
      'Window → Package Manager: „Input System“ muss installiert sein (bei den URP-Vorlagen ist es das schon).',
      'Edit → Project Settings → Player → Other Settings → „Active Input Handling“ auf „Input System Package (New)“ stellen (Unity startet neu).',
      'Edit → Project Settings → Input System Package: Falls keine „Project-wide Actions“ zugewiesen sind, „Create and assign a default project-wide Action Asset“ klicken.',
      'Dort siehst du die Action Maps „Player“ (Move, Look, Jump, Attack, …) und „UI“. Jede Aktion hat Bindings (Tasten, Sticks, Maus).',
      'Im Code holst du eine Aktion mit InputSystem.actions.FindAction("Move").',
    ],
    code: [],
    pitfalls: [
      'Alter Code mit Input.GetAxis/Input.GetKey wirft mit „Input System Package (New)“ Fehler. Entweder umschreiben oder vorübergehend „Both“ wählen.',
      'Aktionsnamen sind case-sensitiv: "Move" ≠ "move". Bei gleichen Namen in mehreren Maps "Player/Move" schreiben.',
    ],
    docs: [`${IS}/QuickStartGuide.html`, `${IS}/ProjectWideActions.html`],
  },
  {
    id: 'input-read',
    title: 'Eingaben im Skript lesen (Bewegen, Springen, Schauen)',
    category: 'input',
    perspectives: [],
    level: 1,
    summary: 'Ein kleines Skript, das alle Eingaben einmal sammelt. Deine Bewegungsskripte lesen dann nur noch diese Werte, dadurch funktionieren Tastatur und Gamepad automatisch.',
    steps: [
      'Skript „PlayerInputReader“ anlegen und auf den Spieler ziehen.',
      'Bewegungsskripte holen es per GetComponent<PlayerInputReader>() und lesen Move, Look, JumpPressed usw.',
      'ReadValue<Vector2>() liefert Werte von -1 bis 1 (WASD, Pfeiltasten, linker Stick).',
      'WasPressedThisFrame() ist genau in dem Bild true, in dem die Taste gedrückt wurde (für Springen/Schießen). IsPressed() solange sie gehalten wird (für Sprinten).',
    ],
    code: [
      {
        file: 'PlayerInputReader.cs',
        text: `using UnityEngine;
using UnityEngine.InputSystem;

// Liest die projektweiten Aktionen (Edit > Project Settings > Input System Package).
// Andere Skripte nutzen nur die Eigenschaften unten.
public class PlayerInputReader : MonoBehaviour
{
    private InputAction moveAction;
    private InputAction lookAction;
    private InputAction jumpAction;
    private InputAction sprintAction;
    private InputAction attackAction;
    private InputAction interactAction;

    public Vector2 Move { get; private set; }
    public Vector2 Look { get; private set; }
    public bool JumpPressed { get; private set; }
    public bool JumpHeld { get; private set; }
    public bool SprintHeld { get; private set; }
    public bool AttackPressed { get; private set; }
    public bool InteractPressed { get; private set; }

    private void Awake()
    {
        moveAction = InputSystem.actions.FindAction("Move");
        lookAction = InputSystem.actions.FindAction("Look");
        jumpAction = InputSystem.actions.FindAction("Jump");
        sprintAction = InputSystem.actions.FindAction("Sprint");
        attackAction = InputSystem.actions.FindAction("Attack");
        interactAction = InputSystem.actions.FindAction("Interact");
    }

    private void Update()
    {
        Move = moveAction != null ? moveAction.ReadValue<Vector2>() : Vector2.zero;
        Look = lookAction != null ? lookAction.ReadValue<Vector2>() : Vector2.zero;
        JumpPressed = jumpAction != null && jumpAction.WasPressedThisFrame();
        JumpHeld = jumpAction != null && jumpAction.IsPressed();
        SprintHeld = sprintAction != null && sprintAction.IsPressed();
        AttackPressed = attackAction != null && attackAction.WasPressedThisFrame();
        InteractPressed = interactAction != null && interactAction.WasPressedThisFrame();
    }
}`,
      },
    ],
    pitfalls: [
      'Script Execution Order: Liest ein anderes Skript die Werte im selben Update, kann es ein Bild zu spät sein. Sicher: Edit → Project Settings → Script Execution Order → PlayerInputReader nach oben (negativer Wert).',
      '„Look“ mit der Maus liefert Pixel-Bewegung pro Bild, mit dem Gamepad -1..1. Für Kameras daher getrennte Empfindlichkeiten nutzen oder Cinemachine das Lesen überlassen.',
    ],
    docs: [`${IS}/QuickStartGuide.html`, `${IS}/Actions.html`],
  },
  {
    id: 'input-add-action',
    title: 'Eigene Aktion anlegen (z. B. Dash oder Inventar)',
    category: 'input',
    perspectives: [],
    level: 2,
    summary: 'Neue Steuerung fügst du im Actions-Editor hinzu, nicht im Code. Danach liest du sie genauso wie Move oder Jump.',
    steps: [
      'Edit → Project Settings → Input System Package → Action Map „Player“ auswählen → „+“ bei Actions → Namen eingeben, z. B. „Dash“.',
      'Action Type „Button“ für Tasten, „Value“ + Control Type „Vector2“ für Richtungen.',
      'Beim Binding „+“ → „Add Binding“ → Path → Listen → gewünschte Taste drücken (z. B. Left Shift). Für Gamepad ein zweites Binding (z. B. Button East).',
      'Im Code: InputSystem.actions.FindAction("Dash") und WasPressedThisFrame().',
    ],
    code: [
      {
        file: 'DashAbility.cs',
        text: `using UnityEngine;
using UnityEngine.InputSystem;

// Kurzer Sprint-Stoß in Blickrichtung (2D). Benötigt eine Aktion "Dash" in der Action Map "Player".
[RequireComponent(typeof(Rigidbody2D))]
public class DashAbility : MonoBehaviour
{
    [SerializeField] private float dashSpeed = 18f;
    [SerializeField] private float dashTime = 0.15f;
    [SerializeField] private float cooldown = 0.6f;

    private Rigidbody2D body;
    private InputAction dashAction;
    private InputAction moveAction;
    private float dashEnds;
    private float readyAt;
    private Vector2 direction = Vector2.right;

    public bool IsDashing => Time.time < dashEnds;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
        dashAction = InputSystem.actions.FindAction("Dash");
        moveAction = InputSystem.actions.FindAction("Move");
    }

    private void Update()
    {
        Vector2 move = moveAction != null ? moveAction.ReadValue<Vector2>() : Vector2.zero;
        if (move.sqrMagnitude > 0.01f) direction = move.normalized;
        if (dashAction != null && dashAction.WasPressedThisFrame() && Time.time >= readyAt)
        {
            dashEnds = Time.time + dashTime;
            readyAt = Time.time + cooldown;
        }
    }

    private void FixedUpdate()
    {
        if (IsDashing) body.linearVelocity = direction * dashSpeed;
    }
}`,
      },
    ],
    pitfalls: ['Nach dem Anlegen „Save Asset“ nicht vergessen, wenn Auto-Save im Actions-Editor aus ist.'],
    docs: [`${IS}/ActionsEditor.html`, `${IS}/ActionBindings.html`],
  },
  {
    id: 'input-playerinput',
    title: 'Alternative: Player Input-Komponente (auch für lokalen Multiplayer)',
    category: 'input',
    perspectives: [],
    level: 2,
    summary: 'Die Komponente „Player Input“ ruft Methoden wie OnMove oder OnJump in deinen Skripten auf. Praktisch für mehrere Spieler mit eigenen Gamepads (Player Input Manager).',
    steps: [
      'Spieler auswählen → Add Component → „Player Input“.',
      'Actions: die projektweite Action-Datei, Default Map: „Player“, Behavior: „Send Messages“.',
      'In einem Skript am selben Objekt Methoden On + Aktionsname schreiben (OnMove, OnJump …).',
      'Für lokalen Multiplayer: leeres Objekt mit „Player Input Manager“, Spieler-Prefab eintragen, „Join Behavior“ auf „Join Players When Button Is Pressed“.',
    ],
    code: [
      {
        file: 'PlayerInputMessages.cs',
        text: `using UnityEngine;
using UnityEngine.InputSystem;

// Empfängt Nachrichten der Player Input-Komponente (Behavior: Send Messages).
public class PlayerInputMessages : MonoBehaviour
{
    public Vector2 Move { get; private set; }
    public bool JumpQueued { get; set; }

    private void OnMove(InputValue value)
    {
        Move = value.Get<Vector2>();
    }

    private void OnJump(InputValue value)
    {
        if (value.isPressed) JumpQueued = true;
    }
}`,
      },
    ],
    pitfalls: ['Entweder Player Input oder InputSystem.actions direkt nutzen, beides gemischt führt leicht zu doppelten Eingaben.'],
    docs: [`${IS}/PlayerInput.html`, `${IS}/PlayerInputManager.html`],
  },
  {
    id: 'input-rebind',
    title: 'Tasten im Spiel neu belegen',
    category: 'input',
    perspectives: [],
    level: 3,
    summary: 'Spieler können Tasten selbst belegen. Die Aktion wird kurz deaktiviert, die nächste gedrückte Taste wird übernommen und als JSON gespeichert.',
    steps: [
      'UI-Button anlegen, im OnClick dieses Skript mit StartRebind verbinden.',
      'Die Belegung wird in PlayerPrefs gespeichert und beim Start geladen.',
      'Unity bringt im Package Manager unter Input System → Samples „Rebinding UI“ eine fertige Lösung mit.',
    ],
    code: [
      {
        file: 'RebindJump.cs',
        text: `using UnityEngine;
using UnityEngine.InputSystem;

// Belegt die Aktion "Jump" neu und merkt sich die Belegung.
public class RebindJump : MonoBehaviour
{
    private const string SaveKey = "rebinds";
    private InputAction jumpAction;

    private void Awake()
    {
        jumpAction = InputSystem.actions.FindAction("Jump");
        string saved = PlayerPrefs.GetString(SaveKey, "");
        if (!string.IsNullOrEmpty(saved)) InputSystem.actions.LoadBindingOverridesFromJson(saved);
    }

    public void StartRebind()
    {
        jumpAction.Disable();
        jumpAction.PerformInteractiveRebinding(0)
            .WithCancelingThrough("<Keyboard>/escape")
            .OnComplete(operation =>
            {
                operation.Dispose();
                jumpAction.Enable();
                PlayerPrefs.SetString(SaveKey, InputSystem.actions.SaveBindingOverridesAsJson());
            })
            .OnCancel(operation =>
            {
                operation.Dispose();
                jumpAction.Enable();
            })
            .Start();
    }
}`,
      },
    ],
    pitfalls: ['Die Zahl in PerformInteractiveRebinding(0) ist der Index des Bindings (0 = erstes, meist Tastatur).'],
    docs: [`${IS}/ActionBindings.html#interactive-rebinding`],
  },
]
