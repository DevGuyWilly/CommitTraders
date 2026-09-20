import { REPO_URL, SITE_AUTHOR, SOCIAL_LINKS } from '../content/site'
import styles from './Footer.module.css'

/** Only real web links open in a new tab; a "#" placeholder should not spawn a blank copy of the page. */
function externalProps(href: string) {
  return href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <p className={styles.line}>
            CommitTraders &middot; Data from the CFTC Commitment of Traders report &middot; Not investment
            advice
          </p>
          <p className={styles.line}>
            Contributions welcome from anyone &mdash; head over to the{' '}
            <a className={styles.link} href={REPO_URL} {...externalProps(REPO_URL)}>
              GitHub repository
            </a>
            .
          </p>
        </div>

        <div className={styles.author}>
          <p className={styles.built}>
            Built by <span className={styles.name}>{SITE_AUTHOR}</span>
          </p>
          <nav aria-label={`Follow ${SITE_AUTHOR}`}>
            <span className={styles.follow}>Follow</span>
            <ul className={styles.socials}>
              {SOCIAL_LINKS.map((social) => (
                <li key={social.platform}>
                  <a
                    className={styles.social}
                    href={social.href}
                    aria-label={`${SITE_AUTHOR} on ${social.platform}`}
                    {...externalProps(social.href)}
                  >
                    {social.platform}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
