interface ExerciseCalloutProps {
  current: string
  next: string
}

export function ExerciseCallout({ current, next }: ExerciseCalloutProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-primary bg-background p-4">
        <div className="text-base font-black uppercase tracking-wide text-primary">Jetzt</div>
        <div className="break-words text-5xl font-black leading-tight sm:text-6xl">{current}</div>
      </div>
      <div className="rounded-2xl border-2 border-border bg-secondary p-4">
        <div className="text-base font-black uppercase tracking-wide text-orange-400">
          Als Nächstes
        </div>
        <div className="break-words text-6xl font-black leading-tight text-white sm:text-7xl">
          {next}
        </div>
      </div>
    </div>
  )
}
