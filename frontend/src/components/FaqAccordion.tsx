import { useId, useState } from 'react'
import styles from './FaqAccordion.module.css'

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface FaqAccordionProps {
  items: FaqItem[]
}

function Chevron() {
  return (
    <svg
      className={styles.chevron}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const uid = useId()
  const headingId = `${uid}-heading`
  // First item starts expanded; each item toggles independently.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(items.slice(0, 1).map((item) => item.id))
  )

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <span className={styles.eyebrow}>FAQ</span>
      <h2 id={headingId} className={styles.heading}>
        Frequently asked questions
      </h2>

      <div className={styles.list}>
        {items.map((item) => {
          const isOpen = openIds.has(item.id)
          const buttonId = `${uid}-q-${item.id}`
          const panelId = `${uid}-a-${item.id}`

          return (
            <div key={item.id} className={styles.item}>
              <h3 className={styles.question}>
                <button
                  type="button"
                  id={buttonId}
                  className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                >
                  <span>{item.question}</span>
                  <Chevron />
                </button>
              </h3>
              <div id={panelId} hidden={!isOpen}>
                <p className={styles.answer}>{item.answer}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
