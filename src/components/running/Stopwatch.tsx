import { useEffect, useRef, useState } from 'react'
import { Flag, Play, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

function format(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export function Stopwatch() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const startTs = performance.now() - elapsed
    startRef.current = startTs
    const tick = () => {
      setElapsed(performance.now() - startRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // elapsed reset is intentional only on running toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function startStop() {
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setElapsed(0)
    setLaps([])
  }

  function lap() {
    setLaps((l) => [elapsed, ...l].slice(0, 20))
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <div className="text-2xl font-black uppercase tracking-tight">Stoppuhr</div>
      <div className="rounded-2xl border-2 border-primary bg-background py-6 text-center">
        <span className="text-6xl font-black tabular-nums text-primary sm:text-7xl">
          {format(elapsed)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant={running ? 'destructive' : 'default'} size="lg" onClick={startStop}>
          {running ? <Square className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          {running ? 'Stop' : 'Start'}
        </Button>
        <Button variant="secondary" size="lg" onClick={lap} disabled={!running}>
          <Flag className="h-6 w-6" />
          Runde
        </Button>
        <Button variant="neutral" size="lg" onClick={reset}>
          <RotateCcw className="h-6 w-6" />
          Reset
        </Button>
      </div>
      {laps.length > 0 ? (
        <ol className="mt-1 flex flex-col gap-1">
          {laps.map((l, i) => (
            <li
              key={`${i}-${l}`}
              className="flex justify-between rounded-lg bg-secondary px-3 py-2 text-xl font-black"
            >
              <span className="text-muted-foreground">#{laps.length - i}</span>
              <span className="tabular-nums">{format(l)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}
