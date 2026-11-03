import type { CheatLocale } from './types'

/** Translations of the entries in ../extra.ts. */
export const extraJa: CheatLocale = {
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
}
