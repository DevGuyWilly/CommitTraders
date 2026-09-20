import { useId } from 'react'
import styles from './MarketSearch.module.css'

export interface MarketSearchProps {
  value: string
  onChange: (value: string) => void
  /** What is being searched, e.g. "Financials" — names the field for screen readers and the placeholder. */
  scopeLabel: string
}

export function MarketSearch({ value, onChange, scopeLabel }: MarketSearchProps) {
  const id = useId()

  return (
    <div className={styles.wrap}>
      <label htmlFor={id} className={styles.srOnly}>
        Search {scopeLabel} markets
      </label>
      <svg className={styles.icon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        className={styles.input}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Search ${scopeLabel} markets`}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}
