import { useEffect, useRef, useState } from 'react'
import { useBeep } from '../hooks/useBeep.js'

const EXERCISES = [
  'Armkreisen',
  'Abwehr-Sidesteps',
  'Sprungwurf-Kniebeugen',
  'Plank mit Schultertippen',
  'Tappings (Heiße Kohlen)',
  'Ausfallschritt mit Drehung',
  'Block-Sprünge',
  'Hampelmann-Pass',
]

const WORK = 20
const REST = 10
const DEFAULT_VIDEO = 'https://www.youtube.com/embed/fX1qJHfEkJ4'

function parseYouTubeId(input) {
  if (!input) return null
  const trimmed = input.trim()
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/watch\?v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
  ]
  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m) return m[1]
  }
  if (/^[\w-]{6,}$/.test(trimmed)) return trimmed
  return null
}

export default function TabataMode() {
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO)
  const [videoInput, setVideoInput] = useState('')
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('work') // 'work' | 'rest'
  const [secondsLeft, setSecondsLeft] = useState(WORK)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const intervalRef = useRef(null)
  const beep = useBeep()

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // phase transition
        if (phase === 'work') {
          beep(440, 0.15)
          setPhase('rest')
          return REST
        } else {
          beep(880, 0.2)
          setPhase('work')
          setExerciseIndex((i) => (i + 1) % EXERCISES.length)
          return WORK
        }
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, phase, beep])

  const currentExercise = EXERCISES[exerciseIndex]
  const nextExercise = EXERCISES[(exerciseIndex + 1) % EXERCISES.length]

  function nextManually() {
    beep(880, 0.15)
    setExerciseIndex((i) => (i + 1) % EXERCISES.length)
    setPhase('work')
    setSecondsLeft(WORK)
  }

  function resetAll() {
    setRunning(false)
    setPhase('work')
    setSecondsLeft(WORK)
    setExerciseIndex(0)
  }

  function applyVideo() {
    const id = parseYouTubeId(videoInput)
    if (id) {
      setVideoUrl(`https://www.youtube.com/embed/${id}`)
    }
  }

  const phaseColor = phase === 'work' ? 'text-neon' : 'text-orange-400'
  const phaseLabel = phase === 'work' ? 'BELASTUNG' : 'PAUSE'

  return (
    <div className="flex flex-col gap-3 p-3 pb-8">
      {/* YouTube */}
      <section className="rounded-2xl overflow-hidden border-2 border-neutral-800">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={videoUrl + '?rel=0&modestbranding=1'}
            title="Tabata Musik"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="flex gap-2 p-2 bg-neutral-900">
          <input
            type="text"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="YouTube-URL oder ID einfügen"
            className="flex-1 px-3 py-3 rounded-lg bg-black border-2 border-neutral-700 text-white placeholder-neutral-500 text-base"
          />
          <button
            onClick={applyVideo}
            className="px-4 py-3 bg-neon text-black font-black rounded-lg uppercase"
          >
            Laden
          </button>
        </div>
      </section>

      {/* Coach Dashboard */}
      <section className="rounded-2xl bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className={'text-3xl font-black ' + phaseColor}>{phaseLabel}</span>
          <span className="text-xl text-neutral-400 font-black">
            Übung {exerciseIndex + 1} / {EXERCISES.length}
          </span>
        </div>

        {/* Timer */}
        <div
          className={
            'rounded-2xl flex flex-col items-center justify-center py-6 ' +
            (phase === 'work' ? 'bg-neon text-black' : 'bg-orange-500 text-black')
          }
        >
          <span className="text-2xl uppercase font-black tracking-wide">
            {phase === 'work' ? 'Los geht\'s' : 'Pause'}
          </span>
          <span className="text-[7rem] sm:text-[9rem] leading-none font-black tabular-nums">
            {secondsLeft}
          </span>
          <span className="text-2xl font-black">SEKUNDEN</span>
        </div>

        {/* Aktuelle Übung */}
        <div className="rounded-2xl bg-black border-2 border-neon p-4">
          <div className="text-xl uppercase text-neon font-black">Jetzt</div>
          <div className="text-5xl sm:text-6xl font-black leading-tight break-words">
            {currentExercise}
          </div>
        </div>

        {/* Nächste Übung – extra groß */}
        <div className="rounded-2xl bg-neutral-900 border-2 border-neutral-700 p-4">
          <div className="text-xl uppercase text-orange-400 font-black">Als Nächstes</div>
          <div className="text-6xl sm:text-7xl font-black leading-tight break-words text-white">
            {nextExercise}
          </div>
        </div>

        {/* Steuerung */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className={
              'py-8 rounded-2xl text-3xl font-black uppercase ' +
              (running ? 'bg-red-600 text-white' : 'bg-neon text-black')
            }
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={nextManually}
            className="py-8 rounded-2xl text-3xl font-black uppercase bg-white text-black"
          >
            Nächste
          </button>
        </div>
        <button
          onClick={resetAll}
          className="py-5 rounded-2xl text-xl font-black uppercase bg-neutral-800 text-white border-2 border-neutral-700"
        >
          Reset
        </button>

        {/* Übungsliste */}
        <ol className="grid grid-cols-1 gap-2 mt-2">
          {EXERCISES.map((ex, i) => {
            const isCurrent = i === exerciseIndex
            return (
              <li
                key={ex}
                onClick={() => {
                  setExerciseIndex(i)
                  setPhase('work')
                  setSecondsLeft(WORK)
                }}
                className={
                  'px-4 py-3 rounded-xl text-xl font-black flex items-center gap-3 ' +
                  (isCurrent
                    ? 'bg-neon text-black'
                    : 'bg-neutral-900 text-white border border-neutral-800')
                }
              >
                <span className="w-9 h-9 rounded-full bg-black text-neon flex items-center justify-center text-base">
                  {i + 1}
                </span>
                <span className="flex-1">{ex}</span>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
