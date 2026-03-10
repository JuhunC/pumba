import React, { useMemo, useState } from 'react'
import type { UploadResult, UploadTargetResponse } from '../../../shared/types'

interface UploadPanelProps {
  inputFormat: 'json' | 'yaml'
  jsonOutput: string
  yamlOutput: string
  uploadResult: UploadResult | null
  copyResult: UploadResult | null
  onUploadComplete: (result: UploadResult) => void
  onCopyComplete: (result: UploadResult | null) => void
}

const UploadPanel: React.FC<UploadPanelProps> = ({
  inputFormat,
  jsonOutput,
  yamlOutput,
  uploadResult,
  copyResult,
  onUploadComplete,
  onCopyComplete
}) => {
  const [directoryPath, setDirectoryPath] = useState<string | null>(null)
  const [zipPath, setZipPath] = useState<string | null>(null)
  const [zipSize, setZipSize] = useState<number | null>(null)
  const [uploadConfig, setUploadConfig] = useState<UploadTargetResponse | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const payload = useMemo(() => (inputFormat === 'json' ? jsonOutput : yamlOutput), [inputFormat, jsonOutput, yamlOutput])

  const appendLog = (message: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} ${message}`])
  }

  const onSelectDirectory = async () => {
    const selected = await window.appApi.selectDirectory()
    if (!selected) return
    setDirectoryPath(selected)
    setZipPath(null)
    setZipSize(null)
    appendLog(`Selected directory: ${selected}`)
  }

  const onCreateZip = async () => {
    if (!directoryPath) return
    setBusy(true)
    try {
      appendLog('Creating zip...')
      const result = await window.appApi.createZip(directoryPath)
      setZipPath(result.zipPath)
      setZipSize(result.sizeBytes)
      appendLog(`Zip created: ${result.zipPath} (${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)`)
    } catch (err) {
      appendLog(`Zip failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const onUpload = async () => {
    if (!zipPath) return
    setBusy(true)
    try {
      appendLog('Fetching upload target...')
      const config = await window.appApi.getUploadTarget()
      setUploadConfig(config)
      appendLog(`Uploading to ${config.bucket}...`)
      const result = await window.appApi.uploadZip(config, zipPath)
      onUploadComplete(result)
      appendLog(`Upload complete: s3://${result.bucket}/${result.key}`)

      if (config.copyTarget?.bucket || config.copyTarget?.keyPrefix) {
        appendLog('Copying object...')
        const copy = await window.appApi.copyIfNeeded(config, result)
        onCopyComplete(copy)
        if (copy) {
          appendLog(`Copy complete: s3://${copy.bucket}/${copy.key}`)
        }
      }
    } catch (err) {
      appendLog(`Upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const onTrigger = async () => {
    const target = copyResult ?? uploadResult
    if (!target) return
    setBusy(true)
    try {
      appendLog('Triggering API...')
      const response = await window.appApi.triggerApi({
        inputFormat,
        inputPayload: payload,
        upload: {
          bucket: target.bucket,
          key: target.key
        }
      })
      appendLog(`Trigger response: ${response.status}`)
    } catch (err) {
      appendLog(`Trigger failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upload-panel">
      <div className="action-row">
        <button onClick={onSelectDirectory} disabled={busy}>
          Select Directory
        </button>
        <div className="muted">{directoryPath ?? 'No directory selected'}</div>
      </div>

      <div className="action-row">
        <button onClick={onCreateZip} disabled={busy || !directoryPath}>
          Create Zip
        </button>
        <div className="muted">
          {zipPath ? `Zip ready (${(((zipSize ?? 0) / 1024 / 1024).toFixed(2))} MB)` : 'No zip yet'}
        </div>
      </div>

      <div className="action-row">
        <button onClick={onUpload} disabled={busy || !zipPath}>
          Upload to S3
        </button>
        <div className="muted">
          {uploadResult ? `Uploaded to s3://${uploadResult.bucket}/${uploadResult.key}` : 'Not uploaded'}
        </div>
      </div>

      <div className="action-row">
        <button onClick={onTrigger} disabled={busy || !(copyResult ?? uploadResult)}>
          Trigger API
        </button>
        <div className="muted">{uploadConfig ? `Endpoint: ${uploadConfig.endpoint}` : 'No endpoint yet'}</div>
      </div>

      <div className="log">
        {log.length === 0 ? (
          <div className="muted">Activity log will appear here.</div>
        ) : (
          log.map((entry, idx) => <div key={idx}>{entry}</div>)
        )}
      </div>
    </div>
  )
}

export default UploadPanel
