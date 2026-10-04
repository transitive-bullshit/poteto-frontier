import { describe, expect, it } from 'vitest'

import {
  clampPosition,
  createChartSvg,
  FRONTIER,
  nearestPosition,
  pointOnCurve
} from '../src/frontier'
import { handleSchema } from '../src/profile'

describe('frontier placement', () => {
  it('projects back to the curve and stays bounded for off-chart drags', () => {
    for (const position of [0, 0.01, 0.2, 0.5, 0.8, 1]) {
      const point = pointOnCurve(position)
      expect(nearestPosition(point.x, point.y)).toBeCloseTo(position, 7)
    }
    expect(pointOnCurve(-1).x).toBe(FRONTIER.startX)
    expect(pointOnCurve(2).x).toBe(FRONTIER.endX)
    expect(clampPosition(Number.NaN)).toBe(0)
    expect(nearestPosition(-1000, 4000)).toBe(0)
    expect(nearestPosition(4000, -1000)).toBe(1)
  })

  it('preserves the original labels and safely embeds profile text', () => {
    const svg = createChartSvg({ position: 0.5, handle: '<script>&"' })
    for (const label of [
      'The Poteto Frontier',
      'trust',
      'number of agents',
      '1 to 5',
      '5 to 10',
      '10 to 20',
      'hundreds',
      'thousands'
    ]) {
      expect(svg).toContain(label)
    }
    expect(svg).toContain('&lt;script&gt;&amp;&quot;')
    expect(svg).not.toContain('<script>')
    expect(
      createChartSvg({
        avatarDataUrl: 'https://example.com/pic.png',
        position: 0
      })
    ).not.toContain('https://example.com/pic.png')
    expect(svg).toContain('poteto-avatar-clip')
    expect(svg).not.toContain('self-reported · inspired by')
  })

  it('accepts real X handles and rejects URL, markup, and path input', () => {
    expect(handleSchema.parse(' @poteto ')).toBe('poteto')
    expect(handleSchema.parse('transitive_bs')).toBe('transitive_bs')
    for (const input of [
      '',
      'long_handle_more_than_15',
      'https://x.com/poteto',
      '../poteto',
      '<img>'
    ]) {
      expect(handleSchema.safeParse(input).success).toBe(false)
    }
  })
})
