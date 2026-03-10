import React, { useEffect, useState } from 'react'
import type { RuntimeConfig } from '../../../shared/config'
import { defaultConfig } from '../../../shared/config'

const ConfigPanel: React.FC<{ onConfigSaved?: () => void }> = ({ onConfigSaved }) => {
  const [config, setConfig] = useState<RuntimeConfig>(defaultConfig)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    window.appApi.getConfig().then((loaded) => {
      if (mounted) setConfig(loaded)
    })
    return () => {
      mounted = false
    }
  }, [])

  const updateField = (key: keyof RuntimeConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const saveConfig = async () => {
    await window.appApi.setConfig(config)
    setStatus('Saved')
    onConfigSaved?.()
    setTimeout(() => setStatus(null), 2000)
  }

  return (
    <div className="panel">
      <h2>Runtime Configuration</h2>
      <div className="form-grid">
        <label>
          Server A Base URL
          <input value={config.serverABaseUrl} onChange={updateField('serverABaseUrl')} />
        </label>
        <label>
          Schema Path
          <input value={config.schemaPath} onChange={updateField('schemaPath')} />
        </label>
        <label>
          Upload Target Path
          <input value={config.uploadTargetPath} onChange={updateField('uploadTargetPath')} />
        </label>
        <label>
          Trigger API URL
          <input value={config.triggerApiUrl} onChange={updateField('triggerApiUrl')} />
        </label>
        <label>
          Bearer Token
          <input value={config.bearerToken ?? ''} onChange={updateField('bearerToken')} placeholder="Optional" />
        </label>
      </div>
      <div className="form-footer">
        <button className="primary" onClick={saveConfig}>
          Save Settings
        </button>
        {status && <div className="muted">{status}</div>}
      </div>
    </div>
  )
}

export default ConfigPanel
