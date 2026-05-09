import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import type { PageFit } from '../../types'
import Skeleton from '../ui/Skeleton'

interface PageImageProps {
  src: string
  pageNumber: number
  fit: PageFit
  onVisible?: (page: number) => void
}

const fitClass: Record<PageFit, string> = {
  width: 'w-full h-auto',
  height: 'max-h-screen w-auto mx-auto',
  original: 'max-w-none',
}

export default function PageImage({ src, pageNumber, fit, onVisible }: PageImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [retries, setRetries] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onVisible || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(pageNumber)
      },
      { threshold: 0.3 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [onVisible, pageNumber])

  const handleError = () => {
    if (retries < 2) {
      // retry with a small delay
      setTimeout(() => {
        setRetries((n) => n + 1)
        setLoaded(false)
        setError(false)
      }, 1500)
    } else {
      setError(true)
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      {!loaded && !error && (
        <Skeleton className="w-full" style={{ height: '60vh' }} />
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center bg-gray-900 text-gray-500 py-20 text-sm gap-2">
          <span className="text-3xl">⚠️</span>
          <span>Page {pageNumber} failed to load</span>
          <button
            onClick={() => { setRetries(0); setLoaded(false); setError(false) }}
            className="text-violet-400 hover:text-violet-300 text-xs underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <img
          key={`${src}-${retries}`}
          src={src}
          alt={`Page ${pageNumber}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={clsx(
            'block transition-opacity duration-300',
            fitClass[fit],
            loaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0',
          )}
        />
      )}
    </div>
  )
}
