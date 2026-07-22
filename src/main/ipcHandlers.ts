import { ipcMain } from 'electron'
import { addTask, deleteTask, getAllTasks, reorderTasks, updateTask } from './taskStore'
import { getPanelWindow, getPillWindow, hidePanelWindow, showPanelWindow } from './windowManager'
import type { Task, TaskUpdatePatch } from '../types/task'

/**
 * Sends the current task list to every renderer window (pill and panel) that is
 * currently open, so both stay in sync after any mutation.
 * @param tasks - Full task list to broadcast.
 */
function broadcastTasks(tasks: Task[]): void {
  for (const win of [getPillWindow(), getPanelWindow()]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('tasks:changed', tasks)
    }
  }
}

/**
 * Registers all `ipcMain` handlers for the task CRUD channels and the panel
 * open/close channels. Must be called once during app startup, after the pill
 * and panel windows have been created.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle('tasks:getAll', () => getAllTasks())

  ipcMain.handle('tasks:add', (_event, title: string) => {
    const tasks = addTask(title)
    broadcastTasks(tasks)
    return tasks
  })

  ipcMain.handle('tasks:update', (_event, id: string, patch: TaskUpdatePatch) => {
    const tasks = updateTask(id, patch)
    broadcastTasks(tasks)
    return tasks
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    const tasks = deleteTask(id)
    broadcastTasks(tasks)
    return tasks
  })

  ipcMain.handle('tasks:reorder', (_event, ids: string[]) => {
    const tasks = reorderTasks(ids)
    broadcastTasks(tasks)
    return tasks
  })

  ipcMain.on('panel:open', () => showPanelWindow())
  ipcMain.on('panel:close', () => hidePanelWindow())
}
