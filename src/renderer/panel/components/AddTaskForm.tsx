import { useState } from 'react'
import type { ReactElement, SubmitEvent } from 'react'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'

const MAX_TITLE_LENGTH = 200

export function AddTaskForm(): ReactElement {
  const [title, setTitle] = useState('')

  /**
   * Submits the trimmed task title via the task API and resets the input.
   * Ignores submission when the trimmed title is empty.
   */
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    void window.taskAPI.add(trimmed)
    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border/50 p-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a new task..."
        maxLength={MAX_TITLE_LENGTH}
        aria-label="New task title"
      />
      <Button type="submit" size="sm" disabled={!title.trim()}>
        Add
      </Button>
    </form>
  )
}
