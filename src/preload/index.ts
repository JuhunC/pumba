import { contextBridge, ipcRenderer } from 'electron'
import type {
  SchemaResponse,
  UploadTargetResponse,
  ZipResult,
  UploadResult,
  TriggerRequest,
  TriggerResponse
} from '../shared/types'
import type { RuntimeConfig } from '../shared/config'

const api = {
  getSchema: (): Promise<SchemaResponse> => ipcRenderer.invoke('schema:get'),
  getUploadTarget: (): Promise<UploadTargetResponse> => ipcRenderer.invoke('uploadTarget:get'),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectDirectory'),
  createZip: (directoryPath: string): Promise<ZipResult> => ipcRenderer.invoke('zip:create', directoryPath),
  uploadZip: (config: UploadTargetResponse, zipPath: string): Promise<UploadResult> =>
    ipcRenderer.invoke('s3:uploadZip', config, zipPath),
  copyIfNeeded: (config: UploadTargetResponse, source: UploadResult): Promise<UploadResult | null> =>
    ipcRenderer.invoke('s3:copyIfNeeded', config, source),
  triggerApi: (payload: TriggerRequest): Promise<TriggerResponse> => ipcRenderer.invoke('trigger:api', payload),
  getConfig: (): Promise<RuntimeConfig> => ipcRenderer.invoke('config:get'),
  setConfig: (config: RuntimeConfig): Promise<void> => ipcRenderer.invoke('config:set', config)
}

contextBridge.exposeInMainWorld('appApi', api)

export type AppApi = typeof api
