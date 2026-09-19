import { useRef, useState } from 'react'
import type { ExplainerVideo } from '../content/explainerVideo'
import { VideoModal } from './VideoModal'
import styles from './LearnTrigger.module.css'

export interface LearnTriggerProps {
  video: ExplainerVideo
}

export function LearnTrigger({ video }: LearnTriggerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleClose = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.banner}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={styles.icon} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 1.8v8.4a.6.6 0 00.9.5l6.6-4.2a.6.6 0 000-1L3.9 1.3a.6.6 0 00-.9.5z" />
          </svg>
        </span>
        <span className={styles.text}>
          <span className={styles.title}>New to COT data? Watch the video explainer</span>
          <span className={styles.subtitle}>What the report shows, and how to read net positioning</span>
        </span>
        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && <VideoModal video={video} onClose={handleClose} />}
    </>
  )
}
