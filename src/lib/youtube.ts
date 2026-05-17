const PATTERNS: RegExp[] = [
  /youtu\.be\/([\w-]{6,})/,
  /youtube\.com\/watch\?v=([\w-]{6,})/,
  /youtube\.com\/embed\/([\w-]{6,})/,
  /youtube\.com\/shorts\/([\w-]{6,})/,
]

export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  for (const p of PATTERNS) {
    const m = trimmed.match(p)
    if (m && m[1]) return m[1]
  }
  if (/^[\w-]{6,}$/.test(trimmed)) return trimmed
  return null
}

export function embedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}
