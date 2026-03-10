# Schema Uploader (Electron)

Cross-platform desktop app (Windows + Linux) that:
- Fetches JSON Schema from Server A
- Renders a dynamic UI from the schema
- Produces JSON/YAML from user input
- Zips a user-selected directory
- Uploads to Minio/S3 and optionally copies
- Triggers a REST API with metadata

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure runtime endpoints (in-app):

Use the Runtime Configuration panel to set Server A base URL, schema path, upload target path, trigger API URL, and bearer token. These are stored in the app user data directory.

3. Run in dev:

```bash
npm run dev
```

4. Build installers:

```bash
npm run build
npm run make
```

## Server A API contract (expected)

- `GET {serverABaseUrl}{schemaPath}` (Bearer token if configured)
  - Returns `{ schema, uiSchema?, title? }`

- `GET {serverABaseUrl}{uploadTargetPath}` (Bearer token if configured)
  - Returns:

```json
{
  "endpoint": "http://minio:9000",
  "region": "us-east-1",
  "bucket": "uploads",
  "keyPrefix": "requests",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "sessionToken": "...",
  "forcePathStyle": true,
  "copyTarget": {
    "bucket": "uploads-copy",
    "keyPrefix": "archive"
  }
}
```

- `POST {triggerApiUrl}` (Bearer token if configured)
  - Body:

```json
{
  "inputFormat": "json",
  "inputPayload": "{...}",
  "upload": { "bucket": "uploads", "key": "requests/....zip" }
}
```

Adjust paths or payloads in `src/main/index.ts` if your API differs.
