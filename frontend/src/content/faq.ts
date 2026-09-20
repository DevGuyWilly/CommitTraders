import type { FaqItem } from '../components/FaqAccordion'

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-cot',
    question: 'What is the Commitment of Traders (COT) report?',
    answer:
      "A weekly report published by the CFTC showing open interest broken down by trader category, for futures and options markets where 20 or more traders hold positions above CFTC reporting thresholds. It's meant to help the public understand market dynamics — the CFTC itself doesn't analyze the data or make recommendations on it."
  },
  {
    id: 'how-current',
    question: 'How current is the data, and when is it updated?',
    answer:
      "Each report reflects positions as of the prior Tuesday's close. The CFTC verifies and releases it the following Friday at 3:30pm ET. This dashboard checks for a new release every Friday, Saturday and Monday evening to catch holiday-delayed publications."
  },
  {
    id: 'non-commercial',
    question: 'What does "Non-Commercial" mean?',
    answer:
      "In the CFTC's Legacy report (used here for Metals), speculators are called Non-Commercial, as opposed to Commercial traders (producers, merchants, processors) hedging real exposure. It's the category most often read as a sentiment signal."
  },
  {
    id: 'how-net-calculated',
    question: 'How is Net calculated?',
    answer:
      'Net = Long − Short for the trader group the report treats as speculators — Non-Commercial for Metals, Leveraged Funds for Financials. Positive means that group holds more long contracts than short; negative means the opposite.'
  },
  {
    id: 'history-fixed',
    question: "Why don't the historical numbers ever change?",
    answer:
      "The CFTC doesn't revise published COT data after release, even if later corrections come to light — so the history here is a fixed record."
  },
  {
    id: 'report-format',
    question: 'Which report format does this dashboard use?',
    answer:
      'It depends on the market. Metals use the CFTC Legacy futures-only report; Financials use the Traders in Financial Futures (TFF) futures-only report. The CFTC also publishes a Disaggregated format for physical commodities (with categories like Managed Money and Swap Dealers) — not currently covered here.'
  },
  {
    id: 'data-source',
    question: 'Where does the underlying data come from?',
    answer:
      "Directly from the CFTC's published reports at cftc.gov — this dashboard doesn't modify or reinterpret the source figures, only aggregates and visualizes them."
  },
  {
    id: 'different-categories',
    question: 'Why do Metals and Financials show different trader categories?',
    answer:
      "The CFTC publishes a separate report for each. The Legacy report splits traders into Commercial and Non-Commercial; the TFF report, built for currencies, interest rates and equity indexes, splits them into Dealer/Intermediary, Asset Manager/Institutional, Leveraged Funds and Other Reportables. This dashboard shows Non-Commercial for Metals and Leveraged Funds for Financials as the speculator-equivalent group. The definitions aren't identical, so compare positioning within a market over time rather than across the two categories."
  }
]
