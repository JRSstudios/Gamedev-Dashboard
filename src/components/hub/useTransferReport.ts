import { useCallback } from 'react'
import type { TransferResult } from '../../features/transfer'
import { useT } from '../../i18n'
import { notify } from '../../store'

/** Toast for the result of a copy into Unity or Blender. */
export function useTransferReport(): (where: string, r: TransferResult) => void {
  const t = useT()
  return useCallback(
    (where: string, r: TransferResult) => {
      if (r.ok) notify(t('integCopied', { where, name: r.name }))
      else if (r.reason === 'notLinked') notify(t('integNotLinked'))
      else if (r.reason === 'browserFile') notify(t('integBrowserFile'))
      else notify(t('integCopyFailed', { reason: r.detail ?? '' }))
    },
    [t],
  )
}
