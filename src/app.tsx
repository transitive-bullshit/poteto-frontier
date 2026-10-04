import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent
} from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText
} from '@/components/ui/input-group'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

import {
  CHART_HEIGHT,
  CHART_WIDTH,
  createChartSvg,
  nearestPosition,
  pointOnCurve,
  stageFor
} from './frontier'
import {
  handleSchema,
  loadAvatar,
  lookupProfile,
  type Profile
} from './profile'
import {
  readSavedHandle,
  readSavedProfile,
  saveHandle,
  saveProfile
} from './profile-storage'

const baseChart = createChartSvg()

// Brand icon paths from Simple Icons: https://simpleicons.org
const socialLinks = [
  {
    label: 'GitHub repository',
    iconClassName: 'size-4',
    href: 'https://github.com/transitive-bullshit/poteto-frontier',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
  },
  {
    label: 'Travis Fischer on X',
    iconClassName: 'size-3.5',
    href: 'https://x.com/transitive_bs',
    path: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z'
  }
]

export function App() {
  const [handle, setHandle] = useState(readSavedHandle)
  const [savedProfile] = useState(readSavedProfile)
  const [profile, setProfile] = useState<Profile>()
  const [position, setPosition] = useState(0.32)
  const [lookupPending, setLookupPending] = useState(Boolean(savedProfile))
  const [exportPending, setExportPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | undefined>(undefined)
  const chart = useRef<HTMLDivElement>(null)
  const dragPointer = useRef<number | undefined>(undefined)
  const point = pointOnCurve(position)

  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => saveHandle(handle), [handle])

  useEffect(() => {
    if (!savedProfile) return
    const controller = new AbortController()
    request.current = controller
    void loadAvatar(savedProfile.avatarUrl, controller.signal)
      .then((avatarDataUrl) => {
        if (!controller.signal.aborted) {
          setProfile({ ...savedProfile, avatarDataUrl })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          saveProfile()
          setError('Couldn’t restore your photo — add it again')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLookupPending(false)
      })
    return () => controller.abort()
  }, [savedProfile])

  async function findProfile(event: FormEvent) {
    event.preventDefault()
    if (!handle.trim()) {
      request.current?.abort()
      setLookupPending(false)
      setProfile(undefined)
      setHandle('')
      setError('')
      saveHandle('')
      saveProfile()
      return
    }
    const parsed = handleSchema.safeParse(handle)
    if (!parsed.success) {
      setError('')
      toast.add({ title: 'Enter an X handle, like @poteto', type: 'error' })
      return
    }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLookupPending(true)
    setError('')
    // A pending or failed new lookup must not export the previous person's photo
    setProfile(undefined)
    saveProfile()
    try {
      const result = await lookupProfile(parsed.data, controller.signal)
      if (!controller.signal.aborted) {
        setProfile(result)
        saveProfile(result)
      }
    } catch {
      if (!controller.signal.aborted) {
        setError(
          'Couldn’t load that profile — check the handle or try again in a moment'
        )
      }
    } finally {
      if (!controller.signal.aborted) setLookupPending(false)
    }
  }

  function moveToPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = chart.current?.getBoundingClientRect()
    if (!bounds) return
    setPosition(
      nearestPosition(
        ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH,
        ((event.clientY - bounds.top) / bounds.height) * CHART_HEIGHT
      )
    )
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    dragPointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    moveToPointer(event)
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragPointer.current === event.pointerId) moveToPointer(event)
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragPointer.current === event.pointerId) dragPointer.current = undefined
  }

  function moveWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.05 : 0.01
    const change: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step
    }
    if (event.key in change) {
      event.preventDefault()
      setPosition((current) =>
        Math.max(0, Math.min(1, current + (change[event.key] ?? 0)))
      )
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setPosition(event.key === 'Home' ? 0 : 1)
    }
  }

  async function download() {
    if (exportPending || lookupPending) return
    setExportPending(true)
    setError('')
    try {
      const { renderChartPng } = await import('./export')
      const blob = await renderChartPng({ position, ...profile })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = profile
        ? `poteto-frontier-${profile.handle}.png`
        : 'poteto-frontier.png'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      toast.add({ title: 'Your PNG is ready', type: 'success' })
    } catch {
      setError('Couldn’t render your PNG — please try again')
    } finally {
      setExportPending(false)
    }
  }

  return (
    <main>
      <header className='masthead'>
        <a className='wordmark' href='/'>
          The Poteto Frontier
        </a>
        <a
          className='link source-link'
          href='https://x.com/poteto'
          target='_blank'
          rel='noreferrer'
        >
          inspired by @poteto
        </a>
      </header>
      <h1 className='sr-only'>The Poteto Frontier</h1>
      <div className='workspace'>
        <section
          className='chart-section'
          aria-label='Trust versus number of agents'
        >
          <div
            className='chart'
            ref={chart}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={() => {
              dragPointer.current = undefined
            }}
          >
            <div
              className='chart-drawing'
              aria-hidden='true'
              dangerouslySetInnerHTML={{ __html: baseChart }}
            />
            <div
              className={cn(
                'marker',
                profile && 'has-profile',
                position > 0.75 && 'near-right',
                position < 0.15 && 'near-left'
              )}
              style={{
                left: `${(point.x / CHART_WIDTH) * 100}%`,
                top: `${(point.y / CHART_HEIGHT) * 100}%`
              }}
              role='slider'
              tabIndex={0}
              aria-label='Your position on the Poteto Frontier'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(position * 100)}
              aria-valuetext={stageFor(position)}
              onKeyDown={moveWithKeys}
            >
              {profile ? (
                <img src={profile.avatarDataUrl} alt='' draggable={false} />
              ) : (
                <span className='marker-dot' />
              )}
              <span className='marker-label'>
                {profile ? `@${profile.handle}` : 'you'}
              </span>
            </div>
          </div>
          <p className='chart-question'>
            How many agents do you generally have working on your behalf?
          </p>
        </section>

        <aside className='controls'>
          <div className='controls-heading'>
            <h2>Where do you land?</h2>
            <p className='intro'>
              Add your X handle, then place yourself along the curve by dragging
              your pfp
            </p>
          </div>

          <form onSubmit={findProfile}>
            <FieldGroup className='gap-3'>
              <Field data-invalid={Boolean(error && !profile)}>
                <FieldLabel htmlFor='handle'>Your X handle</FieldLabel>
                <InputGroup className='h-11'>
                  <InputGroupInput
                    id='handle'
                    name='handle'
                    value={handle}
                    onChange={(event) => {
                      setHandle(event.target.value)
                      setError('')
                    }}
                    placeholder='poteto'
                    autoCapitalize='none'
                    autoCorrect='off'
                    spellCheck={false}
                    autoComplete='off'
                    aria-describedby='feedback'
                    aria-invalid={Boolean(error && !profile)}
                    maxLength={16}
                  />
                  <InputGroupAddon align='inline-start'>
                    <InputGroupText aria-hidden='true'>@</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <Button
                  variant='outline'
                  className='profile-button h-11 w-full'
                  disabled={lookupPending}
                  type='submit'
                >
                  {lookupPending
                    ? 'Finding your photo…'
                    : profile
                      ? 'Update photo'
                      : 'Add my photo'}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <Button
            className='download-button h-11 w-full'
            type='button'
            onClick={download}
            disabled={lookupPending || exportPending}
          >
            <DownloadIcon data-icon='inline-start' />
            {exportPending ? 'Rendering PNG…' : 'Download my chart'}
          </Button>
          <div
            id='feedback'
            className={cn('feedback', error && 'error')}
            hidden={!error}
            role='status'
            aria-live='polite'
          >
            {error}
          </div>
        </aside>
      </div>
      <footer>
        <span>More agents, more trust, more letting go</span>
        <nav className='footer-social-links' aria-label='Project links'>
          {socialLinks.map(({ label, href, path, iconClassName }) => (
            <a
              key={href}
              data-slot='button'
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              href={href}
              aria-label={label}
              title={label}
              target='_blank'
              rel='noreferrer'
            >
              <svg
                className={iconClassName}
                viewBox='0 0 24 24'
                fill='currentColor'
                aria-hidden='true'
                focusable='false'
              >
                <path d={path} />
              </svg>
            </a>
          ))}
        </nav>
        <a
          className='link'
          href='https://x.com/poteto/status/2102050467505430555'
          target='_blank'
          rel='noreferrer'
        >
          Lauren’s original talk
        </a>
      </footer>
    </main>
  )
}
import { DownloadIcon } from 'lucide-react'
