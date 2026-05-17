export interface Exercise {
  id: string
  name: string
}

export interface TabataSettings {
  workSec: number
  restSec: number
  rounds: number
}

export interface IntervalSettings {
  workSec: number
  restSec: number
}

export type TabId = 'tabata' | 'running'

export type RunningExerciseKind = 'interval' | 'stopwatch' | 'traffic-light'

export interface RunningExercise extends Exercise {
  kind: RunningExerciseKind
}
