export interface ExplainerVideo {
  title: string
  channel: string
  duration?: string
  description: string
  /** Embed URL for the iframe. Empty = video not available yet (placeholder is shown). */
  embedUrl: string
}

export const EXPLAINER_VIDEO: ExplainerVideo = {
  title: 'COT Report Secrets: Spot Institutional Moves Before They Happen',
  channel: 'Transparent Fx Academy',
  description: 'An explainer on reading the Commitment of Traders report, from Transparent Fx Academy.',
  embedUrl: 'https://www.youtube-nocookie.com/embed/fLbZduVkLpM'
}
