import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NumberStepperProps {
  label: string
  value: number
  onChange: (next: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  className?: string
  disabled?: boolean
}

export function NumberStepper({
  label,
  value,
  onChange,
  step = 5,
  min = 5,
  max = 600,
  unit = 's',
  className,
  disabled,
}: NumberStepperProps) {
  function clamp(v: number) {
    return Math.max(min, Math.min(max, v))
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-3',
        className,
      )}
    >
      <div className="text-sm font-black uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-stretch gap-2">
        <Button
          type="button"
          variant="neutral"
          size="icon"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          aria-label={`${label} verringern`}
        >
          <Minus className="h-7 w-7" />
        </Button>
        <div className="flex flex-1 items-center justify-center rounded-xl bg-background text-4xl font-black tabular-nums">
          {value}
          <span className="ml-1 text-xl text-muted-foreground">{unit}</span>
        </div>
        <Button
          type="button"
          variant="neutral"
          size="icon"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          aria-label={`${label} erhöhen`}
        >
          <Plus className="h-7 w-7" />
        </Button>
      </div>
    </div>
  )
}
