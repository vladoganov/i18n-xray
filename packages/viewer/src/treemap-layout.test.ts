/**
 * Geometry checks on the exact source the report ships. `new Function` here is
 * deliberate: it evaluates `TREEMAP_LAYOUT_SOURCE` itself, so these assertions
 * cannot drift from what ends up inside the HTML.
 */
import { expect, it } from 'vitest'
import { TREEMAP_LAYOUT_SOURCE } from './treemap-layout'

type Box = { x: number; y: number; w: number; h: number; item: { value: number } }
type Squarify = (items: Array<{ value: number }>, box: Record<string, number>) => Box[]

const squarify = new Function(`${TREEMAP_LAYOUT_SOURCE}; return squarify;`)() as Squarify

const CONTAINER = { x: 0, y: 0, w: 960, h: 380 }
const FIXTURE = [{ value: 6 }, { value: 6 }, { value: 2 }] // checkout, common, admin

it('places every item exactly once', () => {
  expect(squarify(FIXTURE, CONTAINER)).toHaveLength(FIXTURE.length)
})

it('gives each tile an area proportional to its value', () => {
  const total = FIXTURE.reduce((sum, item) => sum + item.value, 0)
  const area = CONTAINER.w * CONTAINER.h
  for (const box of squarify(FIXTURE, CONTAINER)) {
    expect(box.w * box.h).toBeCloseTo((box.item.value / total) * area, 4)
  }
})

it('fills the container without overflowing it', () => {
  for (const box of squarify(FIXTURE, CONTAINER)) {
    expect(box.x).toBeGreaterThanOrEqual(-1e-9)
    expect(box.y).toBeGreaterThanOrEqual(-1e-9)
    expect(box.x + box.w).toBeLessThanOrEqual(CONTAINER.w + 1e-9)
    expect(box.y + box.h).toBeLessThanOrEqual(CONTAINER.h + 1e-9)
  }
})

it('lays tiles out without overlapping', () => {
  const boxes = squarify(
    [{ value: 9 }, { value: 6 }, { value: 4 }, { value: 3 }, { value: 1 }],
    CONTAINER,
  )
  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) {
      const [p, q] = [boxes[a] as Box, boxes[b] as Box]
      const overlapX = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x)
      const overlapY = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y)
      expect(Math.min(overlapX, overlapY)).toBeLessThan(1e-6)
    }
  }
})

it('keeps tiles roughly square rather than producing slivers', () => {
  // The point of squarifying. Slice-and-dice on this input would produce a
  // ratio near 20; anything under ~4 is a usable tile.
  const boxes = squarify(
    Array.from({ length: 12 }, (_, index) => ({ value: 12 - index })),
    CONTAINER,
  )
  const worstRatio = Math.max(...boxes.map((b) => Math.max(b.w / b.h, b.h / b.w)))
  expect(worstRatio).toBeLessThan(4)
})

it('survives a single namespace and a degenerate container', () => {
  expect(squarify([{ value: 5 }], CONTAINER)[0]).toMatchObject(CONTAINER)
  expect(squarify([], CONTAINER)).toEqual([])
  expect(squarify([{ value: 0 }], CONTAINER)).toEqual([])
  expect(squarify(FIXTURE, { x: 0, y: 0, w: 0, h: 380 })).toEqual([])
})
