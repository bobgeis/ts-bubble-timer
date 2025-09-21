import { type SVGProps } from 'react'
import { useSnapshot } from 'valtio'
import { store, minRadius, radiusToTime, setHoveredIndex } from '../state/store'
import type { Shape } from '../state/store'
import { radians, transRa, halfPi, pi } from '../lib/geometry'

function radiusToMinSec(r: number) {
  const minutes = Math.floor(r / 60)
  const seconds = Math.floor(r % 60)
  return `${minutes}:${`0${seconds}`.slice(-2)}`
}

function msToMinSec(ms: number) {
  // For negative ms (expired), show elapsed time counting up
  const total = Math.floor(Math.abs(ms) / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${`0${seconds}`.slice(-2)}`
}

function hueFromMultiplier(mult: number) {
  const startHue = 210 // blue
  const tealHue = 180 // teal/cyan
  const greenHue = 120
  const magentaHue = 300 // purple/magenta
  const redHue = 360 // same as 0
  if (!isFinite(mult) || mult <= 0) return startHue
  const base = 2
  const turns = Math.log(mult) / Math.log(base) / 2
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  if (turns >= 0) {
    const t = Math.min(turns, 2)
    if (t <= 1) return lerp(startHue, tealHue, t)
    return lerp(tealHue, greenHue, t - 1)
  } else {
    const t = Math.min(-turns, 2)
    if (t <= 1) return lerp(startHue, magentaHue, t)
    return lerp(magentaHue, redHue, t - 1)
  }
}

function hsla(h: number, s = 60, l = 50, a = 0.5) {
  const hh = ((h % 360) + 360) % 360
  return `hsla(${hh}, ${s}%, ${l}%, ${a})`
}

function fillColorForShape(shape: Shape) {
  const base = radiusToTime(shape.r)
  const mult = shape.tM / base
  const hue = hueFromMultiplier(mult)
  const sat = shape.state === 'off' ? 50 : 70 // paused less saturated; running a bit more saturated
  return hsla(hue, sat, 50, 0.7)
}

function makeSvgFillCircle(shape: Shape) {
  const { x, y, r } = shape
  return <circle cx={x} cy={y} r={r} fill={fillColorForShape(shape)} />
}

function makeSvgFillArc(shape: Shape) {
  const { x, y, r, t, tM } = shape
  const d = sectorPath(x, y, r, t / tM)
  return <path d={d} fill={fillColorForShape(shape)} />
}

function sectorPath(x: number, y: number, r: number, f: number) {
  const a = radians(Math.max(0, Math.min(1, f)))
  const [x2, y2] = transRa(x, y, r, -(a + halfPi))
  const flag = a > pi ? 1 : 0
  return [
    `M ${x}, ${y}`,
    `v${-r}`,
    `A ${r}, ${r}, 0, ${flag}, 0, ${x2}, ${y2}`,
    'Z',
  ].join(' ')
}

function makeSvgFill(shape: Shape) {
  const ratio = shape.t / shape.tM
  if (ratio >= 1) return makeSvgFillCircle(shape)
  if (ratio > 0) {
    return (
      <g>
        <circle
          cx={shape.x}
          cy={shape.y}
          r={shape.r}
          fill={fillColorForShape(shape)}
          opacity={0.2}
        />
        {makeSvgFillArc(shape)}
      </g>
    )
  }
  if (ratio > -1) {
    const fElapsed = Math.min(1, Math.max(0, -shape.t / shape.tM))
    const fRemainGhost = 1 - fElapsed
    if (fRemainGhost <= 0) return null
    const d = sectorPath(shape.x, shape.y, shape.r, fRemainGhost)
    return <path d={d} fill={fillColorForShape(shape)} opacity={0.2} />
  }
  return null
}

function makeSvgOutlineCircle(shape: Shape) {
  const { x, y, r, t, tM, state } = shape
  const ratio = t / tM
  const isAfter = ratio <= 0 && ratio > -1
  const paused = state === 'off'
  const stroke = isAfter ? '#888888' : 'black'
  const strokeWidth = 1
  if (!paused)
    return (
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="transparent"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    )
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="transparent"
        stroke={stroke}
        strokeWidth={5}
        opacity={0.3}
        filter="url(#pausedGlow)"
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="transparent"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}

function makeSvgOutline(shape: Shape) {
  const ratio = shape.t / shape.tM
  if (ratio > -1) return makeSvgOutlineCircle(shape)
  return null
}

function SvgShape({ shape }: { shape: Shape }) {
  if (!shape) return null
  return (
    <g>
      {makeSvgFill(shape)}
      {makeSvgOutline(shape)}
    </g>
  )
}

function MouseCircle() {
  const snap = useSnapshot(store)
  const start = snap.mouse?.start
  const stop = snap.mouse?.stop
  if (!start || !stop) return null
  const dx = stop.x - start.x
  const dy = stop.y - start.y
  const r = Math.hypot(dx, dy)
  const mult = snap.mouse?.mult ?? 1
  if (r <= minRadius) return null
  const hue = hueFromMultiplier(mult)
  const fill = hsla(hue, 60, 50, 0.8)
  return (
    <g>
      <circle cx={start.x} cy={start.y} r={r} fill={fill} />
      <text
        x={start.x}
        y={start.y}
        fontSize={22}
        fontFamily="Arial"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {radiusToMinSec(r * mult)}
      </text>
    </g>
  )
}

function getBgColor(mode: 'run' | 'pause', num: number, red: number) {
  if (mode === 'pause') return '#888855'
  if (num === 0) return '#555555'
  if (red === num) return '#885555'
  return '#DFDFD0'
}

export default function SvgBoard(props: SVGProps<SVGSVGElement>) {
  const snap = useSnapshot(store)
  const shapes = snap.shapes
  const red = shapes.filter((s) => s.t < 0).length
  const bg = getBgColor(snap.mode, shapes.length, red)

  return (
    <svg
      style={{
        backgroundColor: bg,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      {...props}
    >
      <defs>
        <filter id="pausedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <g>
        {shapes.map((s, i) => (
          <g
            key={i}
            onPointerEnter={() => setHoveredIndex(i)}
            onPointerLeave={() => setHoveredIndex(null)}
          >
            <SvgShape shape={s} />
          </g>
        ))}
      </g>
      <MouseCircle />
      {snap.hoverIndex !== null &&
      snap.hoverIndex >= 0 &&
      snap.hoverIndex < snap.shapes.length
        ? (() => {
            const sh = snap.shapes[snap.hoverIndex]
            const text = msToMinSec(sh.t)
            const color = sh.t < 0 ? '#888888' : '#000'
            return (
              <g pointerEvents="none">
                <text
                  x={sh.x}
                  y={sh.y}
                  fontSize={22}
                  fontFamily="Arial"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={color}
                >
                  {text}
                </text>
              </g>
            )
          })()
        : null}
    </svg>
  )
}
