import init, { Renderer } from '@takumi-rs/wasm'
import wasmUrl from '@takumi-rs/wasm/takumi_wasm_bg.wasm?url'
import ky from 'ky'

import { CHART_EXPORT_HEIGHT, CHART_FONT_NAME, CHART_WIDTH } from './frontier'

interface RenderRequest {
  svg: string
}

self.onmessage = async ({ data }: MessageEvent<RenderRequest>) => {
  try {
    await init({ module_or_path: wasmUrl })
    const renderer = new Renderer()
    const font = await ky
      .get(`${import.meta.env.BASE_URL}fonts/chart.woff2`, { timeout: 15_000 })
      .arrayBuffer()
    await renderer.registerFont({ name: CHART_FONT_NAME, data: font })
    const png = await renderer.render(
      {
        type: 'image',
        src: data.svg,
        width: CHART_WIDTH,
        height: CHART_EXPORT_HEIGHT
      },
      { width: CHART_WIDTH, height: CHART_EXPORT_HEIGHT, format: 'png' }
    )
    self.postMessage({ png: png.buffer }, { transfer: [png.buffer] })
    renderer.free()
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err)
    })
  }
}
