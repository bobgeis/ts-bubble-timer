import { proxy } from 'valtio'
import {
  distance,
  type Point,
  angleFromUpCwBetween,
  durationMultiplierFromAngle,
  normalizePi,
} from '../lib/geometry'
import {
  getLocalStorage,
  setLocalStorage,
  delLocalStorage,
} from '../lib/browser'
import { playChime } from '../lib/sound'

export type Shape = {
  x: number
  y: number
  r: number
  state: 'on' | 'off'
  t: number // remaining time (ms), starts at +tM, ticks down to -tM
  tM: number // total duration (ms) = radiusToTime(r)
}

export type Mode = 'run' | 'pause'

export type MouseState = {
  start?: Point
  stop?: Point
  angle?: number // [-pi, pi] clockwise from up
  mult?: number // duration multiplier
  lastAngle?: number // previous frame absolute angle [-pi, pi]
  angleAcc?: number // accumulated angle (unwrapped)
  movingIndex?: number // Moving existing shape (Alt-click and drag)
  moveOffset?: { dx: number; dy: number }
}

export type Store = {
  mode: Mode
  shapes: Shape[]
  mouse?: MouseState | null
  hoverIndex: number | null
  shiftActive: boolean
  helpVisible: boolean
}

export const audioFile = `${import.meta.env.BASE_URL}audio/bubbles.mp3`
export const minRadius = 5

export const radiusToTime = (r: number) => 1000 * r

export const makeCircle = ({
  x,
  y,
  r,
}: {
  x: number
  y: number
  r: number
}): Shape => {
  const t = radiusToTime(r)
  return { x, y, r, state: 'on', t, tM: t }
}

export const makeCircleFromPoints = (start: Point, stop: Point): Shape => {
  const r = distance(start, stop)
  return makeCircle({ x: start.x, y: start.y, r })
}

export const store = proxy<Store>({
  mode: 'run',
  shapes: [],
  mouse: null,
  hoverIndex: null,
  shiftActive: false,
  helpVisible: false,
})

const LS_KEY = 'teatime'

export function initFromLocalStorage() {
  const saved = getLocalStorage<Shape[]>(LS_KEY, [])
  if (Array.isArray(saved)) {
    store.shapes = saved
    if (saved.length > 0) {
      // When restoring a session, start in paused mode to avoid immediate ticking
      store.mode = 'pause'
    }
  }
}

export function saveToLocalStorage() {
  setLocalStorage(LS_KEY, store.shapes)
}

export function clearLocalStorage() {
  delLocalStorage(LS_KEY)
}

export function toggleMode() {
  store.mode = store.mode === 'run' ? 'pause' : 'run'
}

export function setHoveredIndex(i: number | null) {
  store.hoverIndex = i
}

export function setShiftActive(active: boolean) {
  store.shiftActive = active
}

export function setHelpVisible(visible: boolean) {
  store.helpVisible = visible
}

export function pointerDown(p: Point & { altKey?: boolean }) {
  // If Alt is held and we're on an existing shape, begin moving that shape
  if (p.altKey) {
    let idx = -1
    for (let i = store.shapes.length - 1; i >= 0; i--) {
      if (withinShape(store.shapes[i], p)) {
        idx = i
        break
      }
    }
    if (idx !== -1) {
      const s = store.shapes[idx]
      // Move the selected shape to the end so it renders on top while dragging
      if (idx !== store.shapes.length - 1) {
        const shapes = store.shapes.slice()
        shapes.splice(idx, 1)
        shapes.push(s)
        store.shapes = shapes
        idx = store.shapes.length - 1
      }
      store.mouse = {
        movingIndex: idx,
        moveOffset: { dx: p.x - s.x, dy: p.y - s.y },
      }
      return
    }
  }
  // Othwerwise, begin creating a new shape
  store.mouse = {
    start: { ...p },
    angle: 0,
    mult: 1,
    lastAngle: undefined,
    angleAcc: 0,
  }
}

export function pointerMove(p: Point & { altKey?: boolean }) {
  // If moving an existing shape, update its position
  const movingIdx = store.mouse?.movingIndex
  if (typeof movingIdx === 'number' && movingIdx >= 0) {
    const off = store.mouse?.moveOffset ?? { dx: 0, dy: 0 }
    const nx = p.x - off.dx
    const ny = p.y - off.dy
    const shapes = store.shapes.slice()
    const s = shapes[movingIdx]
    if (s) shapes[movingIdx] = { ...s, x: nx, y: ny }
    store.shapes = shapes
    return
  }
  if (!store.mouse?.start) return
  const start = store.mouse.start
  const angle = angleFromUpCwBetween(start, p)
  const last = store.mouse.lastAngle
  let angleAcc = store.mouse.angleAcc ?? 0
  if (typeof last === 'number') {
    const delta = normalizePi(angle - last)
    angleAcc += delta
  } else {
    angleAcc = 0
  }
  // Clamp effect to +/- 2 full turns so multiplier stops changing beyond full green/red
  const cap = 4 * Math.PI // 2 turns = 4π
  const angleAccClamped = Math.max(-cap, Math.min(cap, angleAcc))
  const mult = durationMultiplierFromAngle(-angleAccClamped, 2)
  store.mouse = {
    ...store.mouse,
    stop: { ...p },
    angle,
    mult,
    lastAngle: angle,
    angleAcc,
  }
}

export function pointerLeave() {
  store.mouse = null
}

export function pointerUp(
  p: Point & { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean },
) {
  // If moving a shape, end move and exit
  if (typeof store.mouse?.movingIndex === 'number') {
    store.mouse = null
    return
  }
  const start = store.mouse?.start
  if (!start) return
  const r = distance(start, p)
  if (r > minRadius) {
    // create new shape
    const shape = makeCircleFromPoints(start, p)
    const mult = store.mouse?.mult ?? 1
    const tM = shape.tM * mult
    const t = tM
    // apply adjusted duration without changing radius
    store.shapes = [...store.shapes, { ...shape, tM, t }]
  } else {
    maybeClickShape(p)
  }
  store.mouse = null
}

function withinShape(shape: Shape, p: Point) {
  return shape.r > distance({ x: shape.x, y: shape.y }, p)
}

function maybeClickShape(p: Point & { shiftKey?: boolean }) {
  // Choose the topmost (newest) shape under the pointer by searching from the end
  let idx = -1
  for (let i = store.shapes.length - 1; i >= 0; i--) {
    if (withinShape(store.shapes[i], p)) {
      idx = i
      break
    }
  }
  if (idx === -1) return
  if (p.shiftKey) {
    // remove
    store.shapes = [
      ...store.shapes.slice(0, idx),
      ...store.shapes.slice(idx + 1),
    ]
  } else {
    // toggle state
    const s = store.shapes[idx]
    const ns: Shape = { ...s, state: s.state === 'on' ? 'off' : 'on' }
    const shapes = store.shapes.slice()
    shapes[idx] = ns
    store.shapes = shapes
  }
}

function countRed(shapes: Shape[]) {
  return shapes.filter((s) => 0 > s.t).length
}

function tickShape(s: Shape, dt: number): Shape | null {
  if (s.state === 'off') return s
  const t = s.t - dt
  if (t > -s.tM) return { ...s, t }
  return null
}

export function tick(dt: number) {
  if (store.mode !== 'run') return
  const red = countRed(store.shapes)
  const next: Shape[] = []
  for (const s of store.shapes) {
    const ns = tickShape(s, dt)
    if (ns) next.push(ns)
  }
  const red2 = countRed(next)
  store.shapes = next
  if (red2 > red) {
    playChime(audioFile)
  }
}
