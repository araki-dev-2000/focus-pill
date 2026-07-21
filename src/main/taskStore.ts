import { randomUUID } from 'node:crypto'
import Store from 'electron-store'
import type { RestoreTarget, StoreSchema, Task, TaskStatus, TaskUpdatePatch } from '../types/task'

const MAX_TITLE_LENGTH = 200

const store = new Store<StoreSchema>({
  defaults: { tasks: [] },
  schema: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['now', 'next', 'standby', 'completed'] },
          order: { type: 'number' },
          createdAt: { type: 'string' },
        },
        required: ['id', 'title', 'status', 'order', 'createdAt'],
      },
    },
  },
})

/**
 * Trims a task title and validates it against the empty/length rules.
 * @param title - Raw task title as entered by the user.
 * @returns The trimmed, validated title.
 */
function normalizeTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Task title must not be empty.')
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`Task title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
  }
  return trimmed
}

/**
 * Finds a task by id, throwing if it does not exist in the store.
 * @param tasks - Task list to search.
 * @param id - Id of the task to find.
 * @returns The matching task.
 */
function requireTask(tasks: Task[], id: string): Task {
  const task = tasks.find((t) => t.id === id)
  if (!task) {
    throw new Error(`Task not found: ${id}`)
  }
  return task
}

/**
 * Maps an active task's position index to its status.
 * @param index - 0-based position within the active list.
 * @returns `'now'` for index 0, `'next'` for index 1, otherwise `'standby'`.
 */
function deriveStatus(index: number): Exclude<TaskStatus, 'completed'> {
  if (index === 0) return 'now'
  if (index === 1) return 'next'
  return 'standby'
}

/**
 * Returns active tasks (now/next/standby) sorted by their shared position order.
 * @param tasks - Full task list.
 * @returns Active tasks sorted ascending by `order`.
 */
function getActiveSorted(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'completed').sort((a, b) => a.order - b.order)
}

/**
 * Returns completed tasks.
 * @param tasks - Full task list.
 * @returns Tasks whose status is `'completed'`.
 */
function getCompleted(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === 'completed')
}

/**
 * Reassigns order (0-based position) and the derived status for every task in an active list.
 * @param active - Active tasks in their intended display order.
 * @returns New task objects with `order`/`status` set to match their position.
 */
function renumberActive(active: Task[]): Task[] {
  return active.map((task, index) => ({ ...task, order: index, status: deriveStatus(index) }))
}

/**
 * Concatenates an active list and a completed list back into one task array.
 * @param active - Active (now/next/standby) tasks.
 * @param completed - Completed tasks.
 * @returns The combined task list.
 */
function combine(active: Task[], completed: Task[]): Task[] {
  return [...active, ...completed]
}

/**
 * Reads the current task list from the store.
 * @returns All persisted tasks.
 */
function readTasks(): Task[] {
  return store.get('tasks')
}

/**
 * Persists a task list to the store.
 * @param tasks - Task list to save.
 * @returns The same task list, for chaining.
 */
function writeTasks(tasks: Task[]): Task[] {
  store.set('tasks', tasks)
  return tasks
}

/**
 * Determines where a task should be spliced into the active list for a given target status.
 * @param target - Destination position (`'now'` / `'next'` / `'standby'`).
 * @param activeCount - Number of active tasks excluding the one being moved.
 * @returns The 0-based index to insert the task at.
 */
function getInsertIndex(target: RestoreTarget, activeCount: number): number {
  switch (target) {
    case 'now':
      return 0
    case 'next':
      return Math.min(1, activeCount)
    case 'standby':
      return activeCount
  }
}

/**
 * Moves a task into the now/next/standby position, promoting/demoting the rest of the active list,
 * or marks it completed.
 * @param tasks - Full task list.
 * @param task - Task to transition (with any other pending field updates already applied).
 * @param newStatus - Status to move the task to.
 * @returns The full task list after the transition.
 */
function applyStatusChange(tasks: Task[], task: Task, newStatus: TaskStatus): Task[] {
  const rest = tasks.filter((t) => t.id !== task.id)
  const completed = getCompleted(rest)
  const active = getActiveSorted(rest)

  if (newStatus === 'completed') {
    return combine(renumberActive(active), [...completed, { ...task, status: 'completed' }])
  }

  const insertIndex = getInsertIndex(newStatus, active.length)
  const nextActive = [...active]
  nextActive.splice(insertIndex, 0, task)
  return combine(renumberActive(nextActive), completed)
}

/**
 * Returns every task in the store.
 * @returns All persisted tasks.
 */
export function getAllTasks(): Task[] {
  return readTasks()
}

/**
 * Adds a new standby task at the end of the active list.
 * @param title - Title for the new task (validated and trimmed).
 * @returns The full task list after the addition.
 */
export function addTask(title: string): Task[] {
  const tasks = readTasks()
  const active = getActiveSorted(tasks)
  const completed = getCompleted(tasks)
  const newTask: Task = {
    id: randomUUID(),
    title: normalizeTitle(title),
    status: 'standby',
    order: active.length,
    createdAt: new Date().toISOString(),
  }
  return writeTasks(combine(renumberActive([...active, newTask]), completed))
}

/**
 * Updates a task's title and/or status, applying now/next/standby/completed transitions as needed.
 * @param id - Id of the task to update.
 * @param patch - Partial fields to update.
 * @returns The full task list after the update.
 */
export function updateTask(id: string, patch: TaskUpdatePatch): Task[] {
  const tasks = readTasks()
  const task = requireTask(tasks, id)
  const updated: Task = patch.title !== undefined ? { ...task, title: normalizeTitle(patch.title) } : task

  if (patch.status !== undefined && patch.status !== task.status) {
    return writeTasks(applyStatusChange(tasks, updated, patch.status))
  }
  return writeTasks(tasks.map((t) => (t.id === id ? updated : t)))
}

/**
 * Restores a completed task to the given target position.
 * @param id - Id of the completed task to restore.
 * @param target - Destination position (`'now'` / `'next'` / `'standby'`).
 * @returns The full task list after the restore.
 */
export function restoreTask(id: string, target: RestoreTarget): Task[] {
  return updateTask(id, { status: target })
}

/**
 * Deletes a task, promoting/renumbering the remaining active tasks.
 * @param id - Id of the task to delete.
 * @returns The full task list after the deletion.
 */
export function deleteTask(id: string): Task[] {
  const tasks = readTasks()
  requireTask(tasks, id)
  const rest = tasks.filter((t) => t.id !== id)
  return writeTasks(combine(renumberActive(getActiveSorted(rest)), getCompleted(rest)))
}

/**
 * Reorders the active tasks to match the given id sequence (drag & drop), deriving now/next/standby from position.
 * @param ids - Active task ids in their new display order, without duplicates; must exactly match the current active task set.
 * @returns The full task list after reordering.
 */
export function reorderTasks(ids: string[]): Task[] {
  const tasks = readTasks()
  const active = getActiveSorted(tasks)
  const completed = getCompleted(tasks)
  const activeById = new Map(active.map((t) => [t.id, t]))
  const uniqueIds = new Set(ids)

  if (
    ids.length !== activeById.size ||
    uniqueIds.size !== ids.length ||
    ids.some((id) => !activeById.has(id))
  ) {
    throw new Error('reorderTasks ids must exactly match the current active task ids, without duplicates.')
  }

  const nextActive = ids.map((id) => activeById.get(id)!)
  return writeTasks(combine(renumberActive(nextActive), completed))
}
