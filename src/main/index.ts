import { app } from 'electron'
import { registerIpcHandlers } from './ipcHandlers'
import { createPillWindow, getPillWindow } from './windowManager'

/**
 * Focuses the pill window when a second app instance is launched, instead of
 * allowing a duplicate instance to start.
 */
function focusPillWindow(): void {
  const pillWindow = getPillWindow()
  if (!pillWindow || pillWindow.isDestroyed()) {
    return
  }
  if (pillWindow.isMinimized()) {
    pillWindow.restore()
  }
  pillWindow.focus()
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', focusPillWindow)
  app.on('window-all-closed', () => app.quit())

  void app.whenReady().then(() => {
    registerIpcHandlers()
    createPillWindow()
  })
}
