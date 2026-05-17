import { useCallback, useEffect, useState } from 'react'

const KEY = 'handball.tabata.images.v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persist(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // quota exceeded — silently ignore
  }
}

// Read file → compress via canvas → return JPEG data URL (max 600px on longest side, quality 0.82).
function compressFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      img.onload = () => {
        const MAX = 600
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function useExerciseImages() {
  const [images, setImages] = useState(() =>
    typeof window === 'undefined' ? {} : load(),
  )

  useEffect(() => {
    function onStorage(e) {
      if (e.key === KEY) setImages(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setImage = useCallback(async (id, file) => {
    const dataUrl = await compressFile(file)
    setImages((prev) => {
      const next = { ...prev, [id]: dataUrl }
      persist(next)
      return next
    })
  }, [])

  const removeImage = useCallback((id) => {
    setImages((prev) => {
      const next = { ...prev }
      delete next[id]
      persist(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setImages({})
    persist({})
  }, [])

  return { images, setImage, removeImage, clearAll }
}
