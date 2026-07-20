const DB_NAME = 'approvalos_files'
const STORE = 'blobs'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function isStoredFileRef(url: string | null | undefined): boolean {
  return Boolean(url && url.startsWith('idb:'))
}

export async function putFile(blob: Blob, preferredId?: string): Promise<string> {
  const id = preferredId ?? crypto.randomUUID()
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return `idb:${id}`
}

export async function putDataUrl(dataUrl: string, preferredId?: string): Promise<string> {
  if (isStoredFileRef(dataUrl)) return dataUrl
  if (!dataUrl.startsWith('data:')) return dataUrl
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return putFile(blob, preferredId)
}

export async function getBlob(ref: string): Promise<Blob | null> {
  if (!isStoredFileRef(ref)) return null
  const id = ref.slice(4)
  const db = await openDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

const urlCache = new Map<string, string>()

export async function resolveFileUrl(ref: string | null | undefined): Promise<string> {
  if (!ref) return ''
  if (!isStoredFileRef(ref)) return ref
  const cached = urlCache.get(ref)
  if (cached) return cached
  const blob = await getBlob(ref)
  if (!blob) return ''
  const url = URL.createObjectURL(blob)
  urlCache.set(ref, url)
  return url
}

/** Compress image file to JPEG/WebP data for preview; returns Blob for IndexedDB */
export async function compressImageFile(file: File, maxEdge = 1600, quality = 0.72): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  )
  return blob ?? file
}

export async function fileToStoredRef(file: File): Promise<string> {
  const blob = await compressImageFile(file)
  return putFile(blob)
}
