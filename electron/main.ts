import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { databaseService } from './services/database/database-service'
import { configService } from './services/config/config-service'
import { registerProjectHandlers } from './handlers/project-handlers'
import { registerTranscriptionHandlers } from './handlers/transcription-handlers'
import { registerFileHandlers } from './handlers/file-handlers'
import { registerExportHandlers } from './handlers/export-handlers'
import { registerSettingsHandlers } from './handlers/settings-handlers'
import { registerSpeakerHandlers } from './handlers/speaker-handlers'
import { registerDictionaryHandlers } from './handlers/dictionary-handlers'

// Disable GPU acceleration for better stability
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  })

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize database
  try {
    databaseService.initialize()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    dialog.showErrorBox(
      'Database Error',
      'Failed to initialize database. The application will now quit.\n\n' +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    )
    app.quit()
    return
  }

  // Initialize config service
  try {
    configService.initialize()
    console.log('Config service initialized successfully')
  } catch (error) {
    console.error('Failed to initialize config service:', error)
  }

  // Register IPC handlers
  registerProjectHandlers()
  registerTranscriptionHandlers()
  registerFileHandlers()
  registerExportHandlers()
  registerSettingsHandlers()
  registerSpeakerHandlers()
  registerDictionaryHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  // Close database connection on quit
  databaseService.close()
})

// IPC handlers will be registered here
// Example:
ipcMain.handle('ping', () => 'pong')
