import { useSnapshot } from 'valtio'
import { store } from '../state/store'

export default function MutedIndicator() {
  const snap = useSnapshot(store)
  if (!snap.muted) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        fontSize: 16,
        opacity: 0.6,
        pointerEvents: 'none',
        userSelect: 'none',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
      aria-label="Sound muted"
    >
      🔇
    </div>
  )
}
