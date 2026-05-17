import { useEffect, useMemo, useState } from 'react'
import { Pencil, Play, Pause, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumberStepper } from '@/components/common/NumberStepper'
import { PhaseBadge } from '@/components/common/PhaseBadge'
import { ExerciseListEditor } from '@/components/editor/ExerciseListEditor'
import { YouTubePlayer } from './YouTubePlayer'
import { ExerciseCallout } from './ExerciseCallout'
import { useBeep } from '@/hooks/useBeep'
import { useInterval } from '@/hooks/useInterval'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { createId } from '@/lib/ids'
import { cn } from '@/lib/utils'
import type { Exercise, TabataSettings } from '@/types/domain'

const DEFAULT_EXERCISES: Exercise[] = [
  { id: createId(), name: 'Armkreisen' },
  { id: createId(), name: 'Abwehr-Sidesteps' },
  { id: createId(), name: 'Sprungwurf-Kniebeugen' },
  { id: createId(), name: 'Plank mit Schultertippen' },
  { id: createId(), name: 'Tappings (Heiße Kohlen)' },
  { id: createId(), name: 'Ausfallschritt mit Drehung' },
  { id: createId(), name: 'Block-Sprünge' },
  { id: createId(), name: 'Hampelmann-Pass' },
]

const DEFAULT_SETTINGS: TabataSettings = { workSec: 20, restSec: 10, rounds: 1 }
const DEFAULT_VIDEO_ID = 'XIMLoLxmTDw'

export function TabataMode() {
  const [exercises, setExercises] = useLocalStorage<Exercise[]>(
    'tabata-exercises',
    DEFAULT_EXERCISES,
  )
  const [settings, setSettings] = useLocalStorage<TabataSettings>(
    'tabata-settings',
    DEFAULT_SETTINGS,
  )
  const [videoId, setVideoId] = useLocalStorage<string>('tabata-video', DEFAULT_VIDEO_ID)

  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [secondsLeft, setSecondsLeft] = useState(settings.workSec)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)

  const beep = useBeep()

  useEffect(() => {
    if (!running) {
      setSecondsLeft(phase === 'work' ? settings.workSec : settings.restSec)
    }
  }, [settings.workSec, settings.restSec, phase, running])

  useEffect(() => {
    if (exercises.length === 0) {
      setExercises(DEFAULT_EXERCISES)
    }
  }, [exercises, setExercises])

  useEffect(() => {
    if (exerciseIndex >= exercises.length && exercises.length > 0) {
      setExerciseIndex(0)
    }
  }, [exercises.length, exerciseIndex])

  useInterval(
    () => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        if (phase === 'work') {
          beep(440, 0.15)
          setPhase('rest')
          return settings.restSec
        }
        beep(880, 0.2)
        setPhase('work')
        setExerciseIndex((i) => {
          const nextIdx = (i + 1) % Math.max(1, exercises.length)
          if (nextIdx === 0) setRound((r) => r + 1)
          return nextIdx
        })
        return settings.workSec
      })
    },
    running ? 1000 : null,
  )

  const total = exercises.length || 1
  const safeIndex = exerciseIndex % total
  const currentExercise = exercises[safeIndex]?.name ?? '—'
  const nextExercise = exercises[(safeIndex + 1) % total]?.name ?? '—'

  function toggle() {
    if (!running) beep(660, 0.05)
    setRunning((r) => !r)
  }

  function skipExercise() {
    beep(880, 0.15)
    setExerciseIndex((i) => {
      const nextIdx = (i + 1) % total
      if (nextIdx === 0) setRound((r) => r + 1)
      return nextIdx
    })
    setPhase('work')
    setSecondsLeft(settings.workSec)
  }

  function resetAll() {
    setRunning(false)
    setPhase('work')
    setSecondsLeft(settings.workSec)
    setExerciseIndex(0)
    setRound(1)
  }

  const progress = useMemo(() => {
    const total = phase === 'work' ? settings.workSec : settings.restSec
    return Math.max(0, Math.min(100, (secondsLeft / total) * 100))
  }, [phase, secondsLeft, settings.workSec, settings.restSec])

  return (
    <div className="flex flex-col gap-3 p-3 pb-10">
      <YouTubePlayer videoId={videoId} onChange={setVideoId} />

      <section className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <PhaseBadge phase={phase} />
          <div className="flex flex-col items-end">
            <span className="text-sm font-black uppercase text-muted-foreground">
              Übung {safeIndex + 1} / {total}
            </span>
            <span className="text-sm font-black uppercase text-muted-foreground">
              Runde {round}
            </span>
          </div>
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-2xl py-6 text-center text-primary-foreground',
            phase === 'work' ? 'bg-primary' : 'bg-orange-500',
          )}
        >
          <div
            className="absolute inset-y-0 left-0 bg-black/20 transition-[width] duration-1000 ease-linear"
            style={{ width: `${100 - progress}%` }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <span className="text-2xl font-black uppercase tracking-wide">
              {phase === 'work' ? 'Los geht’s' : 'Pause'}
            </span>
            <span className="text-[7rem] font-black leading-none tabular-nums sm:text-[9rem]">
              {secondsLeft}
            </span>
            <span className="text-2xl font-black uppercase">Sekunden</span>
          </div>
        </div>

        <ExerciseCallout current={currentExercise} next={nextExercise} />

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={running ? 'destructive' : 'default'}
            size="xl"
            onClick={toggle}
          >
            {running ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button type="button" variant="secondary" size="xl" onClick={skipExercise}>
            <SkipForward className="h-7 w-7" />
            Nächste
          </Button>
        </div>
        <Button type="button" variant="neutral" size="lg" onClick={resetAll}>
          <RotateCcw className="h-6 w-6" />
          Reset
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <NumberStepper
            label="Belastung"
            value={settings.workSec}
            onChange={(workSec) => setSettings((s) => ({ ...s, workSec }))}
            step={5}
            min={5}
            max={120}
          />
          <NumberStepper
            label="Pause"
            value={settings.restSec}
            onChange={(restSec) => setSettings((s) => ({ ...s, restSec }))}
            step={5}
            min={5}
            max={120}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl font-black uppercase tracking-tight">Übungsplan</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditorOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
        </div>

        <ol className="grid grid-cols-1 gap-2">
          {exercises.map((ex, i) => {
            const isCurrent = i === safeIndex
            return (
              <li
                key={ex.id}
                onClick={() => {
                  setExerciseIndex(i)
                  setPhase('work')
                  setSecondsLeft(settings.workSec)
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-3 text-xl font-black transition-colors',
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-foreground hover:bg-accent',
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-base text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 break-words">{ex.name || 'Unbenannt'}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <ExerciseListEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title="Tabata-Übungen"
        description="Hinzufügen, umbenennen, neu anordnen oder löschen. Änderungen werden gespeichert."
        exercises={exercises}
        onChange={setExercises}
        minLength={1}
      />
    </div>
  )
}
