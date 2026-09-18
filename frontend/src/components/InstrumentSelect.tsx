import styles from './InstrumentSelect.module.css'

export interface InstrumentOption {
  value: string
  label: string
}

export interface InstrumentSelectProps {
  options: InstrumentOption[]
  value: string
  onChange: (value: string) => void
  id?: string
}

export function InstrumentSelect({ options, value, onChange, id = 'instrument-select' }: InstrumentSelectProps) {
  return (
    <div className={styles.wrap}>
      <label htmlFor={id} className={styles.label}>
        Instrument
      </label>
      <div className={styles.selectShell}>
        <select
          id={id}
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          &#9662;
        </span>
      </div>
    </div>
  )
}
