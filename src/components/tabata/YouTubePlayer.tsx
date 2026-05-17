import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { embedUrl, parseYouTubeId } from '@/lib/youtube'

interface YouTubePlayerProps {
  videoId: string
  onChange: (videoId: string) => void
}

export function YouTubePlayer({ videoId, onChange }: YouTubePlayerProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function apply() {
    const id = parseYouTubeId(input)
    if (!id) {
      setError('Keine gültige YouTube-URL oder ID erkannt.')
      return
    }
    setError(null)
    setInput('')
    onChange(id)
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={embedUrl(videoId)}
          title="Tabata Musik"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex flex-col gap-2 bg-secondary p-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="YouTube-URL oder ID einfügen"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply()
            }}
          />
          <Button type="button" variant="default" size="lg" onClick={apply} className="px-5">
            Laden
          </Button>
        </div>
        {error ? <p className="px-1 text-sm font-black text-destructive">{error}</p> : null}
      </div>
    </section>
  )
}
