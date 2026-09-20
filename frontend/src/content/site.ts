/**
 * Site-wide details shown in the footer. Every href below is a "#" placeholder:
 * replace each with the real URL. Nothing else needs to change — the footer
 * renders whatever is listed here.
 */

export const SITE_AUTHOR = 'Wilson Dagah'

export interface SocialLink {
  /** Shown as the link text and named in its accessible label. */
  platform: string
  href: string
}

// TODO: replace the "#" placeholders with the real profile links.
export const SOCIAL_LINKS: SocialLink[] = [
  { platform: 'X', href: 'https://x.com/dev_guy_willy?s=11&t=SHTXdWwJTGhtvAlwuBeLLA' },
  { platform: 'LinkedIn', href: 'https://www.linkedin.com/in/wilson-dachomo-dagah?utm_source=share_via&utm_content=profile&utm_medium=member_ios' },
  { platform: 'GitHub', href: 'https://github.com/DevGuyWilly' },
  { platform: 'YouTube', href: '#' },
  { platform: 'Instagram', href: 'https://www.instagram.com/wilson_dagah/' }
]

// TODO: replace with the GitHub repository URL.
export const REPO_URL = 'https://github.com/DevGuyWilly/CommitTraders'
