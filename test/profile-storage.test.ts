import { afterEach, expect, it, vi } from 'vitest'

import { readSavedPosition, savePosition } from '../src/profile-storage'

afterEach(() => vi.unstubAllGlobals())

it('restores placement including both endpoints', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  })
  expect(readSavedPosition()).toBe(0.32)
  for (const position of [0, 0.72, 1]) {
    savePosition(position)
    expect(readSavedPosition()).toBe(position)
  }
})

it('ignores corrupt or out-of-range saved placement', () => {
  for (const value of ['', 'broken', 'null', '"0.5"', '-1', '2']) {
    vi.stubGlobal('localStorage', { getItem: () => value })
    expect(readSavedPosition()).toBe(0.32)
  }
})

it('keeps placement usable when browser storage is blocked', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('Storage blocked')
    },
    setItem: () => {
      throw new Error('Storage blocked')
    }
  })
  expect(readSavedPosition()).toBe(0.32)
  expect(() => savePosition(0.5)).not.toThrow()
})
