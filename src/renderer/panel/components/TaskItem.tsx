import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { cn } from '@shared/lib/utils'
import type { RestoreTarget, Task } from '../../../types/task'

const MAX_TITLE_LENGTH = 200

const RESTORE_OPTIONS: Array<{ target: RestoreTarget; label: string }> = [
  { target: 'now', label: 'Set as Now' },
  { target: 'next', label: 'Set as Next' },
  { target: 'standby', label: 'Standby' },
]

interface TaskItemProps {
  task: Task
  variant: 'active' | 'completed'
}

/**
 * Renders a single task row: drag handle, complete/edit controls, and delete for
 * active tasks; a restore popover and delete for completed tasks.
 * @param task - Task to render.
 * @param variant - `'active'` for now/next/standby rows, `'completed'` for the completed section.
 */
export function TaskItem({ task, variant }: TaskItemProps): ReactElement {
  const isActive = variant === 'active'
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [isRestoreMenuOpen, setIsRestoreMenuOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const restoreMenuRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id, disabled: !isActive })
  const { setNodeRef: setDroppableRef } = useDroppable({ id: task.id, disabled: !isActive })

  /**
   * Attaches the row's DOM node to both the draggable and droppable dnd-kit refs.
   * @param node - The row's root DOM element, or `null` on unmount.
   */
  const setNodeRef = (node: HTMLDivElement | null): void => {
    setDraggableRef(node)
    setDroppableRef(node)
  }

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  useEffect(() => {
    if (!isRestoreMenuOpen) {
      return
    }
    /**
     * Closes the restore popover when a pointer-down happens outside of it.
     * @param event - The document-level mousedown event.
     */
    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target
      if (restoreMenuRef.current && target instanceof Node && !restoreMenuRef.current.contains(target)) {
        setIsRestoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isRestoreMenuOpen])

  /**
   * Enters edit mode, seeding the draft title with the task's current title.
   */
  const startEdit = (): void => {
    setDraftTitle(task.title)
    setIsEditing(true)
  }

  /**
   * Exits edit mode, persisting the draft title if it changed and isn't empty.
   */
  const commitEdit = (): void => {
    const trimmed = draftTitle.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== task.title) {
      void window.taskAPI.update(task.id, { title: trimmed })
    }
  }

  /**
   * Commits the edit on Enter, discards it on Escape.
   * @param event - Keydown event from the title input.
   */
  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      commitEdit()
    } else if (event.key === 'Escape') {
      setIsEditing(false)
    }
  }

  /**
   * Marks the task as completed.
   */
  const handleComplete = (): void => {
    void window.taskAPI.update(task.id, { status: 'completed' })
  }

  /**
   * Opens the delete confirmation modal.
   */
  const handleDeleteClick = (): void => {
    setIsDeleteAlertOpen(true)
  }

  /**
   * Confirms deletion, removing the task and closing the modal.
   */
  const confirmDelete = (): void => {
    void window.taskAPI.delete(task.id)
    setIsDeleteAlertOpen(false)
  }

  /**
   * Restores a completed task to the given position and closes the restore popover.
   * @param target - Destination position (`'now'` / `'next'` / `'standby'`).
   */
  const handleRestore = (target: RestoreTarget): void => {
    void window.taskAPI.update(task.id, { status: target })
    setIsRestoreMenuOpen(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-center gap-2 rounded-md px-2 py-1.5', isDragging && 'opacity-50')}
    >
      {isActive && (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
      )}

      {task.status === 'now' && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}

      {isEditing ? (
        <Input
          autoFocus
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          maxLength={MAX_TITLE_LENGTH}
          className="h-7 max-w-28 min-w-0 flex-1"
        />
      ) : (
        <span title={task.title} className="max-w-28 min-w-0 flex-1 truncate text-sm">
          {task.title}
        </span>
      )}

      {isActive ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-auto h-7 w-7"
            aria-label="Complete task"
            onClick={handleComplete}
          >
            ✓
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Edit task"
            onClick={startEdit}
          >
            ✏
          </Button>
        </>
      ) : (
        <div ref={restoreMenuRef} className="relative ml-auto">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Restore task"
            onClick={() => setIsRestoreMenuOpen((open) => !open)}
          >
            ↩
          </Button>
          {isRestoreMenuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-32 rounded-md border border-border bg-popover p-1 shadow-md">
              {RESTORE_OPTIONS.map((option) => (
                <button
                  key={option.target}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  onClick={() => handleRestore(option.target)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-destructive"
        aria-label="Delete task"
        onClick={handleDeleteClick}
      >
        🗑
      </Button>

      {isDeleteAlertOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-md border border-border bg-popover p-4 shadow-md">
            <p className="text-sm">
              Delete &ldquo;<span className="font-medium">{task.title}</span>&rdquo;?
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsDeleteAlertOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
