import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { NavBar } from '../components/NavBar'
import { Footer } from '../components/Footer'
import { CategoryTabs } from '../components/CategoryTabs'
import { MarketSearch } from '../components/MarketSearch'
import { InstrumentCard } from '../components/InstrumentCard'
import { FaqAccordion } from '../components/FaqAccordion'
import { AlertsForm } from '../components/AlertsForm'
import { LearnTrigger } from '../components/LearnTrigger'
import { EXPLAINER_VIDEO } from '../content/explainerVideo'
import { FAQ_ITEMS } from '../content/faq'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useOverviewCards } from '../hooks/useOverviewCards'
import { categoryTabs, distinct, marketsSearch } from '../lib/categories'
import { formatDate } from '../lib/format'
import { matchesQuery, searchItems } from '../lib/search'
import { hideSplash } from '../lib/splash'
import styles from './Overview.module.css'

// Kept in step with OVERVIEW_TITLE in src/services/seo.service.ts.
const PAGE_TITLE = 'Commitment of Traders (COT) Report Dashboard | CommitTraders'

// A multiple of both 2 and 3, so the last row of the 3-column and 2-column grids stays full.
const PAGE_SIZE = 12

export function Overview() {
  const { cards, loading, error } = useOverviewCards()
  useDocumentMeta(PAGE_TITLE)

  // The splash covers the page until the first data (or error) is in, so people don't see an empty grid fill in.
  useEffect(() => {
    if (!loading) hideSplash()
  }, [loading])

  // Both the category and the search text live in the URL (?category=financials&q=yen),
  // so a view is linkable and back/forward work. An unknown category falls back to the first.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabs = categoryTabs(cards)
  const active = tabs.find((tab) => tab.category === searchParams.get('category')) ?? tabs[0]
  const query = searchParams.get('q') ?? ''
  const searching = query.trim() !== ''

  const setQuery = (value: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === '') next.delete('q')
        else next.set('q', value)
        return next
      },
      { replace: true }
    )
  }

  // Featured markets first (they're what the API says to show on first load), then the rest.
  const inCategory = active ? cards.filter((card) => card.category === active.category) : []
  const ordered = [...inCategory.filter((card) => card.featured), ...inCategory.filter((card) => !card.featured)]
  const featuredCount = ordered.filter((card) => card.featured).length

  // "Load more" reveals another page each click; changing category or search starts over.
  const scope = `${active?.category ?? ''}|${query.trim()}`
  const [loaded, setLoaded] = useState({ scope, pages: 0 })
  const pages = loaded.scope === scope ? loaded.pages : 0

  const matches = searching ? searchItems(ordered, query) : ordered
  // First load shows just the featured ones (or a page, if none are flagged); a search starts with a page of results.
  const firstLoadCount = searching ? PAGE_SIZE : featuredCount || PAGE_SIZE
  const shown = matches.slice(0, firstLoadCount + pages * PAGE_SIZE)
  const remaining = matches.length - shown.length

  // The alert chips follow what's browsable, not what's typed, so they don't jump around while searching.
  const chipCards = ordered.slice(0, (featuredCount || PAGE_SIZE) + (searching ? 0 : pages * PAGE_SIZE))

  const groupLabel = distinct(inCategory.map((card) => card.primaryCategoryLabel)).join(' / ')
  const reportLabel = distinct(inCategory.map((card) => card.reportFormatLabel)).join(' / ')
  const updatedDate = inCategory.reduce<string | undefined>(
    (latest, card) => (!latest || card.asOfDate > latest ? card.asOfDate : latest),
    undefined
  )

  // A search with no hits here may still hit another category — say so instead of leaving a dead end.
  const elsewhere = searching
    ? tabs
        .filter((tab) => tab.category !== active?.category)
        .map((tab) => ({ tab, count: cards.filter((card) => card.category === tab.category && matchesQuery(card, query)).length }))
        .filter((entry) => entry.count > 0)
    : []

  const status = searching
    ? `${matches.length} of ${ordered.length} ${active?.label ?? ''} markets match “${query.trim()}”`
    : remaining > 0
      ? `Showing ${shown.length} of ${ordered.length} markets`
      : ''

  return (
    <div>
      <NavBar meta={reportLabel || undefined} />
      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <span className={styles.eyebrow}>Commitment of Traders</span>
            <h1 className={styles.title}>{active?.label ?? 'Markets'}</h1>
            {active && (
              <p className={styles.subtitle}>
                Weekly {groupLabel} net positioning across {active.label} markets. Net = Long minus Short;
                positive means the group is net long.
              </p>
            )}
          </div>
          {updatedDate && (
            <div className={styles.updated}>
              <span className={styles.updatedLabel}>Updated</span>
              <span className={styles.updatedValue}>{formatDate(updatedDate)}</span>
            </div>
          )}
        </div>

        {active && <CategoryTabs tabs={tabs} active={active.category} query={query} />}

        <div className={styles.learn}>
          <LearnTrigger video={EXPLAINER_VIDEO} />
        </div>

        {active && (
          <div className={styles.toolbar}>
            <MarketSearch value={query} onChange={setQuery} scopeLabel={active.label} />
            <p className={styles.status} role="status">
              {status}
            </p>
          </div>
        )}

        {error ? (
          <p className={styles.error}>Couldn&rsquo;t load market data ({error.message}).</p>
        ) : !loading && cards.length === 0 ? (
          <div className={styles.empty}>
            <p>No markets available yet.</p>
          </div>
        ) : searching && matches.length === 0 ? (
          <div className={styles.empty}>
            <p>
              No {active?.label} markets match &ldquo;{query.trim()}&rdquo;.
            </p>
            {elsewhere.length > 0 && (
              <p>
                Found in{' '}
                {elsewhere.map(({ tab, count }, index) => (
                  <span key={tab.category}>
                    {index > 0 && ', '}
                    <Link to={{ pathname: '/', search: marketsSearch(tab.category, query) }}>
                      {tab.label} ({count})
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        ) : (
          <div className={styles.grid} aria-busy={loading}>
            {shown.map((card) => (
              <InstrumentCard
                key={card.contractCode}
                instrument={card.displayName}
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

        {remaining > 0 && (
          <div className={styles.more}>
            <button type="button" className={styles.moreButton} onClick={() => setLoaded({ scope, pages: pages + 1 })}>
              Load more <span className={styles.moreCount}>{remaining} remaining</span>
            </button>
          </div>
        )}

        <div className={styles.below}>
          <FaqAccordion items={FAQ_ITEMS} />
          {/* Keyed by category so switching tabs resets the chip selection. */}
          <AlertsForm
            key={active?.category}
            instruments={chipCards.map((card) => ({ id: card.contractCode, label: card.displayName }))}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
