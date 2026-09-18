import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { CotTableRow } from '../api/types'
import { buildSeriesWithGaps, niceAxisBounds, pickEdgeTicks } from '../lib/chartHelpers'
import { formatAxisDate, formatSigned, pctFormatter } from '../lib/format'
import styles from './TrendChart.module.css'

export interface TrendChartProps {
  rows: CotTableRow[]
  loading?: boolean
}

function ChartSkeleton() {
  return (
    <svg className={styles.skeleton} viewBox="0 0 800 260" preserveAspectRatio="none" aria-hidden="true">
      {[0, 65, 130, 195, 259].map((y) => (
        <line key={y} x1={0} x2={800} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} />
      ))}
      <path
        d="M0,180 C150,170 300,150 450,140 C600,130 700,120 800,110 L800,260 L0,260 Z"
        fill="var(--color-text-faint)"
        opacity={0.1}
      />
    </svg>
  )
}

interface DotProps {
  cx?: number
  cy?: number
  index?: number
  payload?: { netPctOi: number | null }
}

function makeDotRenderer(lastIndex: number, color: string) {
  return function renderDot(props: DotProps) {
    const { cx, cy, index, payload } = props
    if (cx === undefined || cy === undefined || index === undefined || !payload) {
      return <g />
    }
    if (payload.netPctOi === null || index !== lastIndex) {
      return <g key={`dot-${index}`} />
    }

    const label = `${formatSigned(payload.netPctOi, pctFormatter)}%`
    const labelWidth = 26 + label.length * 7.5
    const boxX = cx - labelWidth - 12
    const boxY = cy - 34

    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--color-surface-alt)" strokeWidth={2} />
        <g transform={`translate(${boxX}, ${boxY})`}>
          <rect
            width={labelWidth}
            height={26}
            rx={13}
            fill="var(--color-surface)"
            stroke="var(--color-border-strong)"
          />
          <circle cx={14} cy={13} r={3.5} fill={color} />
          <text x={24} y={17.5} fontFamily="var(--font-display)" fontWeight={700} fontSize={13} fill="var(--color-text-primary)">
            {label}
          </text>
        </g>
      </g>
    )
  }
}

export function TrendChart({ rows, loading = false }: TrendChartProps) {
  const header = (
    <div className={styles.header}>
      <h3 className={styles.title}>Net % of Open Interest</h3>
      <span className={styles.meta}>Non-Commercial &middot; Weekly</span>
    </div>
  )

  if (rows.length === 0) {
    return (
      <div className={styles.container}>
        {header}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <p className={styles.empty}>No reports ingested yet for this contract.</p>
        )}
      </div>
    )
  }

  const ascending = [...rows].reverse()
  const last = ascending[ascending.length - 1]
  const color = last.netPctOi >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'

  if (ascending.length === 1) {
    return (
      <div className={styles.container}>
        {header}
        <div className={styles.singlePointWrap}>
          <svg width="100%" height="260" viewBox="0 0 800 260" preserveAspectRatio="none">
            <circle cx={400} cy={130} r={5} fill={color} />
          </svg>
          <div className={styles.singleCallout}>
            <span className={styles.singleDot} style={{ background: color }} aria-hidden="true" />
            <span className={styles.singleValue}>{formatSigned(last.netPctOi, pctFormatter)}%</span>
          </div>
        </div>
      </div>
    )
  }

  const points = buildSeriesWithGaps(rows)
  const values = ascending.map((row) => row.netPctOi)
  const { min, max, ticks } = niceAxisBounds(values)
  const xTicks = pickEdgeTicks(rows)

  return (
    <div className={styles.container}>
      {header}
      <div className={`${styles.chartWrap} ${loading ? styles.isLoading : ''}`}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={points} margin={{ top: 30, right: 60, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={xTicks}
              tickFormatter={(value: string) => formatAxisDate(value)}
              tick={{ fill: 'var(--color-text-faint)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border-strong)' }}
              tickLine={false}
            />
            <YAxis
              domain={[min, max]}
              ticks={ticks}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: 'var(--color-text-faint)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Area
              type="monotone"
              dataKey="netPctOi"
              stroke={color}
              strokeWidth={2}
              fill="url(#trendGradient)"
              connectNulls={false}
              isAnimationActive={false}
              dot={makeDotRenderer(points.length - 1, color)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
