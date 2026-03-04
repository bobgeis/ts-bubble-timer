import { useSnapshot } from 'valtio'
import { store } from '../state/store'

export default function CopyIndicator() {
  const snap = useSnapshot(store)
  if (!snap.copyFlashVisible) return null

  return (
    <div className="copy-indicator" aria-live="polite" aria-label="Timer copied">
      📋
    </div>
  )
}
