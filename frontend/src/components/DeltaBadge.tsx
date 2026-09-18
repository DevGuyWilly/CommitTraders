import { formatSigned, pctFormatter, signOf } from '../lib/format'
import styles from './DeltaBadge.module.css'

export interface DeltaBadgeProps {
  /** Signed percentage value, e.g. 56.41 or -12.6. */
  value: number
  direction: 'up' | 'down'
}

export function DeltaBadge({ value, direction }: DeltaBadgeProps) {
  const sign = signOf(value)

  return (
    <span className={`${styles.badge} ${styles[sign]}`}>
      <span aria-hidden="true" className={styles.arrow}>
        {direction === 'up' ? '↑' : '↓'}
      </span>
      <span className="tabular-nums">{formatSigned(value, pctFormatter)}%</span>
    </span>
  )
}
