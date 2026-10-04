import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import './styles.css'

const DevAgentation = import.meta.env.DEV
  ? lazy(async () => {
      const { Agentation } = await import('agentation')
      return { default: Agentation }
    })
  : null

const root = document.querySelector('#root')
if (!root) throw new Error('Missing app root')

createRoot(root).render(
  <StrictMode>
    <App />
    {DevAgentation && (
      <Suspense fallback={null}>
        <DevAgentation />
      </Suspense>
    )}
  </StrictMode>
)
