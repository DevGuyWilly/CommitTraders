import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ExplainerVideo } from '../content/explainerVideo'
import styles from './VideoModal.module.css'

export interface VideoModalProps {
  video: ExplainerVideo
  onClose: () => void
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v13a.8.8 0 001.2.7l10.5-6.5a.8.8 0 000-1.4L8.2 3.8A.8.8 0 007 4.5z" />
    </svg>
  )
}

/**
 * Uses a native <dialog> opened with showModal(): the rest of the page becomes
 * inert (focus can't leave the dialog), Escape closes it, and it renders in
 * the top layer. It is also portaled to <body>, outside the app root, so no
 * ancestor's overflow/transform can ever clip it.
 */
export function VideoModal({ video, onClose }: VideoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressStartedOnBackdrop = useRef(false)
  const uid = useId()
  const titleId = `${uid}-title`
  const descriptionId = `${uid}-description`

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  // Only close when the press both started and ended on the backdrop, so
  // dragging a text selection out of the panel doesn't dismiss the dialog.
  const handleMouseDown = (event: MouseEvent<HTMLDialogElement>) => {
    pressStartedOnBackdrop.current = event.target === event.currentTarget
  }

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (pressStartedOnBackdrop.current && event.target === event.currentTarget) {
      event.currentTarget.close()
    }
  }

  // Explicit so Escape doesn't depend on the browser's native cancel handling.
  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.currentTarget.close()
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {video.title}
            </h2>
            <span className={styles.meta}>
              {video.channel}
              {video.duration ? ` · ${video.duration}` : ''}
            </span>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close video"
            onClick={() => dialogRef.current?.close()}
          >
            <CloseIcon />
          </button>
        </header>

        <div className={styles.frame}>
          {video.embedUrl ? (
            <iframe
              className={styles.iframe}
              src={video.embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              <span className={styles.playCircle}>
                <PlayIcon />
              </span>
            </div>
          )}
        </div>

        {!video.embedUrl && (
          <p className={styles.placeholderNote}>
            Embed placeholder &mdash; replace with a real YouTube &lt;iframe&gt; (or lite-youtube-embed)
            in the build.
          </p>
        )}

        <p id={descriptionId} className={styles.description}>
          {video.description}
        </p>
      </div>
    </dialog>,
    document.body
  )
}
