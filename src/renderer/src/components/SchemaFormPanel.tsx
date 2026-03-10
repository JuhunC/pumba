import React from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { JsonSchema } from '../../../shared/types'

interface SchemaFormPanelProps {
  schema: JsonSchema
  uiSchema?: Record<string, unknown>
  formData: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  inputFormat: 'json' | 'yaml'
  onFormatChange: (format: 'json' | 'yaml') => void
  jsonOutput: string
  yamlOutput: string
}

const SchemaFormPanel: React.FC<SchemaFormPanelProps> = ({
  schema,
  uiSchema,
  formData,
  onChange,
  inputFormat,
  onFormatChange,
  jsonOutput,
  yamlOutput
}) => {
  return (
    <div className="schema-form">
      <Form
        schema={schema as unknown as Record<string, unknown>}
        uiSchema={uiSchema as Record<string, unknown> | undefined}
        validator={validator}
        formData={formData}
        onChange={(event) => onChange((event.formData ?? {}) as Record<string, unknown>)}
        liveValidate
        showErrorList={false}
      >
        <div className="form-footer">
          <div className="format-toggle">
            <label>
              <input
                type="radio"
                name="format"
                value="json"
                checked={inputFormat === 'json'}
                onChange={() => onFormatChange('json')}
              />
              JSON
            </label>
            <label>
              <input
                type="radio"
                name="format"
                value="yaml"
                checked={inputFormat === 'yaml'}
                onChange={() => onFormatChange('yaml')}
              />
              YAML
            </label>
          </div>
          <button className="primary" type="submit">
            Validate
          </button>
        </div>
      </Form>

      <div className="output-block">
        <div className="output-header">Generated {inputFormat.toUpperCase()}</div>
        <pre>{inputFormat === 'json' ? jsonOutput : yamlOutput}</pre>
      </div>
    </div>
  )
}

export default SchemaFormPanel
