export const pi = Math.PI
export const halfPi = pi / 2
export const tau = pi * 2

export const radians = (a: number) => tau * a // circles -> radians

// Vector helpers
export const mag = (x: number, y: number) => Math.hypot(x, y)
export const gang = (x: number, y: number) => Math.atan2(y, x)

// Cartesian <-> polar
export const raToXy = (r: number, a: number): [number, number] => [
  r * Math.cos(a),
  r * Math.sin(a),
]
export const xyToRa = (x: number, y: number): [number, number] => [
  mag(x, y),
  gang(x, y),
]

// Translation
export const transXy = (
  x: number,
  y: number,
  dx: number,
  dy: number,
): [number, number] => [x + dx, y + dy]
export const transRa = (
  x: number,
  y: number,
  r: number,
  a: number,
): [number, number] => {
  const [dx, dy] = raToXy(r, a)
  return transXy(x, y, dx, dy)
}

// Misc utils
export const square = (x: number) => x * x

export type Point = { x: number; y: number }
export const distance = (p1: Point, p2: Point) => {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

// Normalize angle to [-pi, pi]
export const normalizePi = (a: number) => {
  let x = a
  while (x <= -pi) x += tau
  while (x > pi) x -= tau
  return x
}

// Angle from up-direction (12 o'clock) with clockwise positive, in [-pi, pi]
export const angleFromUpCwBetween = (start: Point, stop: Point) => {
  const dx = stop.x - start.x
  const dy = stop.y - start.y
  const theta = Math.atan2(dy, dx) // from +x axis CCW
  const fromUpCw = -(theta + halfPi)
  return normalizePi(fromUpCw)
}

// Convert angle to duration multiplier. For a in [-pi, pi], multiplier in [0.5, 2].
export const durationMultiplierFromAngle = (a: number, base = 2) =>
  Math.pow(base, a / pi)
