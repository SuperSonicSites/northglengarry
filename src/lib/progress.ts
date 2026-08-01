import { useCallback, useEffect, useState } from 'react'

/**
 * Study progress is held in this browser only. Nothing is transmitted, which
 * keeps the dashboard a static site with no backend and keeps reflections
 * private to the machine they were written on. The consequence, which the
 * study page states plainly, is that clearing site data clears progress.
 */

const KEY = 'ng-study-progress-v1'

export interface UnitProgress {
  done?: boolean
  /** ISO date the unit was marked complete. */
  completed?: string
  reflection?: string
}

export type ProgressMap = Record<string, UnitProgress>

function read(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function write(value: ProgressMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Storage unavailable or full. Progress is a convenience, not the record;
    // failing silently is preferable to interrupting study.
  }
}

const listeners = new Set<(value: ProgressMap) => void>()

function broadcast(value: ProgressMap) {
  for (const listener of listeners) listener(value)
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(read)

  useEffect(() => {
    const listener = (value: ProgressMap) => setProgress(value)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const update = useCallback((day: number, patch: UnitProgress) => {
    const next = { ...read() }
    next[String(day)] = { ...next[String(day)], ...patch }
    write(next)
    broadcast(next)
  }, [])

  const toggleDone = useCallback((day: number, today: string) => {
    const current = read()
    const key = String(day)
    const wasDone = current[key]?.done === true
    const next = { ...current }
    next[key] = {
      ...next[key],
      done: !wasDone,
      completed: wasDone ? undefined : today,
    }
    write(next)
    broadcast(next)
  }, [])

  const reset = useCallback(() => {
    write({})
    broadcast({})
  }, [])

  return { progress, update, toggleDone, reset }
}

export function countDone(progress: ProgressMap): number {
  return Object.values(progress).filter((p) => p.done).length
}
