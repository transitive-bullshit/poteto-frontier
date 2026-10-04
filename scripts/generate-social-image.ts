import { Renderer } from '@takumi-rs/wasm/node'
import { readFile, writeFile } from 'node:fs/promises'

import {
  CHART_BACKGROUND,
  CHART_EXPORT_HEIGHT,
  CHART_FONT_NAME,
  CHART_INK,
  CHART_WIDTH,
  createChartSvg,
  pointOnCurve,
  POTETO_AVATAR_URL
} from '../src/frontier'

const font = await readFile(
  new URL('../public/fonts/chart.woff2', import.meta.url)
)
const photo = await readFile(
  new URL(`../public${POTETO_AVATAR_URL}`, import.meta.url)
)
const scale = 810 / CHART_WIDTH
const position = 0.32
const point = pointOnCurve(position)
const chart = createChartSvg(
  {
    title: '',
    position,
    fontDataUrl: `data:font/woff2;base64,${font.toString('base64')}`,
    potetoAvatarDataUrl: `data:image/jpeg;base64,${photo.toString('base64')}`
  },
  CHART_EXPORT_HEIGHT
)
  .replace('<svg ', '<svg x="350" y="3" ')
  .replace(
    `width="${CHART_WIDTH}" height="${CHART_EXPORT_HEIGHT}"`,
    `width="810" height="${CHART_EXPORT_HEIGHT * scale}"`
  )

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${CHART_BACKGROUND}"/>
  ${chart}
  <g font-family="${CHART_FONT_NAME}" fill="${CHART_INK}">
    <text x="42" y="267" font-size="56">The Poteto</text>
    <text x="42" y="346" font-size="72">Frontier</text>
    <text x="${350 + point.x * scale}" y="${3 + point.y * scale - 30}" text-anchor="middle" font-size="34">you?</text>
  </g>
</svg>`

const renderer = new Renderer()
try {
  await renderer.registerFont({ name: CHART_FONT_NAME, data: font })
  const png = await renderer.render(
    { type: 'image', src: svg, width: 1200, height: 630 },
    { width: 1200, height: 630, format: 'png' }
  )
  await writeFile(new URL('../public/social.png', import.meta.url), png)
} finally {
  renderer.free()
}
