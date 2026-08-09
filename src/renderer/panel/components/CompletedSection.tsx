import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { TaskItem } from './TaskItem'
import type { Task } from '../../../types/task'

interface CompletedSectionProps {
  tasks: Task[]
}

export function CompletedSection({ tasks }: CompletedSectionProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    /**
     * Collapses the completed section when the panel becomes visible again.
     */
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        setIsOpen(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return (
    <div className="border-t border-border/50">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-1 px-2 py-2 text-left text-sm text-muted-foreground"
      >
        <span>{isOpen ? '▼' : '▶'}</span>
        <span>Completed ({tasks.length})</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {tasks.length === 0 ? (
            <p className="px-2 py-2 text-center text-sm text-muted-foreground">No completed tasks</p>
          ) : (
            tasks.map((task) => <TaskItem key={task.id} task={task} variant="completed" />)
          )}
        </div>
      )}
    </div>
  )
}
