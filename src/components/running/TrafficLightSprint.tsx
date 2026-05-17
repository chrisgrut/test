import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBeep } from '@/hooks/useBeep'
import { cn } from '@/lib/utils'

type ColorId = 'red' | 'yellow' | 'green'

interface TrafficColor {
  id: ColorId
  label: string
  bg: string
  text: string
  hz: number
}

const COLORS: TrafficColor[] = [
  { id: 'red', label: 'ROT', bg: 'bg-red-600', text: 'text-white', hz: 300 },
  { id: 'yellow', label: 'GELB', bg: 'bg-yellow-400', text: 'text-black', hz: 600 },
  { id: 'green', label: 'GRÜN', bg: 'bg-green-500', text: 'text-black', hz: 900 },
]

function pickNext(current: TrafficColor | null): TrafficColor {
  const others = COLORS.filter((c) => c.id !== current?.id)
  const pick = others[Math.floor(Math.random() * others.length)]
  return pick ?? COLORS[0]!
}

function randomDelayMs(): number {
  return 3000 + Math.random() * 3000
}

export function TrafficLightSprint() {
  const [running, setRunning] = useState(false)
  const [color, setColor] = useState<TrafficColor | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const beep = useBeep()

  useEffect(() => {
    if (!running) {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      return
    }
    function schedule(prev: TrafficColor | null) {
      const next = pickNext(prev)
      setColor(next)
      beep(next.hz, 0.15)
      timeoutRef.current = window.setTimeout(() => schedule(next), randomDelayMs())
    }
    schedule(color)
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
    // schedule loop deliberately restarts only on running toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function startStop() {
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setColor(null)
  }

  const bg = color ? color.bg : 'bg-black'
  const text = color ? color.text : 'text-white'
  const label = color ? color.label : 'AMPEL-SPRINT'

  return (
    <div className={cn('flex min-h-[80vh] flex-col gap-3 p-3 transition-colors duration-150', bg)}>
      <div className={cn('flex flex-1 flex-col items-center justify-center text-center', text)}>
        <span className="text-3xl font-black uppercase tracking-tight sm:text-4xl">Kommando</span>
        <span className="text-[7rem] font-black leading-none tracking-tight sm:text-[12rem]">
          {label}
        </span>
        {!color ? (
          <span className="mt-4 text-xl font-black text-muted-foreground sm:text-2xl">
            Drücke Start, dann die Farbe laut ansagen
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={running ? 'neutral' : 'default'}
          size="xl"
          onClick={startStop}
          className="border-4 border-black"
        >
          {running ? <Square className="h-7 w-7" /> : <Play className="h-7 w-7" />}
          {running ? 'Stop' : 'Start'}
        </Button>
        <Button
          variant="secondary"
          size="xl"
          onClick={reset}
          className="border-4 border-black bg-white text-black"
        >
          <RotateCcw className="h-7 w-7" />
          Reset
        </Button>
      </div>
    </div>
  )
}
