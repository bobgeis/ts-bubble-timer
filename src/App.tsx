import { useEffect } from 'react'
import './App.css'
import SvgBoard from './components/SvgBoard'
import HelpOverlay from './components/HelpOverlay'
import MutedIndicator from './components/MutedIndicator'
import CopyIndicator from './components/CopyIndicator'
import {
  audioFile,
  copyHoveredTimer,
  pasteCopiedTimer,
  pointerDown,
  pointerMove,
  pointerLeave,
  pointerUp,
  initFromLocalStorage,
  toggleMode,
  saveToLocalStorage,
  tick,
  setShiftActive,
  setHelpVisible,
  setCursorPosition,
  toggleMuted,
} from './state/store'
import { startRAFWithDt } from './lib/browser'
import { initSound, unlockAudio } from './lib/sound'

function App() {
  useEffect(() => {
    initFromLocalStorage()
    // key handlers
    const onKeyDown = (e: KeyboardEvent) => {
      unlockOnFirstInteraction()
      if (e.key === 'Shift') setShiftActive(true)
      if (e.key === 'Escape') setHelpVisible(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftActive(false)
      if (e.key === ' ') {
        e.preventDefault()
        toggleMode()
      } else if (e.key === 'Enter') {
        saveToLocalStorage()
      } else if (e.key === 'Escape') {
        setHelpVisible(false)
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMuted()
      } else if (e.key === 'c' || e.key === 'C') {
        copyHoveredTimer()
      } else if (e.key === 'v' || e.key === 'V') {
        pasteCopiedTimer()
      }
    }

    let unlocked = false
    const unlockOnFirstInteraction = () => {
      if (unlocked) return
      unlocked = true
      unlockAudio()
      initSound(audioFile)
    }

    // add listeners
    document.addEventListener('pointerdown', unlockOnFirstInteraction, {
      once: true,
    })
    document.addEventListener('touchstart', unlockOnFirstInteraction, {
      once: true,
    })
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    // raf loop
    const stop = startRAFWithDt((dt) => tick(dt))

    // rm listeners on cleanup
    return () => {
      document.removeEventListener('pointerdown', unlockOnFirstInteraction)
      document.removeEventListener('touchstart', unlockOnFirstInteraction)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      stop()
    }
  }, [])

  return (
    <>
      <SvgBoard
        onPointerDown={(e) => {
          setCursorPosition({ x: e.clientX, y: e.clientY })
          pointerDown({ x: e.clientX, y: e.clientY, altKey: e.altKey })
        }}
        onPointerMove={(e) => {
          setCursorPosition({ x: e.clientX, y: e.clientY })
          pointerMove({ x: e.clientX, y: e.clientY, altKey: e.altKey })
        }}
        onPointerUp={(e) =>
          pointerUp({
            x: e.clientX,
            y: e.clientY,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          })
        }
        onPointerLeave={() => {
          setCursorPosition(null)
          pointerLeave()
        }}
      />
      <HelpOverlay />
      <MutedIndicator />
      <CopyIndicator />
    </>
  )
}

export default App
