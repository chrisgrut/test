import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NumberStepper } from '@/components/common/NumberStepper'
import { PhaseBadge } from '@/components/common/PhaseBadge'
import { useBeep } from '@/hooks/useBeep'
import { useInterval } from '@/hooks/useInterval'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { cn } from '@/lib/utils'
import type { IntervalSettings } from '@/types/domain'

interface IntervalTimerProps {
  exerciseId: string
  label: string
}

const DEFAULT: IntervalSettings = { workSec: 30, restSec: 60 }

export function IntervalTimer({ exerciseId, label }: IntervalTimerProps) {
  const [allSettings, setAllSettings] = useLocalStorage<Record<string, IntervalSettings>>(
    'running-intervals',
    {},
  )
  const settings = allSettings[exerciseId] ?? DEFAULT

  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'work' | 'rest'>('work')
  const [secondsLeft, setSecondsLeft] = useState(settings.workSec)
  const [round, setRound] = useState(1)
  const beep = useBeep()

  useEffect(() => {
    if (!running) {
      setSecondsLeft(phase === 'work' ? settings.workSec : settings.restSec)
    }
  }, [settings.workSec, settings.restSec, phase, running])

  useEffect(() => {
    setRunning(false)
    setPhase('work')
    setRound(1)
  }, [exerciseId])

  useInterval(
    () => {
      setSecondsLeft((s) => {
        if (s > 1) {
          if (s - 1 <= 3) beep(660, 0.1)
          return s - 1
        }
        if (phase === 'work') {
          beep(440, 0.4)
          setPhase('rest')
          return settings.restSec
        }
        beep(880, 0.4)
        setPhase('work')
        setRound((r) => r + 1)
        return settings.workSec
      })
    },
    running ? 1000 : null,
  )

  function startStop() {
    if (!running) beep(660, 0.05)
    setRunning((r) => !r)
  }

  function reset() {
    setRunning(false)
    setPhase('work')
    setSecondsLeft(settings.workSec)
    setRound(1)
  }

  function updateSetting<K extends keyof IntervalSettings>(key: K, value: IntervalSettings[K]) {
    setAllSettings((prev) => ({ ...prev, [exerciseId]: { ...settings, [key]: value } }))
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="break-words text-3xl font-black">{label}</span>
        <span className="text-xl font-black text-muted-foreground">Runde {round}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <PhaseBadge phase={phase} />
      </div>

      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl py-6 text-primary-foreground',
          phase === 'work' ? 'bg-primary' : 'bg-orange-500',
        )}
      >
        <span className="text-[8rem] font-black leading-none tabular-nums sm:text-[10rem]">
          {secondsLeft}
        </span>
        <span className="text-2xl font-black uppercase">Sekunden</span>
      </div>

      <NumberStepper
        label="Belastung"
        value={settings.workSec}
        onChange={(v) => updateSetting('workSec', v)}
        disabled={running}
      />
      <NumberStepper
        label="Pause"
        value={settings.restSec}
        onChange={(v) => updateSetting('restSec', v)}
        disabled={running}
      />

      <div className="grid grid-cols-2 gap-3">
        <Button variant={running ? 'destructive' : 'default'} size="xl" onClick={startStop}>
          {running ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button variant="secondary" size="xl" onClick={reset}>
          <RotateCcw className="h-7 w-7" />
          Reset
        </Button>
      </div>
    </section>
  )
}
