import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExerciseListEditor } from '@/components/editor/ExerciseListEditor'
import { ExerciseSelector } from './ExerciseSelector'
import { IntervalTimer } from './IntervalTimer'
import { Stopwatch } from './Stopwatch'
import { TrafficLightSprint } from './TrafficLightSprint'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { Exercise, RunningExercise } from '@/types/domain'

const DEFAULT_EXERCISES: RunningExercise[] = [
  { id: 'pendel', name: 'Pendellauf', kind: 'interval' },
  { id: 'ampel', name: 'Ampel-Sprint', kind: 'traffic-light' },
  { id: 'slalom', name: 'Slalom-Jäger', kind: 'interval' },
  { id: 'schatten', name: 'Schattenlauf', kind: 'interval' },
]

export function RunningMode() {
  const [exercises, setExercises] = useLocalStorage<RunningExercise[]>(
    'running-exercises',
    DEFAULT_EXERCISES,
  )
  const [selectedId, setSelectedId] = useLocalStorage<string>(
    'running-selected',
    DEFAULT_EXERCISES[0]!.id,
  )
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    if (exercises.length === 0) {
      setExercises(DEFAULT_EXERCISES)
      return
    }
    if (!exercises.some((e) => e.id === selectedId)) {
      setSelectedId(exercises[0]!.id)
    }
  }, [exercises, selectedId, setExercises, setSelectedId])

  const current = exercises.find((e) => e.id === selectedId) ?? exercises[0]

  function handleListChange(next: Exercise[]) {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    const merged: RunningExercise[] = next.map((e) => {
      const existing = byId.get(e.id)
      return existing ? { ...existing, name: e.name } : { id: e.id, name: e.name, kind: 'interval' }
    })
    setExercises(merged)
  }

  return (
    <div className="flex flex-col gap-3 p-3 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-tight">Übung wählen</h2>
          <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
        <ExerciseSelector
          exercises={exercises}
          selectedId={current?.id ?? ''}
          onSelect={setSelectedId}
        />
      </div>

      {current?.kind === 'traffic-light' ? (
        <TrafficLightSprint />
      ) : current ? (
        <>
          <IntervalTimer exerciseId={current.id} label={current.name || 'Unbenannt'} />
          <Stopwatch />
        </>
      ) : null}

      <ExerciseListEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title="Lauf-Übungen"
        description="Neue Übungen sind standardmäßig Intervall-Läufe. Ampel-Sprint behält seine Sonderansicht."
        exercises={exercises.map(({ id, name }) => ({ id, name }))}
        onChange={handleListChange}
        minLength={1}
      />
    </div>
  )
}
