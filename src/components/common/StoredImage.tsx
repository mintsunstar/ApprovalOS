import { useEffect, useState } from 'react'
import { resolveFileUrl } from '@/lib/fileStore'

/** Resolves idb: refs (and passthrough data/http URLs) for <img src> */
export function useStoredUrl(ref: string | null | undefined): string {
  const [url, setUrl] = useState(() =>
    ref && !ref.startsWith('idb:') ? ref : ''
  )

  useEffect(() => {
    let cancelled = false
    if (!ref) {
      setUrl('')
      return
    }
    if (!ref.startsWith('idb:')) {
      setUrl(ref)
      return
    }
    resolveFileUrl(ref).then((resolved) => {
      if (!cancelled) setUrl(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [ref])

  return url
}

interface StoredImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fileRef: string | null | undefined
}

export function StoredImage({ fileRef, alt = '', ...props }: StoredImageProps) {
  const src = useStoredUrl(fileRef)
  if (!src) return null
  return <img src={src} alt={alt} {...props} />
}
