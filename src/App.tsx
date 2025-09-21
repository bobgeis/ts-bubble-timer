import { useEffect } from 'react'
import './App.css'
import SvgBoard from './components/SvgBoard'
import HelpOverlay from './components/HelpOverlay'
import {
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
} from './state/store'
import { startRAFWithDt } from './lib/browser'
import { initSound, unlockAudio } from './lib/sound'
import { audioFile } from './state/store'

function App() {
  useEffect(() => {
    initFromLocalStorage()
    initSound(audioFile)
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
      }
    }

    let unlocked = false
    const unlockOnFirstInteraction = () => {
      if (unlocked) return
      unlocked = true
      unlockAudio()
      // remove these listeners right away
      document.removeEventListener('pointerdown', unlockOnFirstInteraction)
      document.removeEventListener('touchstart', unlockOnFirstInteraction)
    }
    document.addEventListener('pointerdown', unlockOnFirstInteraction, { once: true })
    document.addEventListener('touchstart', unlockOnFirstInteraction, { once: true })
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    // raf loop
    const stop = startRAFWithDt((dt) => tick(dt))
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
        onPointerDown={(e) => pointerDown({ x: e.clientX, y: e.clientY })}
        onPointerMove={(e) => pointerMove({ x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => pointerUp({ x: e.clientX, y: e.clientY, shiftKey: e.shiftKey })}
        onPointerLeave={() => pointerLeave()}
      />
      <HelpOverlay />
    </>
  )
}

export default App
