export interface RuntimeConfig {
  serverABaseUrl: string
  schemaPath: string
  uploadTargetPath: string
  triggerApiUrl: string
  bearerToken?: string
}

export const defaultConfig: RuntimeConfig = {
  serverABaseUrl: 'http://localhost:8080',
  schemaPath: '/schema',
  uploadTargetPath: '/upload-target',
  triggerApiUrl: 'http://localhost:8080/trigger'
}
