const FADE_MS = 400

/**
 * Fades out the splash screen from index.html and then removes it. Safe to
 * call any number of times, from anywhere — after the first call it does nothing.
 */
export function hideSplash(): void {
  const splash = document.getElementById('splash')
  if (!splash || splash.classList.contains('splash-done')) return

  splash.classList.add('splash-done')
  window.setTimeout(() => splash.remove(), FADE_MS + 50)
}
