import { z } from 'zod'

import {
  CHART_EXPORT_HEIGHT,
  createChartSvg,
  POTETO_AVATAR_URL,
  type ChartSvgOptions
} from './frontier'
import { loadAvatar } from './profile'

const resultSchema = z.object({ png: z.instanceof(ArrayBuffer) })

export async function renderChartPng(options: ChartSvgOptions): Promise<Blob> {
  const svg = createChartSvg(
    {
      ...options,
      potetoAvatarDataUrl: await loadAvatar(POTETO_AVATAR_URL)
    },
    CHART_EXPORT_HEIGHT
  )
  const worker = new Worker(new URL('./render.worker.ts', import.meta.url), {
    type: 'module'
  })
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('The PNG render timed out'))
      }, 45_000)
      worker.onmessage = ({ data }: MessageEvent<unknown>) => {
        clearTimeout(timeout)
        const result = resultSchema.safeParse(data)
        if (result.success) {
          resolve(new Blob([result.data.png], { type: 'image/png' }))
        } else {
          reject(new Error('Takumi could not render the chart'))
        }
      }
      worker.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Takumi could not start'))
      }
      worker.postMessage({ svg })
    })
  } finally {
    worker.terminate()
  }
}
