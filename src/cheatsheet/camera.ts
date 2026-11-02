import type { CheatEntry } from './types'

const CM = 'https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual'

export const CAMERA: CheatEntry[] = [
  {
    id: 'cam-basics',
    title: 'Cinemachine 3: Grundprinzip',
    category: 'camera',
    perspectives: [],
    level: 1,
    summary: 'In Unity 6.6 ist Cinemachine fest eingebaut. Die echte Kamera bekommt einen „Cinemachine Brain“, du baust beliebig viele „Cinemachine Cameras“ (Kamera-Einstellungen). Die mit der höchsten Priority ist aktiv, Wechsel werden weich überblendet.',
    steps: [
      'GameObject → Cinemachine → Cinemachine Camera. Unity fügt der Main Camera automatisch einen „Cinemachine Brain“ hinzu.',
      'An der Cinemachine Camera: „Tracking Target“ = dein Spieler.',
      '„Position Control“ bestimmt, wie die Kamera folgt (Follow, Orbital Follow, Third Person Follow, Position Composer, Hard Lock to Target …).',
      '„Rotation Control“ bestimmt, wohin sie schaut (Rotation Composer, Hard Look At, Pan Tilt, Rotate With Follow Target).',
      'Lens (Field of View/Orthographic Size) stellst du an der Cinemachine Camera ein, nicht mehr an der Main Camera.',
      'Schnellstart: GameObject → Cinemachine → Targeted Cameras → Follow Camera / 2D Camera / FreeLook Camera / Third Person Aim Camera.',
    ],
    code: [],
    pitfalls: [
      'Main Camera lässt sich nicht mehr verschieben: Das ist richtig so, der Brain steuert sie. Ändere die Cinemachine Camera.',
      'Alte Tutorials (Cinemachine 2) nutzen „CinemachineVirtualCamera“ und namespace Cinemachine. In Cinemachine 3 heißt es CinemachineCamera und namespace Unity.Cinemachine.',
    ],
    docs: [`${CM}/index.html`, `${CM}/setup-cinemachine-environment.html`, `${CM}/CinemachineCamera.html`],
  },
  {
    id: 'cam-2d',
    title: '2D-Kamera mit Totzone und Levelgrenzen',
    category: 'camera',
    perspectives: ['2d-side', '2d-top'],
    level: 1,
    summary: 'Die Kamera folgt dem Spieler weich, bewegt sich in einer Totzone nicht und bleibt innerhalb des Levels.',
    steps: [
      'GameObject → Cinemachine → Targeted Cameras → 2D Camera. Tracking Target = Spieler.',
      'Am „Cinemachine Position Composer“: Damping (z. B. 0.5) für Weichheit, „Dead Zone“ für den Bereich ohne Kamerabewegung, „Lookahead Time“ (~0.3) damit die Kamera in Laufrichtung vorausschaut.',
      'Lens → Orthographic Size bestimmt den Zoom (kleiner = näher).',
      'Levelgrenzen: Leeres Objekt „CameraBounds“ mit „Polygon Collider 2D“ um das Level legen. Auf einen eigenen Layer legen, der nichts berührt (Physics 2D Collision Matrix).',
      'Cinemachine Camera → Add Extension → „Cinemachine Confiner 2D“ → Bounding Shape 2D = CameraBounds.',
    ],
    code: [],
    pitfalls: [
      'Confiner reagiert nicht auf geänderte Grenzen: nach Änderung im Code InvalidateBoundingShapeCache() aufrufen.',
      'Pixel-Art wackelt: Extension „Cinemachine Pixel Perfect“ hinzufügen und an der Main Camera die „Pixel Perfect Camera“ (URP) nutzen.',
    ],
    docs: [`${CM}/CinemachinePositionComposer.html`, `${CM}/CinemachineConfiner2D.html`],
  },
  {
    id: 'cam-third',
    title: 'Third-Person-Kamera mit Maus/Stick drehen',
    category: 'camera',
    perspectives: ['3d-third'],
    level: 1,
    summary: 'Die FreeLook-Kamera kreist um den Spieler und wird mit der Maus oder dem rechten Stick gedreht.',
    steps: [
      'GameObject → Cinemachine → Targeted Cameras → FreeLook Camera. Tracking Target = Spieler (oder ein Kind-Objekt auf Kopfhöhe für bessere Bildmitte).',
      'Die Kamera nutzt „Orbital Follow“ (Position) und „Rotation Composer“ (Blick). Am Orbital Follow den Radius/die Orbits einstellen.',
      'Der „Cinemachine Input Axis Controller“ liest automatisch die Look-Aktion aus deinen Input Actions. Gain (Empfindlichkeit) dort anpassen.',
      'Für Schulter-Kamera beim Zielen: Targeted Cameras → Third Person Aim Camera (Position „Third Person Follow“), mit höherer Priority beim Zielen aktivieren.',
      'Damit die Figur relativ zur Kamera läuft: ThirdPersonController aus dem Movement-Kapitel nutzen.',
    ],
    code: [],
    pitfalls: ['Kamera dreht sich in die falsche Richtung: am Input Axis Controller beim Y-Achsen-Eintrag „Invert“ umschalten.', 'Kamera geht durch Wände: Extension „Cinemachine Deoccluder“ (3D) hinzufügen.'],
    docs: [`${CM}/CinemachineOrbitalFollow.html`, `${CM}/CinemachineInputAxisController.html`, `${CM}/CinemachineThirdPersonFollow.html`],
  },
  {
    id: 'cam-first',
    title: 'First-Person-Kamera mit Cinemachine',
    category: 'camera',
    perspectives: ['3d-first'],
    level: 2,
    summary: 'Alternative zum eigenen Maus-Look: Die Cinemachine Camera klebt an den Augen und dreht per Pan Tilt. Der Körper folgt der Blickrichtung.',
    steps: [
      'Kind-Objekt „Eyes“ im Spieler auf Augenhöhe.',
      'GameObject → Cinemachine → Cinemachine Camera, Tracking Target = Eyes.',
      'Position Control: „Hard Lock to Target“, Rotation Control: „Pan Tilt“. Add Component → „Cinemachine Input Axis Controller“ (liest die Look-Aktion).',
      'Damit der Körper sich mitdreht, das Skript „FirstPersonBodyYaw“ auf den Spieler und die Cinemachine Camera eintragen. Bewegung dann relativ zu transform.forward (z. B. FirstPersonController ohne eigenen Look-Teil).',
    ],
    code: [
      {
        file: 'FirstPersonBodyYaw.cs',
        text: `using UnityEngine;
using Unity.Cinemachine;

// Dreht den Spielerkörper auf den horizontalen Blickwinkel der Cinemachine-Kamera (Pan Tilt).
public class FirstPersonBodyYaw : MonoBehaviour
{
    [SerializeField] private CinemachineCamera firstPersonCamera;

    private void LateUpdate()
    {
        Vector3 forward = Vector3.ProjectOnPlane(firstPersonCamera.transform.forward, Vector3.up);
        if (forward.sqrMagnitude > 0.001f) transform.rotation = Quaternion.LookRotation(forward, Vector3.up);
    }
}`,
      },
    ],
    pitfalls: ['Pan Tilt dreht die Kamera, nicht den Spieler: ohne FirstPersonBodyYaw läuft der Spieler immer in dieselbe Richtung.'],
    docs: [`${CM}/CinemachinePanTilt.html`, `${CM}/CinemachineHardLockToTarget.html`],
  },
  {
    id: 'cam-switch',
    title: 'Zwischen Kameras wechseln (Räume, Zwischensequenzen)',
    category: 'camera',
    perspectives: [],
    level: 2,
    summary: 'Mehrere Cinemachine Cameras in der Szene, die mit der höchsten Priority ist live. Beim Betreten einer Zone erhöhst du die Priority, der Brain blendet weich über.',
    steps: [
      'Zweite Cinemachine Camera für den Raum anlegen und ausrichten.',
      'Trigger-Collider (Is Trigger) um den Raum, Skript „CameraZone“ daran, die Raum-Kamera eintragen.',
      'Übergangszeit: Main Camera → Cinemachine Brain → „Default Blend“ (z. B. Ease In Out, 1 Sekunde).',
    ],
    code: [
      {
        file: 'CameraZone.cs',
        text: `using UnityEngine;
using Unity.Cinemachine;

// Aktiviert eine Kamera, solange der Spieler in diesem Trigger steht (3D).
// Für 2D: OnTriggerEnter2D/OnTriggerExit2D mit Collider2D verwenden.
public class CameraZone : MonoBehaviour
{
    [SerializeField] private CinemachineCamera zoneCamera;
    [SerializeField] private int activePriority = 20;
    [SerializeField] private int idlePriority = 0;

    private void Start()
    {
        zoneCamera.Priority = idlePriority;
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player")) zoneCamera.Priority = activePriority;
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player")) zoneCamera.Priority = idlePriority;
    }
}`,
      },
    ],
    pitfalls: ['Trigger reagiert nicht: Mindestens eines der beiden Objekte braucht einen Rigidbody (oder Character Controller), und der Spieler muss den Tag „Player“ haben.'],
    docs: [`${CM}/setup-multiple-cameras.html`, `${CM}/CinemachineBrain.html`],
  },
  {
    id: 'cam-shake',
    title: 'Screen Shake bei Treffern und Explosionen',
    category: 'camera',
    perspectives: [],
    level: 2,
    summary: 'Impulse: Eine Quelle sendet einen Stoß, alle Kameras mit Impulse Listener wackeln. Für dauerhaftes Wackeln (Handkamera) gibt es Noise.',
    steps: [
      'Cinemachine Camera → Add Extension → „Cinemachine Impulse Listener“.',
      'Objekt, das den Stoß auslöst (Gegner, Bombe): Add Component → „Cinemachine Impulse Source“.',
      'Skript ruft GenerateImpulseWithForce(stärke) auf.',
      'Dauerhaftes Wackeln: an der Cinemachine Camera „Noise“ → „Basic Multi Channel Perlin“ und ein Noise Profile wählen (z. B. Handheld).',
    ],
    code: [
      {
        file: 'ShakeOnHit.cs',
        text: `using UnityEngine;
using Unity.Cinemachine;

// Löst einen Kamerastoß aus, z. B. aus Health.onHealthChanged heraus.
[RequireComponent(typeof(CinemachineImpulseSource))]
public class ShakeOnHit : MonoBehaviour
{
    [SerializeField] private float force = 1f;
    private CinemachineImpulseSource source;

    private void Awake()
    {
        source = GetComponent<CinemachineImpulseSource>();
    }

    public void Shake()
    {
        source.GenerateImpulseWithForce(force);
    }
}`,
      },
    ],
    pitfalls: ['Nichts wackelt: Impulse Listener an der Cinemachine Camera fehlt.'],
    docs: [`${CM}/CinemachineImpulseSource.html`, `${CM}/CinemachineImpulseListener.html`],
  },
]
