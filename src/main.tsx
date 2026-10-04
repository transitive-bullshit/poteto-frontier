import { Analytics } from '@vercel/analytics/react'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { Toaster } from '@/components/ui/toast'

import { App } from './app'
import './styles.css'

function canAccessLocalStorage(): boolean {
  try {
    localStorage.getItem('feedback-toolbar-theme')
    return true
  } catch {
    return false
  }
}

const DevAgentation =
  import.meta.env.DEV && canAccessLocalStorage()
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
    <Toaster
      viewportClassName={DevAgentation ? 'max-sm:bottom-20' : undefined}
    />
    {import.meta.env.PROD && <Analytics mode='production' />}
    {DevAgentation && (
      <Suspense fallback={null}>
        <DevAgentation />
      </Suspense>
    )}
  </StrictMode>
)
