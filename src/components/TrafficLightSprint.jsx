import { useEffect, useRef, useState } from 'react'
import { useBeep } from '../hooks/useBeep.js'

const COLORS = [
  { id: 'red', label: 'ROT', bg: 'bg-red-600', text: 'text-white' },
  { id: 'yellow', label: 'GELB', bg: 'bg-yellow-400', text: 'text-black' },
  { id: 'green', label: 'GRÜN', bg: 'bg-green-500', text: 'text-black' },
]

function pickNext(current) {
  const others = COLORS.filter((c) => c.id !== current?.id)
  return others[Math.floor(Math.random() * others.length)]
}

function randomDelayMs() {
  return 3000 + Math.random() * 3000 // 3–6s
}

export default function TrafficLightSprint() {
  const [running, setRunning] = useState(false)
  const [color, setColor] = useState(null)
  const timeoutRef = useRef(null)
  const beep = useBeep()

  useEffect(() => {
    if (!running) {
      clearTimeout(timeoutRef.current)
      return
    }
    function schedule(prev) {
      const next = pickNext(prev)
      setColor(next)
      beep(next.id === 'red' ? 300 : next.id === 'yellow' ? 600 : 900, 0.15)
      timeoutRef.current = setTimeout(() => schedule(next), randomDelayMs())
    }
    schedule(color)
    return () => clearTimeout(timeoutRef.current)
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  function startStop() {
    if (running) {
      setRunning(false)
    } else {
      setRunning(true)
    }
  }

  function reset() {
    setRunning(false)
    setColor(null)
  }

  const bg = color ? color.bg : 'bg-black'
  const text = color ? color.text : 'text-white'
  const label = color ? color.label : 'AMPEL-SPRINT'

  return (
    <div className={'min-h-[80vh] flex flex-col p-3 gap-3 transition-colors duration-150 ' + bg}>
      <div className={'flex-1 flex flex-col items-center justify-center text-center ' + text}>
        <span className="text-3xl sm:text-4xl uppercase font-black tracking-tight">
          Kommando
        </span>
        <span className="text-[7rem] sm:text-[12rem] leading-none font-black tracking-tight">
          {label}
        </span>
        {!color && (
          <span className="text-xl sm:text-2xl font-black mt-4 text-neutral-400">
            Drücke Start, dann die Farbe laut ansagen
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={startStop}
          className={
            'py-8 rounded-2xl text-3xl font-black uppercase border-4 ' +
            (running
              ? 'bg-black text-white border-white'
              : 'bg-neon text-black border-black')
          }
        >
          {running ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="py-8 rounded-2xl text-3xl font-black uppercase bg-white text-black border-4 border-black"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
