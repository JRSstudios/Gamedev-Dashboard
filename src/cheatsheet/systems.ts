import type { CheatEntry } from './types'

const SR = 'https://docs.unity3d.com/6000.6/Documentation/ScriptReference'
const MANUAL = 'https://docs.unity3d.com/6000.6/Documentation/Manual'

/** UI, audio, game systems, enemy AI, importing art and building the game. */
export const SYSTEMS: CheatEntry[] = [
  {
    id: 'ui-hud',
    title: 'HUD: Lebensbalken und Punkte (uGUI)',
    category: 'ui',
    perspectives: [],
    level: 1,
    summary: 'Für Anzeigen im Spiel reicht uGUI: Canvas, Image (als Balken) und Text (TextMeshPro).',
    steps: [
      'Hierarchy → UI → Canvas. Am Canvas Scaler: „Scale With Screen Size“, Reference 1920×1080, Match 0.5.',
      'Lebensbalken: UI → Image (Hintergrund), darin noch ein Image (Füllung) mit Image Type „Filled“, Fill Method „Horizontal“.',
      'Text: UI → Text - TextMeshPro (beim ersten Mal „Import TMP Essentials“ klicken).',
      'Skript „HealthBar“ an den Balken, Health.onHealthChanged im Inspector mit HealthBar.SetValue verbinden.',
    ],
    code: [
      {
        file: 'HealthBar.cs',
        text: `using TMPro;
using UnityEngine;
using UnityEngine.UI;

// Shows health as a bar and as text.
public class HealthBar : MonoBehaviour
{
    [SerializeField] private Health health;
    [SerializeField] private Image fill;      // Image Type: Filled
    [SerializeField] private TMP_Text label;  // optional

    private void Start()
    {
        SetValue(health.Current);
        health.onHealthChanged.AddListener(SetValue);
    }

    public void SetValue(int current)
    {
        fill.fillAmount = health.Max > 0 ? (float)current / health.Max : 0f;
        if (label != null) label.text = current + " / " + health.Max;
    }
}`,
      },
    ],
    pitfalls: ['UI ist auf großen Bildschirmen winzig: Canvas Scaler steht noch auf „Constant Pixel Size“.', 'Klicks gehen nicht: Szene braucht ein EventSystem (wird mit dem ersten Canvas angelegt).'],
    docs: ['https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/index.html', 'https://docs.unity3d.com/Packages/com.unity.ugui@2.0/api/UnityEngine.UI.Image.html'],
  },
  {
    id: 'ui-menu',
    title: 'Hauptmenü und Pausenmenü',
    category: 'ui',
    perspectives: [],
    level: 1,
    summary: 'Hauptmenü als eigene Szene mit Buttons. Pausieren über Time.timeScale = 0, Escape bzw. Start-Taste öffnet das Menü.',
    steps: [
      'Neue Szene „MainMenu“, Canvas mit Buttons „Spielen“ und „Beenden“. Beide Szenen in File → Build Profiles → Scene List (Menü zuerst).',
      'Button → On Click () → „+“ → Objekt mit MenuActions hineinziehen → Funktion wählen.',
      'Pausenmenü: Panel im Spiel-Canvas, standardmäßig deaktiviert. Skript „PauseMenu“ auf den Canvas.',
    ],
    code: [
      {
        file: 'MenuActions.cs',
        text: `using UnityEngine;
using UnityEngine.SceneManagement;

// For the buttons in the main menu.
public class MenuActions : MonoBehaviour
{
    [SerializeField] private string gameScene = "Game";

    public void Play()
    {
        Time.timeScale = 1f;
        SceneManager.LoadScene(gameScene);
    }

    public void Quit()
    {
        Application.Quit();
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#endif
    }
}`,
      },
      {
        file: 'PauseMenu.cs',
        text: `using UnityEngine;
using UnityEngine.InputSystem;

// Escape (keyboard) or Start (gamepad) pauses the game.
public class PauseMenu : MonoBehaviour
{
    [SerializeField] private GameObject panel;
    public bool IsPaused { get; private set; }

    private void Update()
    {
        bool pressed = (Keyboard.current != null && Keyboard.current.escapeKey.wasPressedThisFrame)
            || (Gamepad.current != null && Gamepad.current.startButton.wasPressedThisFrame);
        if (pressed) SetPaused(!IsPaused);
    }

    public void SetPaused(bool paused)
    {
        IsPaused = paused;
        panel.SetActive(paused);
        Time.timeScale = paused ? 0f : 1f;
        Cursor.lockState = paused ? CursorLockMode.None : CursorLockMode.Locked;
        Cursor.visible = paused;
    }
}`,
      },
    ],
    pitfalls: ['Nach dem Zurück ins Menü ist alles eingefroren: Time.timeScale beim Szenenwechsel wieder auf 1 setzen.', 'In 2D-Spielen den Cursor nicht sperren (die Zeilen mit Cursor dann entfernen).'],
    docs: [`${SR}/SceneManagement.SceneManager.LoadScene.html`, `${SR}/Time-timeScale.html`],
  },
  {
    id: 'audio-basics',
    title: 'Musik, Soundeffekte und Lautstärkeregler',
    category: 'audio',
    perspectives: [],
    level: 1,
    summary: 'AudioSource spielt Clips ab. Ein Audio Mixer mit Gruppen „Music“ und „SFX“ erlaubt getrennte Lautstärkeregler im Optionsmenü.',
    steps: [
      'Musik: leeres Objekt „Music“ mit AudioSource, Clip zuweisen, Loop und Play On Awake an.',
      'Soundeffekte: AudioSource am Spieler/Gegner, Play On Awake aus, im Code PlayOneShot(clip).',
      'Project → Create → Audio Mixer. Gruppen „Music“ und „SFX“ anlegen, die AudioSources im Feld „Output“ zuordnen.',
      'Gruppe auswählen → im Inspector Rechtsklick auf „Volume“ → „Expose …“. Oben rechts im Mixer-Fenster „Exposed Parameters“ → umbenennen in „MusicVolume“/„SfxVolume“.',
      'Slider (UI → Slider, Min 0.0001, Max 1) mit VolumeSlider.SetVolume verbinden.',
    ],
    code: [
      {
        file: 'VolumeSlider.cs',
        text: `using UnityEngine;
using UnityEngine.Audio;

// Converts a slider value (0..1) to decibels and saves it.
public class VolumeSlider : MonoBehaviour
{
    [SerializeField] private AudioMixer mixer;
    [SerializeField] private string parameter = "MusicVolume";

    private void Start()
    {
        SetVolume(PlayerPrefs.GetFloat(parameter, 0.8f));
    }

    public void SetVolume(float value)
    {
        value = Mathf.Clamp(value, 0.0001f, 1f);
        mixer.SetFloat(parameter, Mathf.Log10(value) * 20f);
        PlayerPrefs.SetFloat(parameter, value);
    }
}`,
      },
    ],
    pitfalls: ['Lautstärke linear statt in dB setzen klingt falsch (Regler wirkt nur ganz unten). Daher Log10 × 20.', 'Musik: Load Type „Streaming“, kurze Effekte: „Decompress On Load“.'],
    docs: [`${MANUAL}/AudioMixer.html`, `${SR}/AudioSource.PlayOneShot.html`],
  },
  {
    id: 'sys-save',
    title: 'Spielstand speichern und laden',
    category: 'systems',
    perspectives: [],
    level: 2,
    summary: 'Einstellungen (Lautstärke) passen in PlayerPrefs. Spielstände speicherst du als JSON-Datei im persistentDataPath.',
    steps: [
      'Klasse „SaveData“ mit [System.Serializable] und öffentlichen Feldern für alles, was gespeichert werden soll.',
      'SaveSystem.Save(data) beim Checkpoint, SaveSystem.Load() beim Start.',
      'Die Datei liegt unter Windows in %USERPROFILE%\\AppData\\LocalLow\\<Firma>\\<Spiel>.',
    ],
    code: [
      {
        file: 'SaveSystem.cs',
        text: `using System.IO;
using UnityEngine;

[System.Serializable]
public class SaveData
{
    public string sceneName = "Game";
    public Vector3 playerPosition;
    public int health = 5;
    public int coins;
}

// Saves SaveData as a JSON file.
public static class SaveSystem
{
    private static string FilePath => Path.Combine(Application.persistentDataPath, "save.json");

    public static void Save(SaveData data)
    {
        File.WriteAllText(FilePath, JsonUtility.ToJson(data, true));
    }

    public static SaveData Load()
    {
        if (!File.Exists(FilePath)) return new SaveData();
        return JsonUtility.FromJson<SaveData>(File.ReadAllText(FilePath));
    }

    public static void Delete()
    {
        if (File.Exists(FilePath)) File.Delete(FilePath);
    }
}`,
      },
    ],
    pitfalls: ['JsonUtility speichert keine Dictionaries und keine Eigenschaften, nur öffentliche Felder oder [SerializeField].'],
    docs: [`${SR}/JsonUtility.html`, `${SR}/Application-persistentDataPath.html`],
  },
  {
    id: 'sys-scriptable',
    title: 'Daten getrennt halten: ScriptableObjects (Waffen, Gegner, Items)',
    category: 'systems',
    perspectives: [],
    level: 2,
    summary: 'ScriptableObjects sind Daten-Dateien im Projekt. Statt Zahlen in Skripten zu verstecken, legst du z. B. für jede Waffe eine Datei an und tauschst sie im Inspector.',
    steps: [
      'Skript „WeaponData“ anlegen (siehe unten).',
      'Project → Rechtsklick → Create → Game → Weapon Data. Werte eintragen.',
      'Andere Skripte bekommen ein Feld [SerializeField] WeaponData weapon und lesen weapon.damage usw.',
    ],
    code: [
      {
        file: 'WeaponData.cs',
        text: `using UnityEngine;

[CreateAssetMenu(menuName = "Game/Weapon Data", fileName = "NewWeapon")]
public class WeaponData : ScriptableObject
{
    public string displayName = "Sword";
    public int damage = 2;
    public float cooldown = 0.4f;
    public float range = 1.5f;
    public Sprite icon;
    public AudioClip hitSound;
}`,
      },
    ],
    pitfalls: ['Werte eines ScriptableObjects im Play Mode zu ändern, ändert die Datei dauerhaft (anders als bei GameObjects).'],
    docs: [`${MANUAL}/class-ScriptableObject.html`],
  },
  {
    id: 'sys-spawn',
    title: 'Objekte erzeugen: Schüsse, Gegnerwellen, Pooling',
    category: 'systems',
    perspectives: [],
    level: 2,
    summary: 'Instantiate erzeugt Kopien eines Prefabs. Bei vielen Objekten (Kugeln) recycelt ein ObjectPool, statt ständig neu zu erzeugen.',
    steps: [
      'Kugel-Prefab mit Rigidbody (2D oder 3D), Collider (Is Trigger) und Skript „Bullet“.',
      'Am Spieler/Gegner ein leeres Kind-Objekt „Muzzle“ (Mündung) und das Skript „BulletSpawner“.',
      'Im Feld bulletPrefab das Prefab eintragen.',
    ],
    code: [
      {
        file: 'Bullet.cs',
        text: `using UnityEngine;
using UnityEngine.Pool;

// Flies straight and returns to the pool when it expires or hits something.
public class Bullet : MonoBehaviour
{
    [SerializeField] private float speed = 20f;
    [SerializeField] private float lifetime = 2f;
    [SerializeField] private int damage = 1;

    private IObjectPool<Bullet> pool;
    private float dieAt;
    private bool released;

    public void Init(IObjectPool<Bullet> owner)
    {
        pool = owner;
        dieAt = Time.time + lifetime;
        released = false;
    }

    private void Update()
    {
        transform.Translate(Vector3.forward * speed * Time.deltaTime);
        if (Time.time >= dieAt) ReturnToPool();
    }

    private void OnTriggerEnter(Collider other)
    {
        if (released) return;
        if (other.TryGetComponent(out Health health)) health.TakeDamage(damage);
        ReturnToPool();
    }

    // Return only once, even if a hit and the timeout happen in the same frame.
    private void ReturnToPool()
    {
        if (released) return;
        released = true;
        pool.Release(this);
    }
}`,
      },
      {
        file: 'BulletSpawner.cs',
        text: `using UnityEngine;
using UnityEngine.Pool;

// Fires a bullet from the pool when "Attack" is pressed.
public class BulletSpawner : MonoBehaviour
{
    [SerializeField] private Bullet bulletPrefab;
    [SerializeField] private Transform muzzle;
    [SerializeField] private float fireRate = 8f;

    private IObjectPool<Bullet> pool;
    private PlayerInputReader input;
    private float nextShot;

    private void Awake()
    {
        input = GetComponent<PlayerInputReader>();
        pool = new ObjectPool<Bullet>(
            createFunc: () => Instantiate(bulletPrefab),
            actionOnGet: b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            defaultCapacity: 20,
            maxSize: 100);
    }

    private void Update()
    {
        if (input == null || !input.AttackPressed || Time.time < nextShot) return;
        nextShot = Time.time + 1f / fireRate;
        Bullet bullet = pool.Get();
        bullet.transform.SetPositionAndRotation(muzzle.position, muzzle.rotation);
        bullet.Init(pool);
    }
}`,
      },
    ],
    pitfalls: ['Release zweimal für dieselbe Kugel wirft einen Fehler. Deshalb merkt sich Bullet mit released, ob sie schon zurückgegeben wurde.', 'Die Kugel fliegt entlang ihrer blauen Z-Achse: Muzzle so drehen, dass Z nach vorn zeigt.'],
    docs: [`${SR}/Object.Instantiate.html`, `${SR}/Pool.ObjectPool_1.html`],
  },
  {
    id: 'sys-gamemanager',
    title: 'GameManager: Punkte, Game Over, Neustart',
    category: 'systems',
    perspectives: [],
    level: 2,
    summary: 'Ein zentrales Objekt kennt den Spielzustand. Andere Skripte melden Ereignisse (Münze, Tod) und der GameManager reagiert.',
    steps: [
      'Leeres Objekt „GameManager“ in der Spielszene, Skript daran.',
      'Health.onDied des Spielers im Inspector mit GameManager.GameOver verbinden.',
      'Andere Skripte erreichen ihn über GameManager.Instance.',
    ],
    code: [
      {
        file: 'GameManager.cs',
        text: `using UnityEngine;
using UnityEngine.Events;
using UnityEngine.SceneManagement;

// Holds the score and game state. Exactly one per scene.
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    public UnityEvent<int> onScoreChanged;
    public UnityEvent onGameOver;

    public int Score { get; private set; }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public void AddScore(int amount)
    {
        Score += amount;
        onScoreChanged?.Invoke(Score);
    }

    public void GameOver()
    {
        onGameOver?.Invoke();
        Invoke(nameof(Restart), 2f);
    }

    public void Restart()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
}`,
      },
    ],
    pitfalls: ['Zu viele Singletons machen Projekte schwer änderbar. Für Daten lieber ScriptableObjects, für Reaktionen UnityEvents.'],
    docs: [`${SR}/SceneManagement.SceneManager.html`, `${SR}/Events.UnityEvent.html`],
  },
  {
    id: 'ai-chase',
    title: 'Gegner-KI: patrouillieren und verfolgen (3D, NavMesh)',
    category: 'ai',
    perspectives: ['3d-third', '3d-first', '3d-top', 'iso'],
    level: 2,
    summary: 'Der Gegner läuft Wegpunkte ab. Sieht er den Spieler in Reichweite, verfolgt er ihn, und verliert er ihn, kehrt er zur Patrouille zurück.',
    steps: [
      'AI Navigation installieren und NavMesh backen (siehe „Klicken zum Laufen“).',
      'Gegner: „Nav Mesh Agent“ + Skript „EnemyChase“. Leere Objekte als Wegpunkte anlegen und in die Liste ziehen.',
      'Spieler mit Tag „Player“ versehen.',
    ],
    code: [
      {
        file: 'EnemyChase.cs',
        text: `using UnityEngine;
using UnityEngine.AI;

// Patrols between waypoints, chases the player when in range.
[RequireComponent(typeof(NavMeshAgent))]
public class EnemyChase : MonoBehaviour
{
    [SerializeField] private Transform[] waypoints;
    [SerializeField] private float sightRange = 10f;
    [SerializeField] private float loseRange = 15f;

    private NavMeshAgent agent;
    private Transform player;
    private int nextWaypoint;
    private bool chasing;

    private void Awake()
    {
        agent = GetComponent<NavMeshAgent>();
        GameObject found = GameObject.FindWithTag("Player");
        if (found != null) player = found.transform;
    }

    private void Update()
    {
        float distance = player != null ? Vector3.Distance(transform.position, player.position) : float.MaxValue;
        if (!chasing && distance < sightRange) chasing = true;
        if (chasing && distance > loseRange) chasing = false;

        if (chasing)
        {
            agent.SetDestination(player.position);
        }
        else if (waypoints.Length > 0 && !agent.pathPending && agent.remainingDistance < 0.5f)
        {
            agent.SetDestination(waypoints[nextWaypoint].position);
            nextWaypoint = (nextWaypoint + 1) % waypoints.Length;
        }
    }
}`,
      },
    ],
    pitfalls: ['Gegner sieht durch Wände: zusätzlich LineOfSight (Raycast-Eintrag) prüfen.'],
    docs: ['https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/index.html', `${SR}/AI.NavMeshAgent.html`],
  },
  {
    id: 'ai-patrol-2d',
    title: 'Gegner-KI in 2D: hin und her laufen',
    category: 'ai',
    perspectives: ['2d-side'],
    level: 1,
    summary: 'Einfacher Jump’n’Run-Gegner: läuft, bis eine Wand kommt oder der Boden endet, und dreht dann um.',
    steps: [
      'Gegner mit Rigidbody 2D (Freeze Rotation Z), Collider 2D und Skript „Patrol2D“.',
      'Zwei leere Kind-Objekte: „WallCheck“ vorne auf Brusthöhe, „LedgeCheck“ vorne unten vor den Füßen.',
      'Ground-Layer im Feld groundLayer wählen.',
    ],
    code: [
      {
        file: 'Patrol2D.cs',
        text: `using UnityEngine;

// Walks back and forth, turns around at walls and ledges.
[RequireComponent(typeof(Rigidbody2D))]
public class Patrol2D : MonoBehaviour
{
    [SerializeField] private float speed = 2f;
    [SerializeField] private Transform wallCheck;
    [SerializeField] private Transform ledgeCheck;
    [SerializeField] private LayerMask groundLayer;

    private Rigidbody2D body;
    private int direction = 1;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
    }

    private void FixedUpdate()
    {
        bool wallAhead = Physics2D.OverlapCircle(wallCheck.position, 0.1f, groundLayer);
        bool groundAhead = Physics2D.OverlapCircle(ledgeCheck.position, 0.1f, groundLayer);
        if (wallAhead || !groundAhead) Flip();
        body.linearVelocity = new Vector2(direction * speed, body.linearVelocity.y);
    }

    private void Flip()
    {
        direction = -direction;
        Vector3 scale = transform.localScale;
        scale.x = Mathf.Abs(scale.x) * direction;
        transform.localScale = scale; // also mirrors the check points
    }
}`,
      },
    ],
    pitfalls: ['Gegner dreht ständig hin und her: LedgeCheck liegt nicht vor den Füßen, sondern darunter oder dahinter.'],
    docs: [`${SR}/Physics2D.OverlapCircle.html`],
  },
  {
    id: 'import-blender',
    title: 'Modelle aus Blender importieren',
    category: 'import',
    perspectives: ['3d-third', '3d-first', '3d-top', 'iso'],
    level: 1,
    summary: 'Am zuverlässigsten ist FBX- oder glTF-Export mit angewandten Transformationen. So stimmen Größe und Ausrichtung in Unity.',
    steps: [
      'In Blender: Objekt auswählen → Ctrl+A → „All Transforms“ (Maßstab und Drehung anwenden).',
      'File → Export → FBX: „Selected Objects“, Apply Scalings „FBX All“, Forward „-Z Forward“, Up „Y Up“, „Apply Transform“ anhaken.',
      'Datei in den Ordner Assets/Models ziehen (oder im Dashboard per Blender-Eingang → „Nach Unity“).',
      'In Unity: Modell auswählen → Model-Tab Scale Factor prüfen (1 m in Blender = 1 Einheit in Unity). Materials-Tab → „Extract Materials“, um sie zu bearbeiten.',
      'Figuren mit Rig: Rig-Tab → Humanoid (siehe Animations-Eintrag).',
    ],
    code: [],
    pitfalls: ['Modell liegt auf dem Rücken oder ist 100× zu groß: Transformationen in Blender nicht angewendet.', 'Unity kann .blend nur öffnen, wenn Blender auf demselben PC installiert ist. Für Teams lieber FBX/glTF.'],
    docs: [`${MANUAL}/HOWTO-ImportObjectsFrom3DApps.html`, `${MANUAL}/FBXImporter-Model.html`],
  },
  {
    id: 'import-krita',
    title: 'Concept Art und Sprites aus Krita',
    category: 'import',
    perspectives: ['2d-side', '2d-top'],
    level: 1,
    summary: 'Krita speichert .kra. Für Unity exportierst du PNG, für Animationen ein Spritesheet. Das Dashboard zeigt .kra-Vorschauen direkt an.',
    steps: [
      'In Krita: File → Export → PNG (Transparenz bleibt erhalten). Für Pixel-Art vorher Image → Scale mit „Nearest Neighbour“.',
      'Animationen: Render Animation als Bildsequenz und z. B. mit einem Sprite-Packer zu einem Sheet zusammenfügen, oder Frames einzeln importieren.',
      'In Unity: Pixels Per Unit = Kachelgröße (z. B. 32), Filter Mode Point für Pixel-Art, Bilinear für gemalte Art.',
      'Im Dashboard: Krita-Ordner verknüpfen, dann erscheinen neue Bilder im Krita-Eingang und lassen sich per „Nach Unity“ kopieren.',
    ],
    code: [],
    pitfalls: ['Riesige Concept-Art-Bilder (4K+) nicht als Spielgrafik nutzen: Max Size im Import auf 2048 begrenzen.'],
    docs: [`${MANUAL}/texture-type-sprite.html`],
  },
  {
    id: 'build-game',
    title: 'Spiel bauen und weitergeben',
    category: 'build',
    perspectives: [],
    level: 1,
    summary: 'In Unity 6 heißt das Build-Fenster „Build Profiles“. Dort wählst du Plattform und Szenen und erstellst eine EXE oder eine Web-Version.',
    steps: [
      'File → Build Profiles. Unter „Scene List“ alle Szenen hinzufügen (Menü an Position 0).',
      'Edit → Project Settings → Player: Company Name, Product Name, Icon, Version.',
      'Plattform „Windows“ wählen → „Build“ → leeren Ordner wählen. Den ganzen Ordner weitergeben, nicht nur die EXE.',
      'Für itch.io im Browser: Plattform „Web“ (Modul muss im Hub installiert sein) → Build → Ordner zippen und hochladen.',
      'Vor dem Build: Window → Analysis → Profiler im Play Mode ansehen. Hohe Spitzen deuten auf teuren Code in Update hin.',
    ],
    code: [],
    pitfalls: ['„Scene couldn’t be loaded“: Szene fehlt in der Scene List.', 'Nur die EXE kopiert: Der _Data-Ordner und die DLLs daneben gehören dazu.'],
    docs: [`${MANUAL}/build-profiles.html`, `${MANUAL}/class-PlayerSettings.html`],
  },
]
