import { Component, type ReactNode } from 'react'
import { recordError } from '../../features/bugs'
import { reportBug } from '../../features/reportBug'
import { translate, resolveLanguage } from '../../i18n'
import { getData } from '../../store'

/**
 * Last line of defence: when a view crashes while rendering, show a calm screen instead of a blank
 * window, and offer to prepare a bug report. The data is untouched; reloading continues where you were.
 */
export class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    recordError(error.message, `${error.stack ?? ''}\n${info.componentStack ?? ''}`)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const lang = resolveLanguage(getData().settings.language)
    const t = (key: Parameters<typeof translate>[1]) => translate(lang, key)
    return (
      <main className="center-screen crash">
        <h1>{t('crashTitle')}</h1>
        <p>{t('crashBody')}</p>
        <pre className="code small">{error.message}</pre>
        <div className="row">
          <button
            className="primary"
            onClick={() => {
              reportBug({ severity: 'crash', error: `${error.message}\n${error.stack ?? ''}`.slice(0, 8000), title: `Crash: ${error.message}`.slice(0, 200) })
              this.setState({ error: null })
            }}
          >
            {t('crashReport')}
          </button>
          <button onClick={() => this.setState({ error: null })}>{t('crashContinue')}</button>
          <button onClick={() => window.location.reload()}>{t('crashReload')}</button>
        </div>
      </main>
    )
  }
}
