import { useState } from 'react'
import IntervalTimer from './IntervalTimer.jsx'
import Stopwatch from './Stopwatch.jsx'
import TrafficLightSprint from './TrafficLightSprint.jsx'

const EXERCISES = [
  { id: 'pendel', label: 'Pendellauf', kind: 'interval' },
  { id: 'ampel', label: 'Ampel-Sprint', kind: 'traffic' },
  { id: 'slalom', label: 'Slalom-Jäger', kind: 'interval' },
  { id: 'schatten', label: 'Schattenlauf', kind: 'interval' },
]

export default function RunningMode() {
  const [selected, setSelected] = useState('pendel')
  const current = EXERCISES.find((e) => e.id === selected)

  if (current?.kind === 'traffic') {
    return (
      <div className="flex flex-col">
        <ExerciseSelector
          exercises={EXERCISES}
          selected={selected}
          onSelect={setSelected}
        />
        <TrafficLightSprint />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3 pb-8">
      <ExerciseSelector
        exercises={EXERCISES}
        selected={selected}
        onSelect={setSelected}
        inline
      />
      <IntervalTimer key={current.id} label={current.label} />
      <Stopwatch />
    </div>
  )
}

function ExerciseSelector({ exercises, selected, onSelect, inline = false }) {
  return (
    <div className={inline ? '' : 'p-3'}>
      <div className="grid grid-cols-2 gap-2">
        {exercises.map((e) => {
          const active = e.id === selected
          return (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={
                'py-5 rounded-2xl text-xl sm:text-2xl font-black uppercase ' +
                (active
                  ? 'bg-neon text-black'
                  : 'bg-neutral-900 text-white border-2 border-neutral-700')
              }
            >
              {e.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
