import type { ReactElement } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { TaskItem } from './TaskItem'
import type { Task } from '../../../types/task'

interface TaskListProps {
  tasks: Task[]
}

/**
 * Returns a copy of `items` with the element at `from` moved to `to`.
 * @param items - Source array (not mutated).
 * @param from - Index of the element to move.
 * @param to - Destination index for the element.
 * @returns A new array reflecting the move.
 */
function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Renders the active (now/next/standby) tasks with drag-and-drop reordering.
 * @param tasks - Active tasks in display order.
 */
export function TaskList({ tasks }: TaskListProps): ReactElement {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  /**
   * Reorders tasks after a drag completes, sending the new id sequence to the main process.
   * @param event - dnd-kit drag-end event carrying the dragged and drop-target ids.
   */
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const fromIndex = tasks.findIndex((task) => task.id === active.id)
    const toIndex = tasks.findIndex((task) => task.id === over.id)
    if (fromIndex === -1 || toIndex === -1) {
      return
    }
    const nextTasks = arrayMove(tasks, fromIndex, toIndex)
    void window.taskAPI.reorder(nextTasks.map((task) => task.id))
  }

  if (tasks.length === 0) {
    return <p className="px-2 py-4 text-center text-sm text-muted-foreground">No tasks yet</p>
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-0.5 p-2">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} variant="active" />
        ))}
      </div>
    </DndContext>
  )
}
