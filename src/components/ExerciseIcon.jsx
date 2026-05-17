// Stick-figure illustrations for each Tabata exercise.
// Designed to read clearly at a glance, even from a distance.

const COMMON = {
  viewBox: '0 0 100 100',
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Armkreisen({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="50" cy="20" r="7" />
      <line x1="50" y1="27" x2="50" y2="62" />
      <line x1="50" y1="62" x2="40" y2="90" />
      <line x1="50" y1="62" x2="60" y2="90" />
      <line x1="50" y1="38" x2="22" y2="48" />
      <line x1="50" y1="38" x2="78" y2="28" />
      <path d="M 14 36 A 18 18 0 0 1 30 60" strokeDasharray="3 3" />
      <path d="M 86 16 A 18 18 0 0 0 70 40" strokeDasharray="3 3" />
      <path d="M 28 60 l -4 -2 l 6 -4" />
      <path d="M 72 40 l 4 2 l -6 4" />
    </svg>
  )
}

function Sidesteps({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="50" cy="20" r="7" />
      <line x1="50" y1="27" x2="50" y2="50" />
      <line x1="50" y1="38" x2="35" y2="52" />
      <line x1="50" y1="38" x2="65" y2="52" />
      <line x1="50" y1="50" x2="30" y2="78" />
      <line x1="50" y1="50" x2="70" y2="78" />
      <line x1="30" y1="78" x2="22" y2="80" />
      <line x1="70" y1="78" x2="78" y2="80" />
      <line x1="14" y1="88" x2="4" y2="88" />
      <polyline points="10,84 4,88 10,92" />
      <line x1="86" y1="88" x2="96" y2="88" />
      <polyline points="90,84 96,88 90,92" />
    </svg>
  )
}

function SquatJump({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="50" cy="18" r="7" />
      <line x1="50" y1="25" x2="50" y2="50" />
      <line x1="50" y1="34" x2="32" y2="22" />
      <line x1="50" y1="34" x2="68" y2="22" />
      <circle cx="50" cy="10" r="5" />
      <line x1="50" y1="50" x2="32" y2="68" />
      <line x1="50" y1="50" x2="68" y2="68" />
      <line x1="32" y1="68" x2="26" y2="88" />
      <line x1="68" y1="68" x2="74" y2="88" />
      <polyline points="46,4 50,0 54,4" />
      <line x1="50" y1="0" x2="50" y2="6" />
    </svg>
  )
}

function PlankTap({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="18" cy="50" r="7" />
      <line x1="25" y1="50" x2="80" y2="50" />
      <line x1="80" y1="50" x2="86" y2="74" />
      <line x1="60" y1="50" x2="56" y2="74" />
      <line x1="30" y1="50" x2="32" y2="40" />
      <line x1="32" y1="40" x2="42" y2="44" />
      <path d="M 42 44 q 2 -6 -2 -8" strokeDasharray="3 2" />
    </svg>
  )
}

function Tappings({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="50" cy="18" r="7" />
      <line x1="50" y1="25" x2="50" y2="56" />
      <line x1="50" y1="34" x2="34" y2="44" />
      <line x1="50" y1="34" x2="66" y2="26" />
      <line x1="50" y1="56" x2="38" y2="72" />
      <line x1="50" y1="56" x2="62" y2="68" />
      <line x1="62" y1="68" x2="58" y2="80" />
      <line x1="20" y1="92" x2="30" y2="92" />
      <line x1="40" y1="92" x2="50" y2="92" />
      <line x1="60" y1="92" x2="70" y2="92" />
      <line x1="80" y1="92" x2="90" y2="92" />
    </svg>
  )
}

function LungeRotation({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="40" cy="22" r="7" />
      <line x1="40" y1="29" x2="44" y2="56" />
      <line x1="44" y1="42" x2="62" y2="36" />
      <line x1="44" y1="42" x2="28" y2="50" />
      <line x1="44" y1="56" x2="68" y2="84" />
      <line x1="44" y1="56" x2="26" y2="88" />
      <line x1="62" y1="36" x2="74" y2="40" />
      <line x1="28" y1="50" x2="16" y2="46" />
      <path d="M 70 18 A 14 14 0 1 1 56 14" strokeDasharray="3 3" />
      <polyline points="58,10 56,14 60,16" />
    </svg>
  )
}

function BlockJump({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="50" cy="30" r="7" />
      <line x1="50" y1="37" x2="50" y2="62" />
      <line x1="50" y1="40" x2="34" y2="20" />
      <line x1="50" y1="40" x2="66" y2="20" />
      <line x1="34" y1="20" x2="30" y2="10" />
      <line x1="66" y1="20" x2="70" y2="10" />
      <line x1="50" y1="62" x2="42" y2="82" />
      <line x1="50" y1="62" x2="58" y2="82" />
      <polyline points="46,92 50,86 54,92" />
      <line x1="14" y1="50" x2="22" y2="50" />
      <line x1="78" y1="50" x2="86" y2="50" />
      <line x1="20" y1="38" x2="26" y2="42" />
      <line x1="80" y1="38" x2="74" y2="42" />
    </svg>
  )
}

function JumpingJack({ stroke }) {
  return (
    <svg {...COMMON} stroke={stroke} strokeWidth="3.5">
      <circle cx="50" cy="20" r="7" />
      <line x1="50" y1="27" x2="50" y2="58" />
      <line x1="50" y1="36" x2="22" y2="20" />
      <line x1="50" y1="36" x2="78" y2="20" />
      <line x1="50" y1="58" x2="32" y2="88" />
      <line x1="50" y1="58" x2="68" y2="88" />
      <circle cx="50" cy="58" r="4" />
      <polyline points="40,52 46,52 46,46" strokeDasharray="2 2" />
      <polyline points="60,52 54,52 54,46" strokeDasharray="2 2" />
    </svg>
  )
}

const ICONS = {
  armkreisen: Armkreisen,
  sidesteps: Sidesteps,
  squatjump: SquatJump,
  plank: PlankTap,
  tappings: Tappings,
  lunge: LungeRotation,
  blockjump: BlockJump,
  jack: JumpingJack,
}

export default function ExerciseIcon({ id, stroke = 'currentColor', className = '' }) {
  const Cmp = ICONS[id]
  if (!Cmp) return null
  return (
    <span className={'inline-block ' + className} aria-hidden="true">
      <Cmp stroke={stroke} />
    </span>
  )
}
