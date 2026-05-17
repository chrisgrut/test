import { cn } from '@/lib/utils'
import type { RunningExercise } from '@/types/domain'

interface ExerciseSelectorProps {
  exercises: RunningExercise[]
  selectedId: string
  onSelect: (id: string) => void
  className?: string
}

export function ExerciseSelector({
  exercises,
  selectedId,
  onSelect,
  className,
}: ExerciseSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {exercises.map((ex) => {
        const active = ex.id === selectedId
        return (
          <button
            key={ex.id}
            type="button"
            onClick={() => onSelect(ex.id)}
            className={cn(
              'rounded-2xl px-3 py-5 text-xl font-black uppercase tracking-tight transition-colors sm:text-2xl',
              active
                ? 'border-2 border-primary bg-primary text-primary-foreground'
                : 'border-2 border-border bg-secondary text-foreground hover:bg-accent',
            )}
          >
            {ex.name || 'Unbenannt'}
          </button>
        )
      })}
    </div>
  )
}
