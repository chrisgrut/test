interface ExerciseCalloutProps {
  current: string
  next: string
}

export function ExerciseCallout({ current, next }: ExerciseCalloutProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-primary bg-background p-4">
        <div className="text-base font-black uppercase tracking-wide text-primary">Jetzt</div>
        <div className="hyphens-auto break-words text-balance text-3xl font-black leading-tight sm:text-5xl">
          {current}
        </div>
      </div>
      <div className="rounded-2xl border-2 border-border bg-secondary p-4">
        <div className="text-base font-black uppercase tracking-wide text-orange-400">
          Als Nächstes
        </div>
        <div className="hyphens-auto break-words text-balance text-4xl font-black leading-tight text-white sm:text-6xl">
          {next}
        </div>
      </div>
    </div>
  )
}
