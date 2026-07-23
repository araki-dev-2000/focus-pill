import type { PanelAPI } from '../preload/preload'
import type { TaskAPI } from './task'

declare global {
  interface Window {
    taskAPI: TaskAPI
    panelAPI: PanelAPI
  }
}

export {}
