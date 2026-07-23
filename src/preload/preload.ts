import { contextBridge, ipcRenderer } from 'electron'
import type { Task, TaskAPI } from '../types/task'

const taskAPI: TaskAPI = {
  getAll: () => ipcRenderer.invoke('tasks:getAll'),
  add: (title) => ipcRenderer.invoke('tasks:add', title),
  update: (id, patch) => ipcRenderer.invoke('tasks:update', id, patch),
  delete: (id) => ipcRenderer.invoke('tasks:delete', id),
  reorder: (ids) => ipcRenderer.invoke('tasks:reorder', ids),
  onChanged: (cb) => {
    ipcRenderer.on('tasks:changed', (_event, tasks: Task[]) => cb(tasks))
  },
}

const panelAPI = {
  open: () => ipcRenderer.send('panel:open'),
  close: () => ipcRenderer.send('panel:close'),
}

contextBridge.exposeInMainWorld('taskAPI', taskAPI)
contextBridge.exposeInMainWorld('panelAPI', panelAPI)

export type PanelAPI = typeof panelAPI
