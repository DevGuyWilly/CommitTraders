import { formatSigned, numberFormatter, signOf } from '../lib/format'

const SIGN_CLASS: Record<ReturnType<typeof signOf>, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-neutral'
}

export interface SignedValueProps {
  value: number
  formatter?: Intl.NumberFormat
  suffix?: string
  className?: string
}

export function SignedValue({ value, formatter = numberFormatter, suffix, className }: SignedValueProps) {
  const classes = [SIGN_CLASS[signOf(value)], 'tabular-nums', className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      {formatSigned(value, formatter)}
      {suffix}
    </span>
  )
}
