import { cn } from '@/lib/utils'

interface PhaseBadgeProps {
  phase: 'work' | 'rest'
  className?: string
}

const LABELS: Record<PhaseBadgeProps['phase'], string> = {
  work: 'BELASTUNG',
  rest: 'PAUSE',
}

export function PhaseBadge({ phase, className }: PhaseBadgeProps) {
  const tone =
    phase === 'work' ? 'text-neon' : 'text-orange-400'
  return (
    <span className={cn('text-3xl font-black uppercase tracking-wide', tone, className)}>
      {LABELS[phase]}
    </span>
  )
}
