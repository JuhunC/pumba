import React, { useEffect, useMemo, useState } from 'react'
import type { SchemaResponse, UploadResult } from '../../shared/types'
import SchemaFormPanel from './components/SchemaFormPanel'
import UploadPanel from './components/UploadPanel'
import { toYaml } from './yaml'
import ConfigPanel from './components/ConfigPanel'

const App: React.FC = () => {
  const [schemaResponse, setSchemaResponse] = useState<SchemaResponse | null>(null)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [inputFormat, setInputFormat] = useState<'json' | 'yaml'>('json')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [copyResult, setCopyResult] = useState<UploadResult | null>(null)

  const loadSchema = () => {
    let mounted = true
    setSchemaError(null)
    window.appApi
      .getSchema()
      .then((res) => {
        if (mounted) setSchemaResponse(res)
      })
      .catch((err) => {
        if (mounted) setSchemaError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      mounted = false
    }
  }

  useEffect(() => {
    const cleanup = loadSchema()
    return cleanup
  }, [])

  const jsonOutput = useMemo(() => JSON.stringify(formData, null, 2), [formData])
  const yamlOutput = useMemo(() => toYaml(formData), [formData])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">Schema Uploader</div>
          <div className="app-subtitle">Windows and Linux, single codebase</div>
        </div>
        <div className="status-chip">
          {schemaResponse ? 'Schema loaded' : schemaError ? 'Schema error' : 'Loading schema'}
        </div>
      </header>

      {schemaError && (
        <div className="alert error">Schema load failed: {schemaError}</div>
      )}

      <div className="content-grid">
        <ConfigPanel onConfigSaved={() => loadSchema()} />
        <section className="panel">
          <h2>Schema Input</h2>
          {schemaResponse ? (
            <SchemaFormPanel
              schema={schemaResponse.schema}
              uiSchema={schemaResponse.uiSchema}
              formData={formData}
              onChange={setFormData}
              inputFormat={inputFormat}
              onFormatChange={setInputFormat}
              jsonOutput={jsonOutput}
              yamlOutput={yamlOutput}
            />
          ) : (
            <div className="muted">Waiting for schema...</div>
          )}
        </section>

        <section className="panel">
          <h2>Upload and Trigger</h2>
          <UploadPanel
            inputFormat={inputFormat}
            jsonOutput={jsonOutput}
            yamlOutput={yamlOutput}
            onUploadComplete={setUploadResult}
            onCopyComplete={setCopyResult}
            uploadResult={uploadResult}
            copyResult={copyResult}
          />
        </section>
      </div>
    </div>
  )
}

export default App
