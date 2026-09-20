import { Link } from 'react-router-dom'
import { marketsSearch, type CategoryTab } from '../lib/categories'
import styles from './CategoryTabs.module.css'

export interface CategoryTabsProps {
  tabs: CategoryTab[]
  /** The category currently shown. */
  active: string
  /** The current search text, carried across tabs so "yen" can be tried in each category. */
  query?: string
}

/**
 * Real links (not click handlers) so each category is linkable and
 * back/forward work; the selected one is marked with aria-current.
 */
export function CategoryTabs({ tabs, active, query }: CategoryTabsProps) {
  if (tabs.length === 0) return null

  return (
    <nav className={styles.tabs} aria-label="Market categories">
      {tabs.map((tab) => (
        <Link
          key={tab.category}
          to={{ pathname: '/', search: marketsSearch(tab.category, query) }}
          className={`${styles.tab} ${tab.category === active ? styles.active : ''}`}
          aria-current={tab.category === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
