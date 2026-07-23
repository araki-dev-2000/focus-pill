import { app } from 'electron'

/**
 * Returns whether FocusPill is currently registered to launch automatically at login.
 */
export function isLaunchAtLoginEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

/**
 * Registers or unregisters FocusPill as a login item.
 * @param enabled - Whether FocusPill should launch automatically at login.
 */
export function setLaunchAtLogin(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
  })
}
