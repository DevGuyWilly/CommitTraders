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
      "The CFTC's Legacy report calls speculators Non-Commercial, as opposed to Commercial traders (producers, merchants, processors) hedging real exposure. This dashboard focuses on Non-Commercial net positioning because it's the category most often read as a sentiment signal."
  },
  {
    id: 'how-net-calculated',
    question: 'How is Net calculated?',
    answer:
      'Net = Long − Short for the Non-Commercial category. Positive means speculators hold more long contracts than short; negative means the opposite.'
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
      'The Legacy, futures-only report, broken down by exchange. The CFTC also publishes Disaggregated and Traders-in-Financial-Futures formats with different category breakdowns (e.g. Managed Money, Swap Dealers) — not currently covered here.'
  },
  {
    id: 'data-source',
    question: 'Where does the underlying data come from?',
    answer:
      "Directly from the CFTC's published Legacy report at cftc.gov — this dashboard doesn't modify or reinterpret the source figures, only aggregates and visualizes them."
  }
]
