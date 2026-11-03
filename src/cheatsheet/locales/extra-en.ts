import type { CheatLocale } from './types'

/** Translations of the entries in ../extra.ts. */
export const extraEn: CheatLocale = {
  'sys-pooling': {
    title: 'Object pooling: shots without stutter',
    summary: 'Instead of creating and destroying every projectile, you take one from a stock and give it back. This saves garbage collection and avoids small hitches.',
    steps: [
      'Create a projectile prefab with a Rigidbody 2D/3D and the “PooledProjectile” script.',
      'Create an empty object “ProjectilePool” with the script of the same name and drag the prefab into its field.',
      'To shoot, call pool.Spawn(position, direction) instead of Instantiate.',
      'The projectile returns itself when its lifetime runs out or it hits something.',
    ],
    pitfalls: [
      'Releasing the same object twice throws an error (collectionCheck). Do nothing with the object after giving it back.',
      'Returned objects keep their state: always set speed, lifetime and colour again when you take one.',
    ],
  },
  'ai-state-machine': {
    title: 'Enemies with states: patrol, chase, attack',
    summary: 'A small state machine keeps enemies readable: every state has its own behaviour and clear rules for switching instead of many nested ifs.',
    steps: [
      'Give the enemy a Rigidbody 2D (3D works the same way) and the “EnemyStateMachine” script.',
      'Create two empty child objects as patrol points and drag them into the “waypoints” field.',
      'Give the player the “Player” tag; set sight and attack range in the Inspector.',
      'In the Scene view, yellow and red circles show the ranges.',
    ],
    pitfalls: [
      'No player tagged “Player” in the scene: the enemy only patrols. Set the tag at the top left of the Inspector.',
      'Enemy falls over or spins: Rigidbody 2D → Constraints → Freeze Rotation Z.',
    ],
  },
  '2d-moving-platform': {
    title: 'Moving platform the player rides on',
    summary: 'A platform moves back and forth between two points. When the player stands on it, they ride along instead of sliding off.',
    steps: [
      'Create a platform sprite with a Box Collider 2D and a Rigidbody 2D (Body Type: Kinematic).',
      'Add the “MovingPlatform2D” script and assign two empty objects as start and end point.',
      'The player needs the “Player” tag; it becomes a child of the platform when it lands and is released when it leaves.',
    ],
    pitfalls: ['Platform scaled? Then the player gets distorted while riding. Make the sprite bigger (Draw Mode “Tiled”) instead of the object.'],
  },
  '2d-parallax': {
    title: 'Parallax background for depth',
    summary: 'Background layers move slower than the camera. Three layers (sky, mountains, trees) already make a 2D world feel much deeper.',
    steps: [
      'Create one sprite per background layer and put it at the back in the “Background” sorting layer.',
      'Add “ParallaxLayer” to every layer; factor 0.1 for far away, 0.5 for near.',
      'For endlessly repeating backgrounds turn on “repeatX”; the sprite must tile seamlessly.',
    ],
    pitfalls: ['Background jitters? The camera moves in FixedUpdate, the layer in LateUpdate. With Cinemachine set the Brain “Update Method” to “Late Update”.'],
  },
  'sys-checkpoint': {
    title: 'Checkpoints and respawn',
    summary: 'When the player runs through a checkpoint, they are put back there after dying or falling into a pit.',
    steps: [
      'Give the player “Health” and “PlayerRespawn”; connect Health’s onDied to PlayerRespawn.Respawn.',
      'Checkpoint: an object with a Box Collider 2D (Is Trigger) and the “Checkpoint” script.',
      'For pits, put a wide trigger object below the level and tick killZone in its “Checkpoint” script.',
    ],
    pitfalls: ['Respawn does not happen: the player needs a Rigidbody 2D, otherwise the trigger reports nothing.'],
  },
  'ui-scene-fade': {
    title: 'Scene change with a fade',
    summary: 'Instead of a hard cut, the picture fades to black, the next scene loads in the background and fades back in.',
    steps: [
      'Create a canvas “Fader” with a full-screen black Image and a Canvas Group; set Sort Order high (e.g. 100).',
      'Put the “SceneFader” script on the canvas, drag the Canvas Group into its field, save the canvas as a prefab and place it in the first scene.',
      'Add the scenes under File → Build Profiles → Scene List.',
      'To switch, call SceneFader.Instance.LoadScene("Level2"), e.g. from a goal trigger or menu button.',
    ],
    pitfalls: [
      'Error “Scene couldn’t be loaded”: the scene is missing from the build profile’s Scene List or the name is misspelled.',
      'Two faders after a scene change? Only put the fader in the first scene; the script destroys duplicate copies itself.',
    ],
  },
  'sys-dialogue': {
    title: 'Simple dialogues with ScriptableObjects',
    summary: 'Dialogue texts live as their own files in the project and can be changed without code. A text box shows them line by line.',
    steps: [
      'Right-click in the Project window → Create → Game → Dialogue; enter the speaker and lines.',
      'UI: create a panel with two TextMeshPro texts (name, text), put “DialogueBox” on the panel and assign the texts.',
      'Start a dialogue with dialogueBox.Show(dialogue), continue with Next() (e.g. from a button or the Interact key).',
    ],
    pitfalls: ['TextMeshPro reports a missing font: run Window → TextMeshPro → Import TMP Essential Resources once.'],
  },
  'sys-interact': {
    title: 'Interact with a key (doors, chests, NPCs)',
    summary: 'When the player is close enough to something, a hint appears; the Interact key (E / gamepad west) triggers whatever you set in the Inspector.',
    steps: [
      'Player: add “PlayerInputReader” and “PlayerInteractor”.',
      'Object: Collider 2D with Is Trigger and the “Interactable” script; under “onInteract” choose what happens (e.g. DialogueBox.Show or open a door).',
      'Optionally drag a hint object (“Press E”) into the “prompt” field; it only shows in range.',
    ],
    pitfalls: ['Nothing happens on key press: the project-wide actions need an “Interact” action (new Unity 6 projects have one).'],
  },
}
