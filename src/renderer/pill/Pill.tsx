import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type { Task } from '../../types/task'

/**
 * Formats a Date into the pill's clock display strings.
 *
 * @param now - The date/time to format.
 * @returns `time` as "HH:MM" and `date` as "YYYY/MM/DD".
 */
function formatClock(now: Date): { time: string; date: string } {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return {
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    date: `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`
  }
}

export function Pill(): ReactElement {
  const [tasks, setTasks] = useState<Task[]>([])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    void window.taskAPI.getAll().then(setTasks)
    window.taskAPI.onChanged(setTasks)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const nowTask = tasks.find((task) => task.status === 'now')
  const nextTask = tasks.find((task) => task.status === 'next')
  const hasTasks = Boolean(nowTask || nextTask)

  const handleClick = (): void => {
    window.panelAPI.open()
  }

  const clock = formatClock(now)

  return (
    <div className="flex h-screen w-screen items-center p-2">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-full w-full flex-col justify-center gap-1 rounded-2xl border border-border/50 bg-background/80 px-4 py-2 text-left shadow-lg backdrop-blur-md transition-colors hover:bg-background/90"
      >
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-medium text-foreground">{clock.time}</span>
          <span className="text-xs text-muted-foreground">{clock.date}</span>
        </div>
        <div className="shrink-0 border-t border-border/50" />
        {hasTasks ? (
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="shrink-0 text-xs font-semibold text-emerald-600">Now</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {nowTask?.title ?? '—'}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 pl-4">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Next</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {nextTask?.title ?? '—'}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-center text-sm text-muted-foreground">— No tasks —</span>
        )}
      </button>
    </div>
  )
}
