export type RAFStop = () => void

export function startRAFWithDt(callback: (dt: number) => void): RAFStop {
  let rafId = 0
  let last = 0
  const loop = (ts: number) => {
    const dt = last === 0 ? 0 : ts - last
    last = ts
    callback(dt)
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(rafId)
}

// local storage
export function setLocalStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}
export function delLocalStorage(key: string) {
  localStorage.removeItem(key)
}

// sound
export function playAudio(file: string) {
  const a = new Audio(file)
  a.play()
}
