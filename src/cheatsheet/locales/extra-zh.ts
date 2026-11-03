import type { CheatLocale } from './types'

/** Translations of the entries in ../extra.ts. */
export const extraZh: CheatLocale = {
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
}
