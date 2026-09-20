export interface CategoryTab {
  category: string
  label: string
}

/**
 * The categories present in the data, in the order the API returns them (the
 * API already sorts by display order). Nothing here knows what categories
 * exist — a new one in the registry simply shows up as another tab.
 */
export function categoryTabs(items: { category: string, categoryLabel: string }[]): CategoryTab[] {
  const labels = new Map<string, string>()

  for (const item of items) {
    if (!labels.has(item.category)) labels.set(item.category, item.categoryLabel)
  }

  return [...labels].map(([category, label]) => ({ category, label }))
}

/** The URL query string for a category, optionally with a search: "?category=financials&q=yen". */
export function marketsSearch(category: string, query?: string): string {
  const params = new URLSearchParams({ category })
  if (query?.trim()) params.set('q', query)
  return `?${params.toString()}`
}

/** Unique values, keeping first-seen order. */
export function distinct(values: string[]): string[] {
  return [...new Set(values)]
}
