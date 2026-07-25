import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type { Task } from '../../types/task'

export function Pill(): ReactElement {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    void window.taskAPI.getAll().then(setTasks)
    window.taskAPI.onChanged(setTasks)
  }, [])

  const nowTask = tasks.find((task) => task.status === 'now')
  const nextTask = tasks.find((task) => task.status === 'next')
  const hasTasks = Boolean(nowTask || nextTask)

  const handleClick = (): void => {
    window.panelAPI.open()
  }

  return (
    <div className="flex h-screen w-screen items-center p-2">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-full w-full items-center rounded-2xl border border-border/50 bg-background/80 px-4 text-left shadow-lg backdrop-blur-md transition-colors hover:bg-background/90"
      >
        {hasTasks ? (
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
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
          <span className="flex-1 text-center text-sm text-muted-foreground">— No tasks —</span>
        )}
      </button>
    </div>
  )
}
