import { useEffect, useRef, useState } from 'react'

function format(ms) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export default function Stopwatch() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState([])
  const startRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!running) return
    const startTs = performance.now() - elapsed
    startRef.current = startTs
    const tick = () => {
      setElapsed(performance.now() - startRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
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
    <section className="rounded-2xl bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col gap-3">
      <div className="text-2xl uppercase font-black text-white">Stoppuhr</div>
      <div className="rounded-2xl bg-black border-2 border-neon py-6 text-center">
        <span className="text-6xl sm:text-7xl font-black tabular-nums text-neon">
          {format(elapsed)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={startStop}
          className={
            'py-6 rounded-2xl text-2xl font-black uppercase ' +
            (running ? 'bg-red-600 text-white' : 'bg-neon text-black')
          }
        >
          {running ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={lap}
          disabled={!running}
          className="py-6 rounded-2xl text-2xl font-black uppercase bg-white text-black disabled:opacity-40"
        >
          Runde
        </button>
        <button
          onClick={reset}
          className="py-6 rounded-2xl text-2xl font-black uppercase bg-neutral-800 text-white border-2 border-neutral-700"
        >
          Reset
        </button>
      </div>
      {laps.length > 0 && (
        <ol className="flex flex-col gap-1 mt-1">
          {laps.map((l, i) => (
            <li
              key={i}
              className="flex justify-between px-3 py-2 bg-neutral-900 rounded-lg text-xl font-black"
            >
              <span className="text-neutral-400">#{laps.length - i}</span>
              <span className="tabular-nums">{format(l)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
