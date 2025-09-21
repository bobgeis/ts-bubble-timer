let ctx: AudioContext | null = null
let unlocked = false
// Per-URL caches
const bufferMap = new Map<string, AudioBuffer>()
const loadingMap = new Map<string, Promise<AudioBuffer>>()
const pendingMap = new Map<string, number>()

type Window = globalThis.Window &
  typeof globalThis & { webkitAudioContext: AudioContext }

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as Window).webkitAudioContext)()
  }
  return ctx!
}

function loadBuffer(url: string): Promise<AudioBuffer> {
  const existing = bufferMap.get(url)
  if (existing) return Promise.resolve(existing)
  const inflight = loadingMap.get(url)
  if (inflight) return inflight
  const p = (async () => {
    const res = await fetch(url)
    const arr = await res.arrayBuffer()
    const audioCtx = getCtx()
    const buf = await audioCtx.decodeAudioData(arr)
    bufferMap.set(url, buf)
    loadingMap.delete(url)
    return buf
  })()
  loadingMap.set(url, p)
  return p
}

export async function initSound(url: string) {
  await loadBuffer(url)
}

export async function unlockAudio() {
  const audioCtx = getCtx()
  if (audioCtx.state !== 'running') {
    await audioCtx.resume()
  }
  unlocked = true
}

function makeSource(url: string): AudioBufferSourceNode | null {
  if (!ctx) return null
  const buf = bufferMap.get(url)
  if (!buf) return null
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  return src
}

async function playNow(url: string): Promise<boolean> {
  try {
    const audioCtx = getCtx()
    if (audioCtx.state !== 'running') {
      await audioCtx.resume()
    }
    if (!bufferMap.get(url)) return false
    const src = makeSource(url)
    if (!src) return false
    src.start()
    return true
  } catch {
    return false
  }
}

function drainPending() {
  if (pendingMap.size === 0) return
  for (const [url, count] of pendingMap.entries()) {
    if (!count || count <= 0) continue
    pendingMap.set(url, 0)
    // play sequentially with slight spacing per URL
    let i = 0
    const tick = async () => {
      if (i >= count) return
      const ok = await playNow(url)
      i++
      setTimeout(tick, ok ? 180 : 300)
    }
    tick()
  }
}

export async function playChime(url?: string) {
  if (!url) return
  await initSound(url)
  if (!unlocked) {
    const prev = pendingMap.get(url) ?? 0
    pendingMap.set(url, prev + 1)
    return
  }
  // Try to play immediately even if hidden; some browsers will allow it
  const okImmediate = await playNow(url)
  if (!okImmediate) {
    const prev = pendingMap.get(url) ?? 0
    pendingMap.set(url, prev + 1)
  }
}

function handleVisibility() {
  if (!document.hidden) {
    drainPending()
  }
}

document.addEventListener('visibilitychange', handleVisibility)
window.addEventListener('focus', handleVisibility)
