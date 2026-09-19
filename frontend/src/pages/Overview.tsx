import { NavBar } from '../components/NavBar'
import { InstrumentCard } from '../components/InstrumentCard'
import { FaqAccordion } from '../components/FaqAccordion'
import { AlertsForm } from '../components/AlertsForm'
import { LearnTrigger } from '../components/LearnTrigger'
import { EXPLAINER_VIDEO } from '../content/explainerVideo'
import { FAQ_ITEMS } from '../content/faq'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useOverviewCards } from '../hooks/useOverviewCards'
import { formatDate } from '../lib/format'
import styles from './Overview.module.css'

// Kept in step with OVERVIEW_TITLE in src/services/seo.service.ts.
const PAGE_TITLE = 'Commitment of Traders (COT) Report Dashboard | CommitTraders'

export function Overview() {
  const { cards, updatedDate, loading, error } = useOverviewCards()
  useDocumentMeta(PAGE_TITLE)

  return (
    <div>
      <NavBar />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <span className={styles.eyebrow}>Commitment of Traders</span>
            <h1 className={styles.title}>Metals</h1>
            <p className={styles.subtitle}>
              Weekly Non-Commercial (speculator) net positioning across CME metals futures. Net = Long
              minus Short; positive means speculators are net long.
            </p>
          </div>
          {updatedDate && (
            <div className={styles.updated}>
              <span className={styles.updatedLabel}>Updated</span>
              <span className={styles.updatedValue}>{formatDate(updatedDate)}</span>
            </div>
          )}
        </div>

        <div className={styles.learn}>
          <LearnTrigger video={EXPLAINER_VIDEO} />
        </div>

        {error ? (
          <p className={styles.error}>Couldn&rsquo;t load market data ({error.message}).</p>
        ) : (
          <div className={styles.grid} aria-busy={loading}>
            {cards.map((card) => (
              <InstrumentCard
                key={card.instrument}
                instrument={card.instrument}
                exchange={card.exchange}
                contractCode={card.contractCode}
                net={card.net}
                netPctOi={card.netPctOi}
                long={card.long}
                short={card.short}
                href={card.href}
              />
            ))}
          </div>
        )}

        <div className={styles.below}>
          <FaqAccordion items={FAQ_ITEMS} />
          <AlertsForm
            instruments={cards.map((card) => ({
              id: card.contractCode,
              label: card.instrument,
              defaultChecked: card.instrument === 'Gold'
            }))}
          />
        </div>
      </main>
    </div>
  )
}
