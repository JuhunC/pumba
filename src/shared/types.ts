export type JsonSchema = Record<string, unknown>

export interface SchemaResponse {
  schema: JsonSchema
  uiSchema?: Record<string, unknown>
  title?: string
}

export interface UploadTargetResponse {
  endpoint: string
  region: string
  bucket: string
  keyPrefix?: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  forcePathStyle?: boolean
  copyTarget?: {
    bucket?: string
    keyPrefix?: string
  }
}

export interface ZipResult {
  zipPath: string
  sizeBytes: number
}

export interface UploadResult {
  bucket: string
  key: string
  eTag?: string
}

export interface TriggerRequest {
  inputFormat: 'json' | 'yaml'
  inputPayload: string
  upload: {
    bucket: string
    key: string
  }
  extra?: Record<string, unknown>
}

export interface TriggerResponse {
  status: number
  body: unknown
}
