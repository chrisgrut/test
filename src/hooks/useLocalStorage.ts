import { useCallback, useEffect, useRef, useState } from 'react'
import { loadJSON, saveJSON, storageKey } from '@/lib/storage'

type SetValue<T> = (next: T | ((prev: T) => T)) => void

export function useLocalStorage<T>(key: string, initial: T): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => loadJSON<T>(key, initial))
  const fullKey = storageKey(key)
  const skipNextWrite = useRef(false)

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    saveJSON(key, value)
  }, [key, value])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== fullKey) return
      if (e.newValue === null) return
      try {
        const next = JSON.parse(e.newValue) as T
        skipNextWrite.current = true
        setValue(next)
      } catch {
        // ignore parse errors from foreign writers
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [fullKey])

  const update = useCallback<SetValue<T>>((next) => {
    setValue((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next))
  }, [])

  return [value, update]
}
