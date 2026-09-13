import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react'
import type { Task } from '../../types/task'

const DRAG_THRESHOLD_PX = 4

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

/**
 * The pill's root component: shows the current/next task and clock, opens the
 * panel on click, and lets the pill window be dragged to a new screen position.
 */
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

  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)

  /**
   * Tracks an in-progress drag: once the cursor has moved past the drag
   * threshold from its mousedown origin, forwards the offset to the main
   * process to reposition the pill window.
   * @param event - The window-level `mousemove` event.
   */
  const handleMouseMove = (event: MouseEvent): void => {
    const origin = dragOriginRef.current
    if (!origin) {
      return
    }
    const deltaX = event.screenX - origin.x
    const deltaY = event.screenY - origin.y
    if (!didDragRef.current && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
      return
    }
    didDragRef.current = true
    window.pillAPI.dragMove(deltaX, deltaY)
  }

  /**
   * Ends the current drag gesture, if any, and removes the window-level
   * listeners registered by `handleMouseDown`.
   */
  const handleMouseUp = (): void => {
    dragOriginRef.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    window.pillAPI.dragEnd()
  }

  /**
   * Starts tracking a potential drag from a left-button press on the pill,
   * recording the press position and registering window-level move/up listeners.
   * @param event - The button's `mousedown` event.
   */
  const handleMouseDown = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return
    }
    dragOriginRef.current = { x: event.screenX, y: event.screenY }
    didDragRef.current = false
    window.pillAPI.dragStart()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  /**
   * Opens the panel when the pill is clicked, unless the click was the
   * tail end of a drag gesture.
   */
  const handleClick = (): void => {
    if (didDragRef.current) {
      return
    }
    window.panelAPI.open()
  }

  const clock = formatClock(now)

  return (
    <div className="flex h-screen w-screen items-center p-2">
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="flex h-full w-full items-center gap-3 rounded-2xl border border-border/50 bg-background/80 px-4 py-2 text-left shadow-lg backdrop-blur-md transition-colors hover:bg-background/90"
      >
        {hasTasks ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
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
          <span className="min-w-0 flex-1 text-center text-sm text-muted-foreground">— No tasks —</span>
        )}
        <div className="h-full shrink-0 border-l border-border/50" />
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-medium text-foreground">{clock.time}</span>
          <span className="text-xs text-muted-foreground">{clock.date}</span>
        </div>
      </button>
    </div>
  )
}
