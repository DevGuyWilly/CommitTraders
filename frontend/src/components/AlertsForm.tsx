import { useId, useState } from 'react'
import styles from './AlertsForm.module.css'

export interface AlertInstrument {
  id: string
  label: string
  defaultChecked?: boolean
}

export interface AlertsFormProps {
  instruments: AlertInstrument[]
}

function CheckIcon() {
  return (
    <svg
      className={styles.check}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 6.2l2.4 2.4 4.6-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AlertsForm({ instruments }: AlertsFormProps) {
  const uid = useId()
  const headingId = `${uid}-heading`
  const emailId = `${uid}-email`
  const captionId = `${uid}-caption`

  // null = untouched, so the defaults apply even though the instrument list
  // arrives asynchronously after first render.
  const [selection, setSelection] = useState<Set<string> | null>(null)
  const checked =
    selection ?? new Set(instruments.filter((inst) => inst.defaultChecked).map((inst) => inst.id))

  const toggle = (id: string) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <span className={styles.eyebrow}>Alerts</span>
      <h2 id={headingId} className={styles.heading}>
        Get notified when new COT data lands
      </h2>
      <p className={styles.intro}>
        Subscribe to any instrument below and we&rsquo;ll email you the moment its weekly report is
        ingested &mdash; usually Friday evening, shortly after the CFTC publishes.
      </p>

      {/* No backend yet: block any native submit so the typed email can never end up in the URL. */}
      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        {instruments.length > 0 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.srOnly}>Instruments to get alerts for</legend>
            <div className={styles.chips}>
              {instruments.map((inst) => {
                const inputId = `${uid}-chip-${inst.id}`
                return (
                  <div key={inst.id} className={styles.chip}>
                    <input
                      id={inputId}
                      className={styles.chipInput}
                      type="checkbox"
                      name="instruments"
                      value={inst.id}
                      checked={checked.has(inst.id)}
                      onChange={() => toggle(inst.id)}
                    />
                    <label htmlFor={inputId} className={styles.chipLabel}>
                      <CheckIcon />
                      {inst.label}
                    </label>
                  </div>
                )
              })}
              <span className={styles.hint}>
                <span aria-hidden="true">+</span> more as markets are added
              </span>
            </div>
          </fieldset>
        )}

        <label htmlFor={emailId} className={styles.fieldLabel}>
          Email address
        </label>
        <div className={styles.row}>
          <input
            id={emailId}
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <button type="submit" className={styles.button} disabled aria-describedby={captionId}>
            Subscribe
          </button>
        </div>
        <p id={captionId} className={styles.caption}>
          Alerts aren&rsquo;t live yet &mdash; this previews the flow.
        </p>
      </form>
    </section>
  )
}
