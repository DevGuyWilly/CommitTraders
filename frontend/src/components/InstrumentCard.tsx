import { Link } from 'react-router-dom'
import { numberFormatter } from '../lib/format'
import { DeltaBadge } from './DeltaBadge'
import { SignedValue } from './SignedValue'
import styles from './InstrumentCard.module.css'

export interface InstrumentCardProps {
  instrument: string
  exchange: string
  /** Shown as "EXCHANGE · CODE" — only pass this when the code is confirmed live. */
  contractCode?: string
  net?: number
  netPctOi?: number
  long?: number
  short?: number
  /** Presence of href makes this the active (linked) variant; omit for pending. */
  href?: string
}

export function InstrumentCard({
  instrument,
  exchange,
  contractCode,
  net,
  netPctOi,
  long,
  short,
  href
}: InstrumentCardProps) {
  const hasData = net !== undefined && netPctOi !== undefined && long !== undefined && short !== undefined

  const body = (
    <>
      <div className={styles.header}>
        <div>
          <h3 className={styles.name}>{instrument}</h3>
          <span className={styles.subtitle}>
            {exchange}
            {contractCode ? ` · ${contractCode}` : ''}
          </span>
        </div>
        <span className={styles.chevron} aria-hidden="true">
          &#8250;
        </span>
      </div>

      {hasData ? (
        <>
          <div className={styles.netRow}>
            <SignedValue value={net} className={styles.netValue} />
            <DeltaBadge value={netPctOi} direction={netPctOi >= 0 ? 'up' : 'down'} />
          </div>
          <div className={styles.longShort}>
            <div>
              <span className={styles.lsLabel}>Long</span>
              <span className={`${styles.lsValue} tabular-nums`}>{numberFormatter.format(long)}</span>
            </div>
            <div>
              <span className={styles.lsLabel}>Short</span>
              <span className={`${styles.lsValue} tabular-nums`}>{numberFormatter.format(short)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className={styles.noData}>No data yet</p>
      )}
    </>
  )

  if (href) {
    return (
      <Link to={href} className={`${styles.card} ${styles.linked}`}>
        {body}
      </Link>
    )
  }

  return <div className={styles.card}>{body}</div>
}
