import type { ReactNode } from 'react'
import styles from './KpiTile.module.css'

export interface KpiTileProps {
  label: string
  value: ReactNode
  delta?: ReactNode
}

export function KpiTile({ label, value, delta }: KpiTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {delta !== undefined && <span className={styles.delta}>{delta}</span>}
      </div>
    </div>
  )
}
