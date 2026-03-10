import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, resolve } from 'path'
import { stat } from 'fs/promises'
import os from 'os'
import archiver from 'archiver'
import { createReadStream, createWriteStream } from 'fs'
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type {
  SchemaResponse,
  UploadTargetResponse,
  ZipResult,
  UploadResult,
  TriggerRequest,
  TriggerResponse
} from '../shared/types'
import { defaultConfig, type RuntimeConfig } from '../shared/config'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

const isDev = !!process.env.VITE_DEV_SERVER_URL

const configPath = join(app.getPath('userData'), 'runtime-config.json')

const loadConfig = async (): Promise<RuntimeConfig> => {
  if (!existsSync(configPath)) return defaultConfig
  const raw = await readFile(configPath, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<RuntimeConfig>
  return { ...defaultConfig, ...parsed }
}

const saveConfig = async (config: RuntimeConfig): Promise<void> => {
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

const buildAuthHeaders = (config: RuntimeConfig): Record<string, string> => {
  if (!config.bearerToken) return {}
  return { Authorization: `Bearer ${config.bearerToken}` }
}

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  win.once('ready-to-show', () => win.show())

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(resolve(__dirname, '../renderer/index.html'))
  }
}

const fetchJson = async <T>(url: string, config: RuntimeConfig): Promise<T> => {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...buildAuthHeaders(config) } })
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

const zipDirectory = async (directoryPath: string): Promise<ZipResult> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const zipPath = join(os.tmpdir(), `schema-app-${timestamp}.zip`)

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const archive = archiver('zip', { zlib: { level: 9 } })
    const outputStream = createWriteStream(zipPath)

    outputStream.on('close', () => resolvePromise())
    outputStream.on('error', (err: Error) => rejectPromise(err))
    archive.on('error', (err: Error) => rejectPromise(err))

    archive.pipe(outputStream)
    archive.directory(directoryPath, false)
    archive.finalize()
  })

  const info = await stat(zipPath)
  return { zipPath, sizeBytes: info.size }
}

const buildS3Client = (config: UploadTargetResponse): S3Client => {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle ?? true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken
    }
  })
}

const uploadZip = async (config: UploadTargetResponse, zipPath: string): Promise<UploadResult> => {
  const client = buildS3Client(config)
  const normalizedPrefix = (config.keyPrefix ?? '').replace(/\\/+$/, '')
  const key = `${normalizedPrefix}${normalizedPrefix ? '/' : ''}${new Date().toISOString().replace(/[:.]/g, '-')}.zip`

  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucket,
      Key: key,
      Body: createReadStream(zipPath)
    }
  })

  const result = await upload.done()

  return {
    bucket: config.bucket,
    key,
    eTag: 'ETag' in result ? (result.ETag as string | undefined) : undefined
  }
}

const copyIfNeeded = async (
  config: UploadTargetResponse,
  source: UploadResult
): Promise<UploadResult | null> => {
  if (!config.copyTarget?.bucket && !config.copyTarget?.keyPrefix) {
    return null
  }

  const client = buildS3Client(config)
  const targetBucket = config.copyTarget.bucket ?? config.bucket
  const targetKeyPrefix = (config.copyTarget.keyPrefix ?? '').replace(/\\/+$/, '')
  const targetKey = `${targetKeyPrefix}${targetKeyPrefix ? '/' : ''}${source.key.split('/').pop()}`

  const copySource = `/${source.bucket}/${source.key}`
  const result = await client.send(
    new CopyObjectCommand({
      Bucket: targetBucket,
      Key: targetKey,
      CopySource: copySource
    })
  )

  return {
    bucket: targetBucket,
    key: targetKey,
    eTag: result.CopyObjectResult?.ETag
  }
}

const triggerApi = async (config: RuntimeConfig, payload: TriggerRequest): Promise<TriggerResponse> => {
  const res = await fetch(config.triggerApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...buildAuthHeaders(config)
    },
    body: JSON.stringify(payload)
  })

  const contentType = res.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json') ? await res.json() : await res.text()

  return { status: res.status, body }
}

app.whenReady().then(async () => {
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('schema:get', async (): Promise<SchemaResponse> => {
  const config = await loadConfig()
  const url = `${config.serverABaseUrl}${config.schemaPath}`
  return fetchJson<SchemaResponse>(url, config)
})

ipcMain.handle('uploadTarget:get', async (): Promise<UploadTargetResponse> => {
  const config = await loadConfig()
  const url = `${config.serverABaseUrl}${config.uploadTargetPath}`
  return fetchJson<UploadTargetResponse>(url, config)
})

ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'dontAddToRecent']
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('zip:create', async (_event, directoryPath: string): Promise<ZipResult> => {
  return zipDirectory(directoryPath)
})

ipcMain.handle('s3:uploadZip', async (_event, config: UploadTargetResponse, zipPath: string): Promise<UploadResult> => {
  return uploadZip(config, zipPath)
})

ipcMain.handle('s3:copyIfNeeded', async (_event, config: UploadTargetResponse, source: UploadResult): Promise<UploadResult | null> => {
  return copyIfNeeded(config, source)
})

ipcMain.handle('trigger:api', async (_event, payload: TriggerRequest): Promise<TriggerResponse> => {
  const config = await loadConfig()
  return triggerApi(config, payload)
})

ipcMain.handle('config:get', async (): Promise<RuntimeConfig> => loadConfig())
ipcMain.handle('config:set', async (_event, config: RuntimeConfig): Promise<void> => saveConfig(config))
