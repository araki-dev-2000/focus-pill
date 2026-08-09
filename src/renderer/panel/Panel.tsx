import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Button } from '@shared/components/ui/button'
import { ScrollArea } from '@shared/components/ui/scroll-area'
import { AddTaskForm } from './components/AddTaskForm'
import { CompletedSection } from './components/CompletedSection'
import { TaskList } from './components/TaskList'
import type { Task } from '../../types/task'

/**
 * Root component for the panel window: task list, completed section, and add-task form.
 */
export function Panel(): ReactElement {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    void window.taskAPI.getAll().then(setTasks)
    window.taskAPI.onChanged(setTasks)
  }, [])

  const activeTasks = tasks
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => a.order - b.order)
  const completedTasks = tasks.filter((task) => task.status === 'completed')

  /**
   * Hides the panel window via the main process.
   */
  const handleClose = (): void => {
    window.panelAPI.close()
  }

  return (
    <div className="flex h-screen w-screen p-2">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/90 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <span className="text-sm font-semibold">Task List</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label="Close panel"
            onClick={handleClose}
          >
            ×
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <TaskList tasks={activeTasks} />
          <CompletedSection tasks={completedTasks} />
        </ScrollArea>
        <AddTaskForm />
      </div>
    </div>
  )
}
