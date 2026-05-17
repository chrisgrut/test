import { useState } from 'react'
import TabataMode from './components/TabataMode.jsx'
import RunningMode from './components/RunningMode.jsx'

const TABS = [
  { id: 'tabata', label: 'Tabata Warm-up' },
  { id: 'running', label: 'Feldweg Lauftraining' },
]

export default function App() {
  const [tab, setTab] = useState('tabata')

  return (
    <div className="min-h-full flex flex-col bg-black text-white">
      <nav className="sticky top-0 z-20 grid grid-cols-2 gap-2 p-2 bg-black border-b-2 border-neon">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'py-5 rounded-xl text-xl sm:text-2xl font-black uppercase tracking-tight transition-colors ' +
                (active
                  ? 'bg-neon text-black'
                  : 'bg-neutral-900 text-white border-2 border-neutral-700')
              }
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      <main className="flex-1">
        {tab === 'tabata' ? <TabataMode /> : <RunningMode />}
      </main>
    </div>
  )
}
