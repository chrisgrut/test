const PREFIX = 'handball-dashboard:v1:'

export function storageKey(key: string): string {
  return PREFIX + key
}

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(storageKey(key))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value))
  } catch {
    // quota / privacy-mode / serialisation errors ignored on purpose
  }
}
