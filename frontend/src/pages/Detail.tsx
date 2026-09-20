import { Link, useNavigate, useParams } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
import { InstrumentSelect } from '../components/InstrumentSelect'
import { KpiTile } from '../components/KpiTile'
import { SignedValue } from '../components/SignedValue'
import { TrendChart } from '../components/TrendChart'
import { HeatmapTable } from '../components/HeatmapTable'
import { useCoT } from '../hooks/useCoT'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useInstrumentList } from '../hooks/useInstrumentList'
import { formatSigned, numberFormatter, pctFormatter } from '../lib/format'
import styles from './Detail.module.css'

function renderNetPctOi(value: number) {
  const sign = value >= 0 ? 'text-positive' : 'text-negative'
  return (
    <span className={sign}>
      <span aria-hidden="true">{value >= 0 ? '↑' : '↓'} </span>
      {formatSigned(value, pctFormatter)}%
    </span>
  )
}

export function Detail() {
  const { contractCode = '' } = useParams<{ contractCode: string }>()
  const navigate = useNavigate()
  const { instruments } = useInstrumentList()
  const { rows, loading, error, loadMore, hasMore } = useCoT(contractCode)

  const current = instruments.find((inst) => inst.contractCode === contractCode)
  const displayName = current?.displayName ?? contractCode
  const groupLabel = current?.primaryCategoryLabel
  const latest = rows[0]

  // Kept in step with the title built in src/services/seo.service.ts. Held back
  // until the instrument list loads so the raw contract code never shows in the tab.
  useDocumentMeta(current ? `${displayName} COT Report: Speculator Net Positioning | CommitTraders` : undefined)

  // Switch within the same category — a different one has a different report
  // format and trader group. Until the instrument is known, offer everything.
  const selectOptions = instruments
    .filter((inst) => !current || inst.category === current.category)
    .map((inst) => ({ value: inst.contractCode, label: inst.displayName }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div>
      <NavBar meta={current?.reportFormatLabel} />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link to={current ? { pathname: '/', search: `?category=${encodeURIComponent(current.category)}` } : '/'}>
            &lsaquo; {current?.categoryLabel ?? 'Markets'}
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{displayName}</span>
        </nav>

        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>
              {displayName} &mdash; {groupLabel ? `${groupLabel} ` : ''}Net Positioning
            </h1>
            <p className={styles.subtitle}>
              Weekly {groupLabel ? `${groupLabel} ` : ''}net positioning
              {current ? `. Source: ${current.reportFormatLabel}` : ''}. Net = Long minus Short; positive
              means the group is net long. Cell shading compares each value to its column&rsquo;s range in
              the weeks shown.
            </p>
          </div>

          {selectOptions.length > 0 && (
            <InstrumentSelect
              options={selectOptions}
              value={contractCode}
              onChange={(next) => navigate(`/instruments/${next}`)}
            />
          )}
        </div>

        <div className={styles.kpiRow}>
          <KpiTile label="Net" value={latest ? <SignedValue value={latest.net} /> : '—'} />
          <KpiTile label="Net % of OI" value={latest ? renderNetPctOi(latest.netPctOi) : '—'} />
          <KpiTile
            label="Long"
            value={latest ? numberFormatter.format(latest.long) : '—'}
            delta={latest ? <SignedValue value={latest.changeLong} /> : undefined}
          />
          <KpiTile
            label="Short"
            value={latest ? numberFormatter.format(latest.short) : '—'}
            delta={latest ? <SignedValue value={latest.changeShort} /> : undefined}
          />
        </div>

        <div className={styles.section}>
          <TrendChart rows={rows} loading={loading} groupLabel={groupLabel} />
        </div>

        {error && rows.length === 0 && (
          <p className={styles.error}>Couldn&rsquo;t load data for this contract ({error.message}).</p>
        )}

        <div className={styles.section}>
          <HeatmapTable rows={rows} loading={loading} hasMore={hasMore} onLoadMore={loadMore} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
