import type { ReactNode } from 'react'
import type { CotTableRow } from '../api/types'
import { columnRange, divergingHeatColor, heatColor, NEGATIVE_RGB, POSITIVE_RGB } from '../lib/heatmap'
import { formatDate, formatSigned, numberFormatter, pctFormatter } from '../lib/format'
import { SignedValue } from './SignedValue'
import styles from './HeatmapTable.module.css'

export interface HeatmapTableProps {
  rows: CotTableRow[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

function weekArrow(current: number, previous: number | undefined): ReactNode {
  if (previous !== undefined && current > previous) {
    return (
      <span className={styles.arrowUp} aria-hidden="true">
        &#9650;
      </span>
    )
  }
  if (previous !== undefined && current < previous) {
    return (
      <span className={styles.arrowDown} aria-hidden="true">
        &#9660;
      </span>
    )
  }
  return (
    <span className={styles.arrowFlat} aria-hidden="true">
      &ndash;
    </span>
  )
}

export function HeatmapTable({ rows, loading = false, hasMore = false, onLoadMore }: HeatmapTableProps) {
  if (rows.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          {loading ? 'Loading…' : 'No reports ingested yet for this contract.'}
        </p>
      </div>
    )
  }

  const longRange = columnRange(rows.map((r) => r.long))
  const shortRange = columnRange(rows.map((r) => r.short))
  const netRange = columnRange(rows.map((r) => r.net))
  const netPctOiRange = columnRange(rows.map((r) => r.netPctOi))

  return (
    <div className={styles.container}>
      <table className={`${styles.table} ${loading ? styles.isLoading : ''}`}>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Long</th>
            <th scope="col">Short</th>
            <th scope="col">&Delta; Long</th>
            <th scope="col">&Delta; Short</th>
            <th scope="col">Net</th>
            <th scope="col">Net % OI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.date}>
              <td>{formatDate(row.date)}</td>
              <td
                className="tabular-nums"
                style={{ backgroundColor: heatColor(row.long, longRange, POSITIVE_RGB) }}
              >
                {numberFormatter.format(row.long)}
              </td>
              <td
                className="tabular-nums"
                style={{ backgroundColor: heatColor(row.short, shortRange, NEGATIVE_RGB) }}
              >
                {numberFormatter.format(row.short)}
              </td>
              <td>
                <SignedValue value={row.changeLong} />
              </td>
              <td>
                <SignedValue value={row.changeShort} />
              </td>
              <td
                className={`tabular-nums ${styles.strong}`}
                style={{ backgroundColor: divergingHeatColor(row.net, netRange) }}
              >
                {formatSigned(row.net, numberFormatter)}
              </td>
              <td
                className={`tabular-nums ${styles.strong}`}
                style={{ backgroundColor: divergingHeatColor(row.netPctOi, netPctOiRange) }}
              >
                {formatSigned(row.netPctOi, pctFormatter)}% {weekArrow(row.netPctOi, rows[i + 1]?.netPctOi)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <div className={styles.loadMoreRow}>
          <button type="button" className={styles.loadMore} onClick={onLoadMore} disabled={loading}>
            Load older weeks
          </button>
        </div>
      )}
    </div>
  )
}
