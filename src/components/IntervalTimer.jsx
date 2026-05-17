import { useEffect, useRef, useState } from 'react'
import { useBeep } from '../hooks/useBeep.js'

export default function IntervalTimer({ label }) {
  const [workSec, setWorkSec] = useState(30)
  const [restSec, setRestSec] = useState(60)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('work') // 'work' | 'rest'
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [round, setRound] = useState(1)
  const intervalRef = useRef(null)
  const beep = useBeep()

  useEffect(() => {
    if (!running) {
      setSecondsLeft(phase === 'work' ? workSec : restSec)
    }
  }, [workSec, restSec, phase, running])

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) {
          if (s - 1 <= 3) beep(660, 0.1)
          return s - 1
        }
        // transition
        if (phase === 'work') {
          beep(440, 0.4)
          setPhase('rest')
          return restSec
        } else {
          beep(880, 0.4)
          setPhase('work')
          setRound((r) => r + 1)
          return workSec
        }
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, phase, workSec, restSec, beep])

  function startStop() {
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setPhase('work')
    setSecondsLeft(workSec)
    setRound(1)
  }

  const phaseColor = phase === 'work' ? 'bg-neon text-black' : 'bg-orange-500 text-black'
  const phaseLabel = phase === 'work' ? 'BELASTUNG' : 'PAUSE'

  return (
    <section className="rounded-2xl bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-black text-white">{label}</span>
        <span className="text-xl text-neutral-400 font-black">Runde {round}</span>
      </div>

      <div className={'rounded-2xl flex flex-col items-center justify-center py-6 ' + phaseColor}>
        <span className="text-2xl uppercase font-black">{phaseLabel}</span>
        <span className="text-[8rem] sm:text-[10rem] leading-none font-black tabular-nums">
          {secondsLeft}
        </span>
        <span className="text-2xl font-black">SEKUNDEN</span>
      </div>

      <Adjuster
        label="Belastung"
        value={workSec}
        onChange={setWorkSec}
        disabled={running}
        accent="text-neon"
      />
      <Adjuster
        label="Pause"
        value={restSec}
        onChange={setRestSec}
        disabled={running}
        accent="text-orange-400"
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={startStop}
          className={
            'py-8 rounded-2xl text-3xl font-black uppercase ' +
            (running ? 'bg-red-600 text-white' : 'bg-neon text-black')
          }
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="py-8 rounded-2xl text-3xl font-black uppercase bg-white text-black"
        >
          Reset
        </button>
      </div>
    </section>
  )
}

function Adjuster({ label, value, onChange, disabled, accent }) {
  const step = 5
  return (
    <div className="rounded-2xl bg-black border-2 border-neutral-800 p-3">
      <div className={'text-xl uppercase font-black mb-2 ' + accent}>{label}</div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onChange(Math.max(5, value - step))}
          disabled={disabled}
          className="w-20 h-20 rounded-2xl bg-neutral-900 border-2 border-neutral-700 text-5xl font-black text-white disabled:opacity-40"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <span className="text-5xl sm:text-6xl font-black tabular-nums">{value}</span>
          <span className="text-2xl font-black text-neutral-400"> s</span>
        </div>
        <button
          onClick={() => onChange(Math.min(600, value + step))}
          disabled={disabled}
          className="w-20 h-20 rounded-2xl bg-neutral-900 border-2 border-neutral-700 text-5xl font-black text-white disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}
