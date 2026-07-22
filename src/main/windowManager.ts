import { BrowserWindow, app, screen } from 'electron'
import path from 'node:path'
import type { Display, Rectangle } from 'electron'

const PILL_WIDTH = 280
const PILL_HEIGHT = 64
const PILL_MARGIN = 16

const PANEL_WIDTH = 320
const PANEL_HEIGHT = 480

const PILL_DEV_SERVER_URL = 'http://localhost:5173'
const PANEL_DEV_SERVER_URL = 'http://localhost:5174'

let pillWindow: BrowserWindow | null = null
let panelWindow: BrowserWindow | null = null
let hasRegisteredDisplayListeners = false

/**
 * Resolves the compiled preload script shared by both windows.
 * @returns Absolute path to `preload.js` in the build output.
 */
function getPreloadPath(): string {
  return path.join(__dirname, '../preload/preload.js')
}

/**
 * Picks the display the pill/panel pair should be anchored to: the display
 * currently hosting the pill window if one exists, otherwise the primary display.
 * @returns The display whose work area should drive window placement.
 */
function getAnchorDisplay(): Display {
  if (pillWindow && !pillWindow.isDestroyed()) {
    return screen.getDisplayMatching(pillWindow.getBounds())
  }
  return screen.getPrimaryDisplay()
}

/**
 * Computes the pill window's bounds within a display's work area (top-right corner).
 * `workArea` is already expressed in DIP for that specific display, so this is
 * correct regardless of the display's DPI scale factor.
 * @param display - Display to position the pill on.
 * @returns Target bounds for the pill window.
 */
function getPillBounds(display: Display): Rectangle {
  const { x, y, width } = display.workArea
  return {
    x: x + width - PILL_WIDTH - PILL_MARGIN,
    y: y + PILL_MARGIN,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
  }
}

/**
 * Computes the panel window's bounds: right-aligned with and directly below the pill.
 * @param display - Display to position the panel on.
 * @returns Target bounds for the panel window.
 */
function getPanelBounds(display: Display): Rectangle {
  const pillBounds = getPillBounds(display)
  return {
    x: pillBounds.x + PILL_WIDTH - PANEL_WIDTH,
    y: pillBounds.y + PILL_HEIGHT,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
  }
}

/**
 * Re-anchors the pill and panel windows to their target display. Called after
 * monitor topology or DPI scale changes so the windows never end up off-screen
 * or misaligned.
 */
function repositionWindows(): void {
  const display = getAnchorDisplay()
  if (pillWindow && !pillWindow.isDestroyed()) {
    pillWindow.setBounds(getPillBounds(display))
  }
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.setBounds(getPanelBounds(display))
  }
}

/**
 * Subscribes to display topology and DPI scale changes so the windows stay
 * correctly positioned across monitor connects/disconnects and scale-factor
 * changes. Safe to call multiple times; only registers listeners once.
 */
function registerDisplayListeners(): void {
  if (hasRegisteredDisplayListeners) {
    return
  }
  hasRegisteredDisplayListeners = true
  screen.on('display-metrics-changed', repositionWindows)
  screen.on('display-added', repositionWindows)
  screen.on('display-removed', repositionWindows)
}

/**
 * Creates the pill window, or returns the existing instance if one is already open.
 * @returns The pill `BrowserWindow`.
 */
export function createPillWindow(): BrowserWindow {
  if (pillWindow && !pillWindow.isDestroyed()) {
    return pillWindow
  }

  const win = new BrowserWindow({
    ...getPillBounds(screen.getPrimaryDisplay()),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (app.isPackaged) {
    void win.loadFile(path.join(__dirname, '../renderer/pill/index.html'))
  } else {
    void win.loadURL(PILL_DEV_SERVER_URL)
  }

  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    pillWindow = null
  })

  pillWindow = win
  registerDisplayListeners()
  return win
}

/**
 * Creates the panel window (hidden until `showPanelWindow` is called), or returns
 * the existing instance if one is already open.
 * @returns The panel `BrowserWindow`.
 */
export function createPanelWindow(): BrowserWindow {
  if (panelWindow && !panelWindow.isDestroyed()) {
    return panelWindow
  }

  const win = new BrowserWindow({
    ...getPanelBounds(getAnchorDisplay()),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (app.isPackaged) {
    void win.loadFile(path.join(__dirname, '../renderer/panel/index.html'))
  } else {
    void win.loadURL(PANEL_DEV_SERVER_URL)
  }

  win.on('blur', () => win.hide())
  win.on('closed', () => {
    panelWindow = null
  })

  panelWindow = win
  registerDisplayListeners()
  return win
}

/**
 * Returns the pill window instance, or `null` if it has not been created yet.
 */
export function getPillWindow(): BrowserWindow | null {
  return pillWindow
}

/**
 * Returns the panel window instance, or `null` if it has not been created yet.
 */
export function getPanelWindow(): BrowserWindow | null {
  return panelWindow
}

/**
 * Shows the panel window, re-anchoring it to the pill's current display first.
 * Creates the panel window if it does not exist yet.
 */
export function showPanelWindow(): void {
  const win = panelWindow ?? createPanelWindow()
  win.setBounds(getPanelBounds(getAnchorDisplay()))
  win.show()
}

/**
 * Hides the panel window, if it exists.
 */
export function hidePanelWindow(): void {
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.hide()
  }
}
