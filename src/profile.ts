import ky from 'ky'
import { z } from 'zod'

export const handleSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, ''))
  .pipe(
    z.string().regex(/^[a-zA-Z0-9_]{1,15}$/, 'Enter an X handle, like @poteto')
  )

export const avatarUrlSchema = z
  .url()
  .refine((value) => {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'pbs.twimg.com'
  }, 'That profile photo is unavailable')
  .transform((value) => {
    const url = new URL(value)
    url.pathname = url.pathname.replace(/_normal(?=\.[a-z]+$)/i, '_400x400')
    return url.href
  })

const responseSchema = z.object({
  code: z.literal(200),
  user: z.object({
    name: z.string(),
    screen_name: z.string(),
    avatar_url: avatarUrlSchema
  })
})

export interface Profile {
  handle: string
  name: string
  avatarUrl: string
  avatarDataUrl: string
}

async function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read the profile photo'))
    }
    reader.onerror = () => reject(new Error('Could not read the profile photo'))
    reader.readAsDataURL(blob)
  })
}

export async function lookupProfile(
  rawHandle: string,
  signal?: AbortSignal
): Promise<Profile> {
  const handle = handleSchema.parse(rawHandle)
  const json = await ky
    .get(`https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}`, {
      signal,
      timeout: 12_000,
      retry: 0
    })
    .json()
  const { user } = responseSchema.parse(json)
  if (user.screen_name.toLowerCase() !== handle.toLowerCase()) {
    throw new Error('The returned profile does not match that handle')
  }

  return {
    handle: user.screen_name,
    name: user.name,
    avatarUrl: user.avatar_url,
    avatarDataUrl: await loadAvatar(user.avatar_url, signal)
  }
}

export async function loadAvatar(
  rawUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const avatar = avatarUrlSchema.parse(rawUrl)
  const photo = await ky
    .get(avatar, { signal, timeout: 12_000, retry: 0 })
    .blob()
  if (
    !/^image\/(png|jpe?g|webp|gif)$/.test(photo.type) ||
    photo.size > 5_000_000
  ) {
    throw new Error('That profile photo could not be loaded')
  }

  return asDataUrl(photo)
}
