import { useCallback, useRef } from 'react'

type BeepFn = (frequencyHz?: number, durationSec?: number) => void

export function useBeep(): BeepFn {
  const ctxRef = useRef<AudioContext | null>(null)

  return useCallback<BeepFn>((frequencyHz = 880, durationSec = 0.2) => {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!ctxRef.current) {
        ctxRef.current = new Ctor()
      }
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') {
        void ctx.resume()
      }
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = frequencyHz
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01 + durationSec)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01 + durationSec + 0.02)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.01 + durationSec + 0.05)
    } catch {
      // audio failures are non-fatal — silently swallow
    }
  }, [])
}
