/** Geometry is expressed in the original chart's 1751 × 1396 coordinates. */
export const CHART_WIDTH = 1751
export const CHART_HEIGHT = 1396
export const CHART_VIEWBOX = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`
export const CHART_BACKGROUND = '#faf9fc'
export const POTETO_AVATAR_URL =
  'https://pbs.twimg.com/profile_images/2093473719830315008/oo09g1Ov_400x400.jpg'
export const CHART_INK = '#252525'
export const CHART_FONT_NAME = 'Virgil'
export const CHART_FONT_FAMILY = 'Virgil, "Comic Sans MS", cursive'
export const CHART_FONT_SOURCE = 'https://github.com/excalidraw/virgil'

export const FRONTIER = Object.freeze({
  startX: 249,
  endX: 1597,
  startY: 1155,
  endY: 194,
  saturation: 4.27,
  axisOrigin: Object.freeze({ x: 249, y: 1155 }),
  axisEnd: Object.freeze({ x: 1600, y: 1148 })
})

export type CurvePoint = { x: number; y: number; t: number; trust: number }

/** A position is always bounded to the curve, even for non-finite input. */
export function clampPosition(position: number): number {
  return Number.isFinite(position) ? Math.max(0, Math.min(1, position)) : 0
}

/** Normalized input t → absolute SVG coordinates, with normalized trust. */
export function pointOnCurve(position: number): CurvePoint {
  const t = clampPosition(position)
  const trust =
    (1 - Math.exp(-FRONTIER.saturation * t)) /
    (1 - Math.exp(-FRONTIER.saturation))
  return {
    t,
    trust,
    x: FRONTIER.startX + (FRONTIER.endX - FRONTIER.startX) * t,
    y: FRONTIER.startY - (FRONTIER.startY - FRONTIER.endY) * trust
  }
}

/** Use this for horizontal dragging or keyboard/slider control. */
export function positionForX(x: number): number {
  return clampPosition(
    (x - FRONTIER.startX) / (FRONTIER.endX - FRONTIER.startX)
  )
}

/** Project a pointer in SVG coordinates onto the closest point of the curve. */
export function nearestPosition(x: number, y: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0
  const distanceSquared = (t: number): number => {
    const point = pointOnCurve(t)
    return (point.x - x) ** 2 + (point.y - y) ** 2
  }
  // Bracket the closest region before refining; this also handles off-chart drags.
  const steps = 128
  let bestIndex = 0
  let bestDistance = Infinity
  for (let index = 0; index <= steps; index++) {
    const distance = distanceSquared(index / steps)
    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  }
  let lower = Math.max(0, (bestIndex - 1) / steps)
  let upper = Math.min(1, (bestIndex + 1) / steps)
  const ratio = (Math.sqrt(5) - 1) / 2
  let a = upper - ratio * (upper - lower)
  let b = lower + ratio * (upper - lower)
  let distanceA = distanceSquared(a)
  let distanceB = distanceSquared(b)
  for (let iteration = 0; iteration < 42; iteration++) {
    if (distanceA <= distanceB) {
      upper = b
      b = a
      distanceB = distanceA
      a = upper - ratio * (upper - lower)
      distanceA = distanceSquared(a)
    } else {
      lower = a
      a = b
      distanceA = distanceB
      b = lower + ratio * (upper - lower)
      distanceB = distanceSquared(b)
    }
  }
  const refined = (lower + upper) / 2
  if (distanceSquared(0) <= distanceSquared(refined)) return 0
  if (distanceSquared(1) <= distanceSquared(refined)) return 1
  return clampPosition(refined)
}

export const FRONTIER_TICKS = Object.freeze([
  { x: 249, t: 0, label: '0' },
  { x: 306, t: (306 - 249) / 1348, label: '1' },
  { x: 374, t: (374 - 249) / 1348, label: '1 to 5' },
  { x: 524, t: (524 - 249) / 1348, label: '5 to 10' },
  { x: 682, t: (682 - 249) / 1348, label: '10 to 20' },
  { x: 1067, t: (1067 - 249) / 1348, label: 'hundreds' },
  { x: 1450, t: (1450 - 249) / 1348, label: 'thousands' }
] as const)

/** The nearest source-chart tick label, without implying measured agent counts. */
export function stageFor(
  position: number
): (typeof FRONTIER_TICKS)[number]['label'] {
  const t = clampPosition(position)
  let closest: (typeof FRONTIER_TICKS)[number] = FRONTIER_TICKS[0]
  for (const tick of FRONTIER_TICKS) {
    if (Math.abs(tick.t - t) < Math.abs(closest.t - t)) closest = tick
  }
  return closest.label
}

export type ChartSvgOptions = {
  position?: number
  handle?: string
  avatarDataUrl?: string
  /** Embedded for PNG exports; the on-screen graph uses the public URL. */
  potetoAvatarDataUrl?: string
  title?: string
  /** Embed a local font when producing a standalone SVG. */
  fontDataUrl?: string
}

const rounded = (number: number): string => number.toFixed(2)
const escapeXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[character]!
  )

export function curvePath(): string {
  return Array.from({ length: 241 }, (_, index) => {
    const point = pointOnCurve(index / 240)
    return `${index === 0 ? 'M' : 'L'}${rounded(point.x)} ${rounded(point.y)}`
  }).join(' ')
}

/** The source chart, with an optional profile marker constrained to its curve. */
export function createChartSvg(options: ChartSvgOptions = {}): string {
  const title = options.title ?? 'The Poteto Frontier'
  const titleMarkup = title
    ? `<text x="875.5" y="76" text-anchor="middle" font-size="62" font-weight="400">${escapeXml(title)}</text>`
    : ''
  const fontDataUrl =
    options.fontDataUrl &&
    /^data:font\/(?:ttf|woff2?);base64,[A-Za-z0-9+/=]+$/.test(
      options.fontDataUrl
    )
      ? options.fontDataUrl
      : undefined
  const fontFormat = fontDataUrl?.startsWith('data:font/woff2;')
    ? 'woff2'
    : fontDataUrl?.startsWith('data:font/woff;')
      ? 'woff'
      : 'truetype'
  const fontStyle = fontDataUrl
    ? `<style>@font-face{font-family:${CHART_FONT_NAME};src:url(${fontDataUrl}) format('${fontFormat}');font-weight:400;font-style:normal}</style>`
    : ''
  const guides = FRONTIER_TICKS.slice(1)
    .map((tick) => {
      const point = pointOnCurve(tick.t)
      const bottom = 1155 + ((tick.x - 249) / (1600 - 249)) * (1148 - 1155)
      return `<path d="M ${tick.x} ${rounded(point.y)} L ${tick.x} ${rounded(bottom)}" stroke-width="4" stroke-dasharray="0.6 9" stroke-linecap="round"/>`
    })
    .join('\n')
  const tickLabels = FRONTIER_TICKS.map(
    (tick, index) =>
      `<text x="${tick.x}" y="${index === 0 ? 1194 : index > 3 ? 1189 : 1197}" text-anchor="middle" font-size="27" font-weight="400">${tick.label}</text>`
  ).join('\n')

  let marker = ''
  if (options.position !== undefined) {
    const point = pointOnCurve(options.position)
    const handle = options.handle?.trim().replace(/^@/, '').slice(0, 30)
    const avatar =
      options.avatarDataUrl &&
      /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
        options.avatarDataUrl
      )
        ? options.avatarDataUrl
        : undefined
    const labelHalfWidth = ((handle?.length ?? 0) + 1) * 11
    const labelX = Math.min(
      CHART_WIDTH - 36 - labelHalfWidth,
      Math.max(36 + labelHalfWidth, point.x)
    )
    const labelY =
      options.position > 0.75 ? point.y + 80 : Math.max(128, point.y - 61)
    marker = `<g aria-label="Selected position on the Poteto frontier">
      <defs><clipPath id="frontier-avatar-clip"><circle cx="${rounded(point.x)}" cy="${rounded(point.y)}" r="31"/></clipPath></defs>
      <circle cx="${rounded(point.x)}" cy="${rounded(point.y)}" r="36" fill="${CHART_BACKGROUND}" stroke="${CHART_INK}" stroke-width="3"/>
      ${
        avatar
          ? `<image href="${avatar}" x="${rounded(point.x - 31)}" y="${rounded(point.y - 31)}" width="62" height="62" preserveAspectRatio="xMidYMid slice" clip-path="url(#frontier-avatar-clip)"/>`
          : `<circle cx="${rounded(point.x)}" cy="${rounded(point.y)}" r="26" fill="${CHART_INK}"/>`
      }
      ${handle ? `<text x="${rounded(labelX)}" y="${rounded(labelY)}" text-anchor="middle" font-size="36" font-weight="400" paint-order="stroke" stroke="${CHART_BACKGROUND}" stroke-width="9" stroke-linejoin="round">@${escapeXml(handle)}</text>` : ''}
    </g>`
  }

  const potetoAvatar =
    options.potetoAvatarDataUrl &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
      options.potetoAvatarDataUrl
    )
      ? options.potetoAvatarDataUrl
      : POTETO_AVATAR_URL
  const potetoMarker = `<g aria-label="Poteto at the top right of the frontier">
    <defs><clipPath id="poteto-avatar-clip"><circle cx="1597" cy="84" r="52"/></clipPath></defs>
    <path d="M1597 140 L1597 194" fill="none" stroke="${CHART_INK}" stroke-width="2"/>
    <circle cx="1597" cy="84" r="56" fill="${CHART_BACKGROUND}" stroke="${CHART_INK}" stroke-width="3"/>
    <image href="${potetoAvatar}" x="1545" y="32" width="104" height="104" preserveAspectRatio="xMidYMid slice" clip-path="url(#poteto-avatar-clip)"/>
    <text x="1510" y="97" text-anchor="end" font-size="32" font-weight="400">@poteto</text>
  </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="${CHART_VIEWBOX}" role="img" aria-labelledby="frontier-title frontier-description">
  <title id="frontier-title">${escapeXml(title || 'Agent trust chart')}</title>
  <desc id="frontier-description">Trust increases as the number of agents increases, along a rising curve that gradually flattens. Inspired by @poteto.</desc>
  ${fontStyle}
  <rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="${CHART_BACKGROUND}"/>
  <g fill="${CHART_INK}" font-family='${escapeXml(CHART_FONT_FAMILY)}' font-style="normal" font-weight="400">
    ${titleMarkup}
    <g fill="none" stroke="${CHART_INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 249 1155 L 246 812 L 242 434 L 240 94 M 240 94 L 235.5 103 M 240 94 L 245.4 102"/>
      <path d="M 249 1155 L 750 1152 L 1150 1150 L 1600 1148 M 1600 1148 L 1590 1143 M 1600 1148 L 1590 1153"/>
      ${guides}
      <path d="${curvePath()}"/>
    </g>
    <text x="136" y="609" text-anchor="middle" font-size="43" font-weight="400">trust</text>
    ${tickLabels}
    <text x="967" y="1300" text-anchor="middle" font-size="46" font-weight="400">number of agents</text>
    ${marker}
    ${potetoMarker}
  </g>
</svg>`
}
