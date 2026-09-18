import { Link } from 'react-router-dom'
import styles from './NavBar.module.css'

function TrendMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={styles.mark}
    >
      <path
        d="M3 16L9.5 9.5L13.5 13.5L21 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 5H21V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NavBar() {
  return (
    <header className={styles.nav}>
      <Link to="/" className={styles.wordmark}>
        <TrendMark />
        <span>CommitTraders</span>
      </Link>
      <span className={styles.meta}>CFTC Legacy Report &middot; Futures Only</span>
    </header>
  )
}
