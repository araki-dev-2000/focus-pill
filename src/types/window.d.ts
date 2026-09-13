import type { PanelAPI, PillAPI } from '../preload/preload'
import type { TaskAPI } from './task'

declare global {
  interface Window {
    taskAPI: TaskAPI
    panelAPI: PanelAPI
    pillAPI: PillAPI
  }
}

export {}
