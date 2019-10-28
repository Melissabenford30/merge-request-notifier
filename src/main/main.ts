import { app, BrowserWindow, Tray, ipcMain, Menu, MenuItemConstructorOptions, systemPreferences, nativeTheme } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as url from 'url'

let tray: Tray | null
let win: BrowserWindow | null

const WINDOW_WIDTH = 380
const WINDOW_HEIGHT = 460

let TEST_MODE = false

const installExtensions = async () => {
    const installer = require('electron-devtools-installer')
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS
    const extensions = ['REACT_DEVELOPER_TOOLS']

    return Promise.all(extensions.map(name => installer.default(installer[name], forceDownload))).catch(console.log)
}

const getTrayImage = () => {
    const icon = nativeTheme.shouldUseDarkColors ? 'icon-dark-mode.png' : 'icon.png'

    return path.join(__dirname, 'assets', icon)
}

const createTray = () => {
    tray = new Tray(getTrayImage())

    tray.setToolTip('Merge Request Notifier')
    tray.on('click', toggleWindow)
}

const toggleWindow = () => {
    win && win.isVisible() ? hideWindow() : showWindow()
}

const getWindowPosition = () => {
    if (!win || !tray) {
        return undefined
    }

    const windowBounds = win.getBounds()
    const trayBounds = tray.getBounds()

    const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
    const y = Math.round(trayBounds.y + trayBounds.height + 4)

    return { x, y }
}

const setup = async () => {
    try {
        if (process.env.NODE_ENV !== 'production') {
            await installExtensions()
        } else {
            autoUpdater.checkForUpdatesAndNotify()
        }

        createTray()
        createWindow()
        createMenu()
    } catch (error) {
        console.error('could not start the app', error)
    }
}

const hideWindow = () => {
    if (win && win.isVisible()) {
        win.hide()
        if (app.dock) {
            app.dock.hide()
        }
    }
}

const showWindow = () => {
    const position = getWindowPosition()

    if (position && win) {
        if (app.dock) {
            app.dock.show()
        }

        // We have to wait a bit because the dock.show() is triggering a "window.hide" event
        // otherwise the app would be closed immediately
        setTimeout(() => {
            win!.setPosition(position.x, position.y, false)
            win!.show()
        }, 200)
    }
}

const createMenu = () => {
    const devMenuTemplate: MenuItemConstructorOptions[] =
        process.env.NODE_ENV === 'production'
            ? []
            : [
                  { type: 'separator' },
                  {
                      label: 'Toggle DevTools',
                      click: () => {
                          if (win) {
                              if (win.webContents.isDevToolsOpened()) {
                                  win.webContents.closeDevTools()
                                  win.setSize(WINDOW_WIDTH, WINDOW_HEIGHT)
                              } else {
                                  win.webContents.openDevTools()
                                  win.setSize(WINDOW_WIDTH * 3, WINDOW_HEIGHT * 2)
                              }
                          }
                      },
                  },
                  {
                      label: 'Toggle Test Mode',
                      click: () => {
                          if (win) {
                              if (TEST_MODE) {
                                  win.loadURL('http://localhost:2003')
                              } else {
                                  win.loadURL('http://localhost:2003?test')
                              }

                              TEST_MODE = !TEST_MODE
                          }
                      },
                  },
              ]

    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: 'Application',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => {
                        app.quit()
                    },
                },
                ...devMenuTemplate,
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
            ],
        },
    ]

    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}

const createWindow = () => {
    win = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        show: false,
        frame: false,
        fullscreenable: false,
        resizable: false,
        transparent: false,
        webPreferences: {
            backgroundThrottling: false,
            nodeIntegration: true,
        },
    })

    if (process.env.NODE_ENV !== 'production') {
        process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'
        win.loadURL(`http://localhost:2003`)
    } else {
        win.loadURL(
            url.format({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file:',
                slashes: true,
            }),
        )
    }

    win.on('closed', () => {
        win = null
    })

    win.on('blur', () => {
        if (!TEST_MODE) {
            hideWindow()
        }
    })
}

if (app.dock) {
    app.dock.hide()
}

app.on('ready', setup)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', async () => {
    if (win === null) {
        await createWindow()
    }
})

ipcMain.on('update-open-merge-requests', (_: any, openMergeRequests: number) => {
    if (tray) {
        if (openMergeRequests === 0) {
            tray.setTitle('')
        } else {
            tray.setTitle(String(openMergeRequests))
        }
    }
})

ipcMain.on('close-application', () => {
    app.quit()
})

systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', () => {
    if (tray) {
        tray.setImage(getTrayImage())
    }
})
