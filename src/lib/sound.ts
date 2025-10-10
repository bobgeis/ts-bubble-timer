let ctx: AudioContext | null = null
const bufferMap = new Map<string, AudioBuffer>()
const loadingMap = new Map<string, Promise<AudioBuffer>>()

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

export async function playChime(url: string, muted = false) {
  if (muted) return
  await initSound(url)
  // After the app's first user interaction, the audio context is resumed.
  // Simply attempt to play now; if it fails, we silently ignore.
  await playNow(url)
}

