import { formatUsd } from '../ai/pricing'
import { useT } from '../i18n'
import { updateSettings } from '../model/ops'
import { summarizeUsage, type UsageTotals } from '../model/usage'
import { mutate, useStore } from '../store'

const fmt = (n: number) => n.toLocaleString()

function Totals({ label, totals }: { label: string; totals: UsageTotals }) {
  const t = useT()
  return (
    <div className="usage-tile">
      <span className="small muted">{label}</span>
      <strong>{formatUsd(totals.cost)}</strong>
      <span className="small muted">{t('usageTokens', { input: fmt(totals.input + totals.cacheRead + totals.cacheWrite), output: fmt(totals.output) })}</span>
      <span className="small muted">{t(totals.requests === 1 ? 'usageRequestsOne' : 'usageRequests', { n: totals.requests })}</span>
    </div>
  )
}

/** Token and cost overview. `compact` is the small card for the project overview. */
export function UsagePanel({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const usage = useStore((s) => s.data.usage)
  const limit = useStore((s) => s.data.settings.claude.monthlyLimitUsd)
  const summary = summarizeUsage(usage)
  const maxDay = Math.max(...summary.byDay.map((d) => d.totals.cost), 0.0001)

  if (compact) {
    return (
      <section className="panel usage compact">
        <h2>{t('usageTitle')}</h2>
        <div className="usage-tiles">
          <Totals label={t('usageToday')} totals={summary.today} />
          <Totals label={t('usageMonth')} totals={summary.month} />
        </div>
      </section>
    )
  }

  return (
    <section className="panel usage">
      <h2>{t('usageTitle')}</h2>
      <p className="small muted">{t('usageEstimate')}</p>
      <div className="usage-tiles">
        <Totals label={t('usageToday')} totals={summary.today} />
        <Totals label={t('usageMonth')} totals={summary.month} />
        <Totals label={t('usageTotal')} totals={summary.total} />
      </div>

      <div className="usage-chart" role="img" aria-label={t('usageChart')}>
        {summary.byDay.map((d) => (
          <div key={d.day} className="usage-bar" title={`${d.day}: ${formatUsd(d.totals.cost)} · ${d.totals.requests}`}>
            <div style={{ height: `${Math.round((d.totals.cost / maxDay) * 100)}%` }} />
          </div>
        ))}
      </div>
      <p className="small muted">{t('usageLast30')}</p>

      {summary.byModel.length > 0 && (
        <div className="usage-tables">
          <table className="mini-table">
            <thead>
              <tr>
                <th>{t('usageModel')}</th>
                <th>{t('usageReq')}</th>
                <th>{t('usageCost')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.byModel.map(([model, totals]) => (
                <tr key={model}>
                  <td>{model}</td>
                  <td>{totals.requests}</td>
                  <td>{formatUsd(totals.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="mini-table">
            <thead>
              <tr>
                <th>{t('usageCommand')}</th>
                <th>{t('usageReq')}</th>
                <th>{t('usageCost')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.byCommand.map(([command, totals]) => (
                <tr key={command}>
                  <td>{command}</td>
                  <td>{totals.requests}</td>
                  <td>{formatUsd(totals.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="field">
        {t('usageLimit')}
        <input
          type="number"
          min={0}
          step={1}
          value={limit ?? ''}
          placeholder={t('usageNoLimit')}
          onChange={(e) => {
            const v = e.target.value === '' ? null : Math.max(0, Number(e.target.value))
            mutate((d) => updateSettings(d, { claude: { ...d.settings.claude, monthlyLimitUsd: v === null || Number.isNaN(v) ? null : v } }))
          }}
        />
      </label>
    </section>
  )
}
