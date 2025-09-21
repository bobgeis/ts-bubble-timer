import { useSnapshot } from 'valtio'
import { store } from '../state/store'

export default function HelpOverlay() {
  const snap = useSnapshot(store)
  if (!snap.helpVisible) return null
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        color: '#222',
      }}
      aria-hidden={!snap.helpVisible}
    >
      <div
        style={{
          background: '#FFF',
          padding: '16px 18px',
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          maxWidth: 370,
          width: '90%',
          lineHeight: 1.4,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          textAlign: 'left',
        }}
      >
        <h2 style={{ margin: '0 0 12px 0', fontSize: 20, textAlign: 'center' }}>
          Controls
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            fontSize: 16,
            listStyleType: 'disc',
            textAlign: 'left',
          }}
        >
          <li>Click and drag to create a bubble</li>
          <li>Click a bubble to pause or resume it</li>
          <li>Shift + click a bubble to delete it</li>
          <li>Alt + click and drag a bubble to move it</li>
          <li>Press Space to pause or resume all bubbles</li>
          <li>Press Enter to save current bubbles</li>
        </ul>
        <div
          style={{
            marginTop: 12,
            color: '#666',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Release Esc to close this help
        </div>
      </div>
    </div>
  )
}
