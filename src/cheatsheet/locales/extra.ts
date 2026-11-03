import type { CheatLocale } from './types'

/** Translations of the entries in ../extra.ts. */
export const EXTRA_LOCALES: Record<'en' | 'it' | 'zh' | 'ja' | 'es' | 'ru', CheatLocale> = {
  en: {
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
  },
  it: {
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
  },
  zh: {
    'sys-pooling': {
      title: '对象池：射击不卡顿',
      summary: '不再为每颗子弹创建和销毁对象，而是从池中取出、用完归还。这样能减少垃圾回收，避免细小卡顿。',
      steps: [
        '创建带 Rigidbody 2D/3D 和“PooledProjectile”脚本的子弹预制体。',
        '创建空对象“ProjectilePool”，挂上同名脚本，并把预制体拖到字段中。',
        '射击时调用 pool.Spawn(位置, 方向)，而不是 Instantiate。',
        '子弹在寿命结束或击中目标时会自动归还。',
      ],
      pitfalls: [
        '同一个对象归还两次会报错（collectionCheck）。归还后不要再使用该对象。',
        '归还的对象会保留状态：每次取出时都要重新设置速度、寿命和颜色。',
      ],
    },
    'ai-state-machine': {
      title: '带状态的敌人：巡逻、追击、攻击',
      summary: '一个小型状态机让敌人逻辑清晰：每个状态有自己的行为和明确的切换规则，而不是一堆嵌套的 if。',
      steps: [
        '给敌人添加 Rigidbody 2D（3D 同理）和“EnemyStateMachine”脚本。',
        '创建两个空子对象作为巡逻点，并拖到“waypoints”字段中。',
        '给玩家设置“Player”标签；在 Inspector 中设置视野和攻击范围。',
        '在 Scene 视图中，黄色和红色圆圈显示范围。',
      ],
      pitfalls: [
        '场景中没有带“Player”标签的玩家：敌人只会巡逻。在 Inspector 左上角设置标签。',
        '敌人倒下或旋转：Rigidbody 2D → Constraints → Freeze Rotation Z。',
      ],
    },
    '2d-moving-platform': {
      title: '玩家可以乘坐的移动平台',
      summary: '平台在两点之间来回移动。玩家站在上面时会随之移动，而不会滑下去。',
      steps: [
        '创建带 Box Collider 2D 和 Rigidbody 2D（Body Type：Kinematic）的平台精灵。',
        '添加“MovingPlatform2D”脚本，并指定两个空对象作为起点和终点。',
        '玩家需要“Player”标签；站上平台时成为平台的子对象，离开时解除。',
      ],
      pitfalls: ['平台被缩放了？玩家乘坐时会被拉伸。请放大精灵（Draw Mode“Tiled”），而不是放大对象。'],
    },
    '2d-parallax': {
      title: '用视差背景营造纵深',
      summary: '背景层移动得比摄像机慢。只需三层（天空、山、树），2D 世界就会显得更有纵深。',
      steps: [
        '每个背景层创建一个精灵，放到“Background”排序层的后面。',
        '给每一层添加“ParallaxLayer”；远处用 factor 0.1，近处用 0.5。',
        '需要无限重复的背景时开启“repeatX”；精灵必须能无缝平铺。',
      ],
      pitfalls: ['背景抖动？摄像机在 FixedUpdate 中移动，而背景层在 LateUpdate 中移动。使用 Cinemachine 时，把 Brain 的“Update Method”设为“Late Update”。'],
    },
    'sys-checkpoint': {
      title: '检查点与重生',
      summary: '玩家经过检查点后，死亡或掉进坑里时会在那里重生。',
      steps: [
        '给玩家添加“Health”和“PlayerRespawn”；把 Health 的 onDied 连接到 PlayerRespawn.Respawn。',
        '检查点：带 Box Collider 2D（Is Trigger）和“Checkpoint”脚本的对象。',
        '对于坑，在关卡下方放一个宽的触发器对象，并在其“Checkpoint”脚本中勾选 killZone。',
      ],
      pitfalls: ['没有重生：玩家需要 Rigidbody 2D，否则触发器不会报告任何事件。'],
    },
    'ui-scene-fade': {
      title: '带淡入淡出的场景切换',
      summary: '不再硬切，画面先淡出到黑色，下一个场景在后台加载后再淡入。',
      steps: [
        '创建名为“Fader”的画布，包含一张全屏黑色 Image 和一个 Canvas Group；把 Sort Order 设高（例如 100）。',
        '把“SceneFader”脚本放到画布上，把 Canvas Group 拖到字段中，将画布保存为预制体并放到第一个场景中。',
        '在 File → Build Profiles → Scene List 中添加场景。',
        '切换时调用 SceneFader.Instance.LoadScene("Level2")，例如由终点触发器或菜单按钮调用。',
      ],
      pitfalls: [
        '报错“Scene couldn’t be loaded”：场景不在构建配置的 Scene List 中，或名称拼写错误。',
        '切换场景后有两个 Fader？只把 Fader 放在第一个场景中；脚本会自动销毁重复的副本。',
      ],
    },
    'sys-dialogue': {
      title: '用 ScriptableObject 做简单对话',
      summary: '对话文本作为独立文件保存在项目中，无需改代码就能修改。文本框会逐行显示。',
      steps: [
        '在 Project 窗口右键 → Create → Game → Dialogue；填写说话人和台词。',
        'UI：创建一个带两个 TextMeshPro 文本（名字、内容）的面板，把“DialogueBox”放到面板上并指定文本。',
        '用 dialogueBox.Show(对话) 开始对话，用 Next() 继续（例如通过按钮或 Interact 键）。',
      ],
      pitfalls: ['TextMeshPro 提示缺少字体：执行一次 Window → TextMeshPro → Import TMP Essential Resources。'],
    },
    'sys-interact': {
      title: '按键互动（门、宝箱、NPC）',
      summary: '玩家靠近某物时会出现提示；按下 Interact 键（E / 手柄西键）会执行你在 Inspector 中设置的操作。',
      steps: [
        '玩家：添加“PlayerInputReader”和“PlayerInteractor”。',
        '物体：带 Is Trigger 的 Collider 2D 和“Interactable”脚本；在“onInteract”中设置要发生的事（例如 DialogueBox.Show 或开门）。',
        '可选：把提示对象（“按 E”）拖到“prompt”字段；它只在范围内显示。',
      ],
      pitfalls: ['按键没有反应：项目级输入动作中必须有“Interact”动作（新的 Unity 6 项目自带）。'],
    },
  },
  ja: {
    'sys-pooling': {
      title: 'オブジェクトプール：カクつかない射撃',
      summary: '弾を毎回生成・破棄するのではなく、ストックから取り出して返します。ガベージコレクションを減らし、小さなカクつきを防げます。',
      steps: [
        'Rigidbody 2D/3D と「PooledProjectile」スクリプトを付けた弾のプレハブを作ります。',
        '空のオブジェクト「ProjectilePool」に同名のスクリプトを付け、プレハブをフィールドにドラッグします。',
        '撃つときは Instantiate の代わりに pool.Spawn(位置, 方向) を呼びます。',
        '弾は寿命が尽きるか何かに当たると自分でプールに戻ります。',
      ],
      pitfalls: [
        '同じオブジェクトを2回返すとエラーになります（collectionCheck）。返した後はそのオブジェクトを使わないでください。',
        '返したオブジェクトは状態を保持します。取り出すたびに速度・寿命・色を設定し直してください。',
      ],
    },
    'ai-state-machine': {
      title: '状態を持つ敵：巡回・追跡・攻撃',
      summary: '小さなステートマシンで敵の処理が分かりやすくなります。入れ子の if の代わりに、状態ごとの動きと明確な切り替えルールを持たせます。',
      steps: [
        '敵に Rigidbody 2D（3D も同様）と「EnemyStateMachine」スクリプトを付けます。',
        '巡回地点として空の子オブジェクトを2つ作り、「waypoints」フィールドにドラッグします。',
        'プレイヤーに「Player」タグを付け、視界と攻撃範囲を Inspector で設定します。',
        'Scene ビューでは黄色と赤の円が範囲を示します。',
      ],
      pitfalls: [
        'シーンに「Player」タグのプレイヤーがいない：敵は巡回するだけです。Inspector の左上でタグを設定してください。',
        '敵が倒れる・回転する：Rigidbody 2D → Constraints → Freeze Rotation Z。',
      ],
    },
    '2d-moving-platform': {
      title: 'プレイヤーが乗れる動く足場',
      summary: '足場が2点の間を往復します。プレイヤーが乗ると滑り落ちずに一緒に運ばれます。',
      steps: [
        'Box Collider 2D と Rigidbody 2D（Body Type：Kinematic）を付けた足場のスプライトを作ります。',
        '「MovingPlatform2D」スクリプトを追加し、始点と終点として空のオブジェクトを2つ割り当てます。',
        'プレイヤーには「Player」タグが必要です。乗ると足場の子になり、降りると外れます。',
      ],
      pitfalls: ['足場をスケールしていますか？乗っている間プレイヤーが歪みます。オブジェクトではなくスプライト（Draw Mode「Tiled」）を大きくしてください。'],
    },
    '2d-parallax': {
      title: '奥行きを出すパララックス背景',
      summary: '背景レイヤーをカメラより遅く動かします。空・山・木の3層だけで、2D の世界がずっと奥行きのあるものになります。',
      steps: [
        '背景レイヤーごとにスプライトを作り、ソーティングレイヤー「Background」の奥に配置します。',
        '各レイヤーに「ParallaxLayer」を付けます。遠いものは factor 0.1、近いものは 0.5。',
        '無限に繰り返す背景には「repeatX」をオンにします。スプライトは継ぎ目なく並べられる必要があります。',
      ],
      pitfalls: ['背景がガタつく？カメラが FixedUpdate、レイヤーが LateUpdate で動いています。Cinemachine では Brain の「Update Method」を「Late Update」にします。'],
    },
    'sys-checkpoint': {
      title: 'チェックポイントとリスポーン',
      summary: 'プレイヤーがチェックポイントを通ると、倒されたり穴に落ちたりしたときにそこへ戻されます。',
      steps: [
        'プレイヤーに「Health」と「PlayerRespawn」を付け、Health の onDied を PlayerRespawn.Respawn に接続します。',
        'チェックポイント：Box Collider 2D（Is Trigger）と「Checkpoint」スクリプトを付けたオブジェクト。',
        '穴にはレベルの下に幅の広いトリガーを置き、その「Checkpoint」スクリプトで killZone にチェックを入れます。',
      ],
      pitfalls: ['リスポーンしない：プレイヤーに Rigidbody 2D がないと、トリガーは何も報告しません。'],
    },
    'ui-scene-fade': {
      title: 'フェード付きのシーン切り替え',
      summary: 'いきなり切り替える代わりに、画面を黒にフェードし、次のシーンを裏で読み込んでからフェードインします。',
      steps: [
        '全画面の黒い Image と Canvas Group を持つキャンバス「Fader」を作り、Sort Order を高く（例：100）します。',
        'キャンバスに「SceneFader」スクリプトを付け、Canvas Group をフィールドにドラッグし、プレハブとして保存して最初のシーンに置きます。',
        'File → Build Profiles → Scene List にシーンを追加します。',
        '切り替えるには SceneFader.Instance.LoadScene("Level2") を呼びます（例：ゴールのトリガーやメニューのボタンから）。',
      ],
      pitfalls: [
        'エラー「Scene couldn’t be loaded」：ビルドプロファイルの Scene List にシーンがないか、名前が間違っています。',
        'シーン切り替え後に Fader が2つある？Fader は最初のシーンにだけ置いてください。重複はスクリプトが自動で破棄します。',
      ],
    },
    'sys-dialogue': {
      title: 'ScriptableObject で作るシンプルな会話',
      summary: '会話テキストはプロジェクト内の個別ファイルとして保存され、コードを変えずに編集できます。テキストボックスが1行ずつ表示します。',
      steps: [
        'Project ウィンドウで右クリック → Create → Game → Dialogue。話し手とセリフを入力します。',
        'UI：TextMeshPro のテキスト2つ（名前・本文）を持つパネルを作り、「DialogueBox」をパネルに付けてテキストを割り当てます。',
        'dialogueBox.Show(会話) で開始し、Next() で進めます（例：ボタンや Interact キーから）。',
      ],
      pitfalls: ['TextMeshPro がフォントの不足を報告する：Window → TextMeshPro → Import TMP Essential Resources を一度実行してください。'],
    },
    'sys-interact': {
      title: 'キーで調べる（ドア・宝箱・NPC）',
      summary: 'プレイヤーが近づくとヒントが表示され、Interact キー（E／ゲームパッドの西ボタン）で Inspector に設定した処理が実行されます。',
      steps: [
        'プレイヤー：「PlayerInputReader」と「PlayerInteractor」を追加します。',
        '対象：Is Trigger の Collider 2D と「Interactable」スクリプト。「onInteract」で何が起きるか（例：DialogueBox.Show やドアを開く）を設定します。',
        '必要ならヒント用オブジェクト（「E を押す」）を「prompt」フィールドにドラッグします。範囲内でだけ表示されます。',
      ],
      pitfalls: ['キーを押しても何も起きない：プロジェクト全体のアクションに「Interact」が必要です（新しい Unity 6 プロジェクトには入っています）。'],
    },
  },
  es: {
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
  },
  ru: {
    'sys-pooling': {
      title: 'Пул объектов: стрельба без подтормаживаний',
      summary: 'Вместо того чтобы создавать и уничтожать каждый снаряд, вы берёте его из запаса и возвращаете обратно. Это экономит сборку мусора и убирает мелкие рывки.',
      steps: [
        'Создайте префаб снаряда с Rigidbody 2D/3D и скриптом «PooledProjectile».',
        'Создайте пустой объект «ProjectilePool» с одноимённым скриптом и перетащите префаб в его поле.',
        'Для выстрела вызывайте pool.Spawn(позиция, направление) вместо Instantiate.',
        'Снаряд сам возвращается в пул, когда истекает время жизни или он во что-то попадает.',
      ],
      pitfalls: [
        'Повторный возврат того же объекта вызывает ошибку (collectionCheck). После возврата объект больше не трогайте.',
        'Возвращённые объекты сохраняют состояние: каждый раз заново задавайте скорость, время жизни и цвет.',
      ],
    },
    'ai-state-machine': {
      title: 'Враги с состояниями: патруль, преследование, атака',
      summary: 'Небольшой конечный автомат делает поведение врагов понятным: у каждого состояния своё поведение и чёткие правила перехода вместо множества вложенных if.',
      steps: [
        'Добавьте врагу Rigidbody 2D (в 3D всё так же) и скрипт «EnemyStateMachine».',
        'Создайте два пустых дочерних объекта как точки патруля и перетащите их в поле «waypoints».',
        'Назначьте игроку тег «Player»; задайте дальность обзора и атаки в Inspector.',
        'В окне Scene жёлтый и красный круги показывают дальности.',
      ],
      pitfalls: [
        'В сцене нет игрока с тегом «Player»: враг только патрулирует. Тег задаётся слева вверху в Inspector.',
        'Враг падает или вращается: Rigidbody 2D → Constraints → Freeze Rotation Z.',
      ],
    },
    '2d-moving-platform': {
      title: 'Движущаяся платформа, на которой едет игрок',
      summary: 'Платформа ездит туда-обратно между двумя точками. Игрок, стоящий на ней, едет вместе с ней и не соскальзывает.',
      steps: [
        'Создайте спрайт платформы с Box Collider 2D и Rigidbody 2D (Body Type: Kinematic).',
        'Добавьте скрипт «MovingPlatform2D» и назначьте два пустых объекта начальной и конечной точкой.',
        'Игроку нужен тег «Player»; при посадке он становится дочерним объектом платформы, при сходе — отсоединяется.',
      ],
      pitfalls: ['Платформа масштабирована? Тогда игрок искажается во время поездки. Увеличивайте спрайт (Draw Mode «Tiled»), а не объект.'],
    },
    '2d-parallax': {
      title: 'Параллакс-фон для глубины',
      summary: 'Слои фона движутся медленнее камеры. Уже три слоя (небо, горы, деревья) делают 2D-мир заметно глубже.',
      steps: [
        'Создайте по спрайту на каждый слой фона и поместите его назад в sorting layer «Background».',
        'Добавьте «ParallaxLayer» на каждый слой; factor 0.1 для дальнего, 0.5 для близкого.',
        'Для бесконечно повторяющегося фона включите «repeatX»; спрайт должен стыковаться без швов.',
      ],
      pitfalls: ['Фон дрожит? Камера движется в FixedUpdate, а слой — в LateUpdate. С Cinemachine установите у Brain «Update Method» = «Late Update».'],
    },
    'sys-checkpoint': {
      title: 'Чекпоинты и возрождение',
      summary: 'Когда игрок проходит через чекпоинт, после смерти или падения в яму он возрождается там.',
      steps: [
        'Добавьте игроку «Health» и «PlayerRespawn»; подключите onDied из Health к PlayerRespawn.Respawn.',
        'Чекпоинт: объект с Box Collider 2D (Is Trigger) и скриптом «Checkpoint».',
        'Для ям положите широкий триггер под уровнем и отметьте killZone в его скрипте «Checkpoint».',
      ],
      pitfalls: ['Возрождения нет: игроку нужен Rigidbody 2D, иначе триггер ничего не сообщает.'],
    },
    'ui-scene-fade': {
      title: 'Смена сцены с затемнением',
      summary: 'Вместо резкой склейки экран плавно темнеет, следующая сцена загружается в фоне и снова проявляется.',
      steps: [
        'Создайте canvas «Fader» с полноэкранным чёрным Image и Canvas Group; задайте высокий Sort Order (например, 100).',
        'Повесьте скрипт «SceneFader» на canvas, перетащите Canvas Group в его поле, сохраните canvas как префаб и поместите в первую сцену.',
        'Добавьте сцены в File → Build Profiles → Scene List.',
        'Для смены вызывайте SceneFader.Instance.LoadScene("Level2"), например из триггера финиша или кнопки меню.',
      ],
      pitfalls: [
        'Ошибка «Scene couldn’t be loaded»: сцены нет в Scene List профиля сборки или имя написано неверно.',
        'После смены сцены два Fader? Кладите Fader только в первую сцену; скрипт сам уничтожает дубликаты.',
      ],
    },
    'sys-dialogue': {
      title: 'Простые диалоги на ScriptableObject',
      summary: 'Тексты диалогов хранятся отдельными файлами в проекте и меняются без кода. Окно текста показывает их построчно.',
      steps: [
        'Правый щелчок в окне Project → Create → Game → Dialogue; укажите говорящего и реплики.',
        'UI: создайте панель с двумя текстами TextMeshPro (имя, текст), повесьте «DialogueBox» на панель и назначьте тексты.',
        'Запускайте диалог через dialogueBox.Show(диалог), продолжайте через Next() (например, кнопкой или клавишей Interact).',
      ],
      pitfalls: ['TextMeshPro сообщает об отсутствии шрифта: один раз выполните Window → TextMeshPro → Import TMP Essential Resources.'],
    },
    'sys-interact': {
      title: 'Взаимодействие по клавише (двери, сундуки, NPC)',
      summary: 'Когда игрок подходит достаточно близко, появляется подсказка; клавиша Interact (E / западная кнопка геймпада) запускает то, что вы задали в Inspector.',
      steps: [
        'Игрок: добавьте «PlayerInputReader» и «PlayerInteractor».',
        'Объект: Collider 2D с Is Trigger и скрипт «Interactable»; в «onInteract» выберите, что произойдёт (например, DialogueBox.Show или открыть дверь).',
        'По желанию перетащите объект-подсказку («Нажмите E») в поле «prompt»; он показывается только в радиусе действия.',
      ],
      pitfalls: ['При нажатии ничего не происходит: среди действий проекта должно быть действие «Interact» (в новых проектах Unity 6 оно есть).'],
    },
  },
}
