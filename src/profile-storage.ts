import { z } from 'zod'

import { avatarUrlSchema, handleSchema, type Profile } from './profile'

const handleKey = 'poteto-frontier.handle'
const profileKey = 'poteto-frontier.profile'
const positionKey = 'poteto-frontier.position'
const positionSchema = z.number().min(0).max(1)
const storedProfileSchema = z.object({
  handle: handleSchema,
  name: z.string(),
  avatarUrl: avatarUrlSchema
})

export function readSavedHandle(): string {
  try {
    return (
      z.string().max(16).safeParse(localStorage.getItem(handleKey)).data ?? ''
    )
  } catch {
    return ''
  }
}

export function saveHandle(handle: string): void {
  try {
    localStorage.setItem(handleKey, handle)
  } catch {
    // Storage may be unavailable; the current session still works
  }
}

export function readSavedPosition(): number {
  try {
    const value = localStorage.getItem(positionKey)
    return positionSchema.safeParse(JSON.parse(value ?? 'null')).data ?? 0.32
  } catch {
    return 0.32
  }
}

export function savePosition(position: number): void {
  try {
    localStorage.setItem(
      positionKey,
      JSON.stringify(positionSchema.parse(position))
    )
  } catch {
    // Storage may be unavailable; placement still works for this session
  }
}

export function readSavedProfile():
  | z.infer<typeof storedProfileSchema>
  | undefined {
  try {
    const json = localStorage.getItem(profileKey)
    return json
      ? storedProfileSchema.safeParse(JSON.parse(json)).data
      : undefined
  } catch {
    return undefined
  }
}

export function saveProfile(profile?: Profile): void {
  try {
    if (profile) {
      // Cache the small public URL rather than the embedded image bytes
      localStorage.setItem(
        profileKey,
        JSON.stringify(storedProfileSchema.parse(profile))
      )
    } else {
      localStorage.removeItem(profileKey)
    }
  } catch {
    // A storage failure must not prevent profile lookup or PNG export
  }
}
