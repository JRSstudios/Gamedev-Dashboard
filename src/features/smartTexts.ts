import type { TFn } from '../i18n'
import type { SmartTexts } from '../model/smart'

/** Translated words for the smart proposals. */
export function smartTexts(t: TFn): SmartTexts {
  return {
    folderGoal: t('smartFolderGoal'),
    folderStep: (folder) => t('smartFolderStep', { folder }),
    inputGoal: t('smartInputGoal'),
    inputSteps: [t('smartInputStep1'), t('smartInputStep2'), t('smartInputStep3')],
    scriptsTable: t('smartScriptsTable'),
    scenesTable: t('smartScenesTable'),
    assetsTable: t('smartAssetsTable'),
    colScript: t('smartColScript'),
    colFolder: t('smartColFolder'),
    colScene: t('smartColScene'),
    colStatus: t('smartColStatus'),
    colAsset: t('smartColAsset'),
    colCategory: t('smartColCategory'),
    colDone: t('smartColDone'),
    statuses: [t('smartStatusTodo'), t('smartStatusWip'), t('smartStatusDone')],
    todoNote: (file, items) => `${t('smartTodoNote', { file })}\n${items.map((i) => `- ${i}`).join('\n')}\n#todo`,
    reasons: {
      folders: t('smartWhyFolders'),
      input: t('smartWhyInput'),
      scripts: t('smartWhyScripts'),
      scenes: t('smartWhyScenes'),
      assets: t('smartWhyAssets'),
      todo: t('smartWhyTodo'),
      cheats: t('smartWhyCheats'),
    },
  }
}
