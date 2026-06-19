# Manage Your Company Documents

The Document Hub lets you store and manage documents attached to your company or to individual resources such as employees, vehicles, and equipment. This guide walks through the full API lifecycle: looking up reference data, uploading documents, listing and filtering, and editing or deleting entries. This guide is written for **contractor** companies on the **professional plan**.

## Prerequisites

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Company id** — the contractor `companyId` whose document hub you are managing.
- **Professional contractor plan** — the Document Hub feature requires the professional plan; endpoints return **403** if the plan is not active.

## Step 1: Look up reference data

Before uploading a document you need the ids of the subject (the resource the document belongs to) and the document type. Three lookups are typically called on page load.

### Get available subjects

[`GET /v1/companies/{companyId}/documents/subjects?size=50`](#tag/Document-hub/GET/v1/companies/{companyId}/documents/subjects)

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/subjects?size=50" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000010",
      "name": "Acme Corp",
      "subjectType": "CONTRACTOR"
    },
    {
      "id": "00000000-0000-0000-0000-000000000011",
      "name": "Jane Doe",
      "subjectType": "EMPLOYEE"
    }
  ]
}
```

### Get document types

[`GET /v1/document-types?size=50`](#tag/Document-hub/GET/v1/document-types)

```bash
curl -X GET "https://app.twind.io/api/v1/document-types?size=50" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "content": [
    { "id": "00000000-0000-0000-0000-000000000020", "name": "Insurance Certificate" },
    { "id": "00000000-0000-0000-0000-000000000021", "name": "Safety Training Record" }
  ]
}
```

### Get document name catalog

[`GET /v1/companies/{companyId}/documents/document-names?size=50`](#tag/Document-hub/GET/v1/companies/{companyId}/documents/document-names)

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/document-names?size=50" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "content": ["Insurance Certificate", "Safety Training Record", "Medical Exam"]
}
```

## Step 2: Upload a document (three steps)

The API never receives the file binary directly. You request a presigned URL, upload the file straight to S3, then register the document metadata.

**Multiple files:** repeat Steps 2a–2b once per file — each file gets its own presigned URL and key. Register all keys together in a single Step 2c call.

### Step 2a: Get a presigned upload URL

[`GET /v1/companies/{companyId}/documents/temporary-upload-url`](#tag/Document-hub/GET/v1/companies/{companyId}/documents/temporary-upload-url)

`contentType` must be one of the accepted MIME types (see [Supported content types](#supported-content-types)).

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/temporary-upload-url?contentType=application%2Fpdf&fileName=insurance-certificate.pdf" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "url": "https://twind-assets-bucket-eu-west-1.s3.eu-west-1.amazonaws.com/",
  "fields": {
    "key": "document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-a1b2c3d4.pdf",
    "Content-Type": "application/pdf",
    "x-amz-algorithm": "AWS4-HMAC-SHA256",
    "x-amz-credential": "…",
    "x-amz-date": "…",
    "policy": "…",
    "x-amz-signature": "…"
  }
}
```

`url` is the storage endpoint to POST the file to; `fields.key` is the storage key — save it, it goes into `files` in Step 2c.

### Step 2b: Upload the file to storage

POST the file to `url` as `multipart/form-data`, sending **every** entry of `fields` as a form field (names and values unchanged) plus the file itself.

```bash
curl -X POST "$URL_FROM_STEP_2A" \
  -F "key=document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-a1b2c3d4.pdf" \
  -F "Content-Type=application/pdf" \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" \
  -F "x-amz-credential=…" \
  -F "x-amz-date=…" \
  -F "policy=…" \
  -F "x-amz-signature=…" \
  -F "file=@./insurance-certificate.pdf;type=application/pdf"
```

A successful upload returns `204 No Content` from S3 with no body.

> **Important:** If `Content-Type` is missing from `fields`, add it yourself with the exact MIME type you sent in Step 2a, or S3 replies **403**.

### Step 2c: Register document metadata

Once every file is in storage, register the document in one call. The body accepts an array — you can register multiple documents in a single request.

[`POST /v1/companies/{companyId}/documents`](#tag/Document-hub/POST/v1/companies/{companyId}/documents)

| Field | Required | Description |
| --- | --- | --- |
| `name` | Yes | Display name for the document. |
| `subjectType` | Yes | `CONTRACTOR`, `EMPLOYEE`, or `EQUIPMENT`. |
| `subjectId` | Yes | Id of the subject from Step 1. |
| `documentTypeId` | Yes | Document type id from Step 1. |
| `issueDate` | Yes | Date the document was issued (`YYYY-MM-DD`). |
| `expirationDate` | No | Document expiration date (`YYYY-MM-DD`), when applicable. |
| `files` | Yes | Array of `fields.key` values from Step 2a — one entry per uploaded file. |

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "name": "Insurance Certificate",
        "subjectType": "CONTRACTOR",
        "subjectId": "00000000-0000-0000-0000-000000000010",
        "documentTypeId": "00000000-0000-0000-0000-000000000020",
        "issueDate": "2026-01-01",
        "expirationDate": "2027-01-01",
        "files": [
          "document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-a1b2c3d4.pdf"
        ]
      }
    ]
  }'
```

Response (`201 Created`):

```json
{
  "ids": ["00000000-0000-0000-0000-000000000030"]
}
```

The returned array of `ids` contains one entry per registered document.

## Step 3: List your documents

[`GET /v1/companies/{companyId}/documents`](#tag/Document-hub/GET/v1/companies/{companyId}/documents)

Supports pagination via `page` (zero-based) and `size` query parameters.

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000030",
      "name": "Insurance Certificate",
      "subjectType": "CONTRACTOR",
      "issueDate": "2026-01-01",
      "expirationDate": "2027-01-01"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

## Step 4: Filter by subject type

Pass `subjectTypes` to the document list endpoint to receive only documents belonging to that subject type. The two reference-data lookups are also re-queried in parallel to refresh the filter dropdowns.

### Filtered document list

[`GET /v1/companies/{companyId}/documents`](#tag/Document-hub/GET/v1/companies/{companyId}/documents)

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents?subjectTypes=EMPLOYEE&page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`): same paginated shape as Step 3, containing only documents whose `subjectType` is `EMPLOYEE`.

### Refresh filter dropdowns (parallel)

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/subjects?subjectTypes=EMPLOYEE&size=50" \
  -H "X-Api-Key: your-api-key-here"
```

```bash
curl -X GET "https://app.twind.io/api/v1/document-types?subjectTypes=EMPLOYEE&size=50" \
  -H "X-Api-Key: your-api-key-here"
```

Supported `subjectTypes` values: `CONTRACTOR`, `EMPLOYEE`, `EQUIPMENT`.

## Step 5: Get document detail

[`GET /v1/companies/{companyId}/documents/{id}`](#tag/Document-hub/GET/v1/companies/{companyId}/documents/{id})

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/00000000-0000-0000-0000-000000000030" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "id": "00000000-0000-0000-0000-000000000030",
  "name": "Insurance Certificate",
  "subjectType": "CONTRACTOR",
  "subjectId": "00000000-0000-0000-0000-000000000010",
  "documentTypeId": "00000000-0000-0000-0000-000000000020",
  "issueDate": "2026-01-01",
  "expirationDate": "2027-01-01",
  "files": [
    "document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-a1b2c3d4.pdf"
  ]
}
```

## Step 6: Edit a document

To update a document's metadata or replace its files, repeat Steps 2a–2b for any new files, then PUT the full document body.

[`PUT /v1/companies/{companyId}/documents/{id}`](#tag/Document-hub/PUT/v1/companies/{companyId}/documents/{id})

The body uses the same shape as a single document in Step 2c (no array wrapper). Returns `204 No Content`.

```bash
curl -X PUT "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/00000000-0000-0000-0000-000000000030" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Insurance Certificate (renewed)",
    "subjectType": "CONTRACTOR",
    "subjectId": "00000000-0000-0000-0000-000000000010",
    "documentTypeId": "00000000-0000-0000-0000-000000000020",
    "issueDate": "2026-06-01",
    "expirationDate": "2027-06-01",
    "files": [
      "document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-renewed-b5c6d7e8.pdf"
    ]
  }'
```

## Step 7: Delete a document

[`DELETE /v1/companies/{companyId}/documents/{id}`](#tag/Document-hub/DELETE/v1/companies/{companyId}/documents/{id})

Returns `204 No Content`.

```bash
curl -X DELETE "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/00000000-0000-0000-0000-000000000030" \
  -H "X-Api-Key: your-api-key-here"
```

## Draft lifecycle (optional)

Documents can be saved as drafts before being finalized. Use drafts when you want to prepare a document without making it visible yet.

### Create a draft

[`POST /v1/companies/{companyId}/documents/draft`](#tag/Document-hub/POST/v1/companies/{companyId}/documents/draft)

The request body is identical to Step 2c. Returns `201 Created` with the same `{ "ids": [...] }` shape.

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/draft" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "name": "Insurance Certificate (draft)",
        "subjectType": "CONTRACTOR",
        "subjectId": "00000000-0000-0000-0000-000000000010",
        "documentTypeId": "00000000-0000-0000-0000-000000000020",
        "issueDate": "2026-01-01",
        "expirationDate": "2027-01-01",
        "files": [
          "document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-a1b2c3d4.pdf"
        ]
      }
    ]
  }'
```

### Finalize a draft

[`POST /v1/companies/{companyId}/documents/{id}/finalize`](#tag/Document-hub/POST/v1/companies/{companyId}/documents/{id}/finalize)

Send the same body shape as an edit (no array wrapper). Returns `204 No Content`. The endpoint returns `400` if the document is already finalized.

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/documents/00000000-0000-0000-0000-000000000030/finalize" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Insurance Certificate",
    "subjectType": "CONTRACTOR",
    "subjectId": "00000000-0000-0000-0000-000000000010",
    "documentTypeId": "00000000-0000-0000-0000-000000000020",
    "issueDate": "2026-01-01",
    "expirationDate": "2027-01-01",
    "files": [
      "document-hub/00000000-0000-0000-0000-000000000002/2026-06-19/insurance-certificate-a1b2c3d4.pdf"
    ]
  }'
```

You can also list all current drafts with [`GET /v1/companies/{companyId}/documents/draft`](#tag/Document-hub/GET/v1/companies/{companyId}/documents/draft) — it accepts the same filter and pagination parameters as the main list endpoint.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or the professional plan is not active. | Verify your plan tier; contact support if the plan is active but requests still fail. |
| 400 | Missing required fields, invalid `subjectType`, a `files` entry not found in storage, or attempting to finalize an already-finalized document. | Re-check the keys from Steps 2a–2b and ensure all required fields are present. |
| 404 | Unknown `companyId` or `documentId`. | Re-fetch the id from the list endpoint. |
| 403 (storage) | The multipart POST does not match the presigned policy. | Send all `fields` entries unchanged; add `Content-Type` as a named form field if it was missing. |

## Supported content types

Pass one of these MIME types as `contentType` in Step 2a, and echo the same string as the `Content-Type` form field in Step 2b:

| Extension | MIME type |
| --- | --- |
| `.pdf` | `application/pdf` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.ppt` | `application/vnd.ms-powerpoint` |
| `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| `.xls` | `application/vnd.ms-excel` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.xlsm` | `application/vnd.ms-excel.sheet.macroEnabled.12` |
| `.zip` | `application/zip` |
| `.png` | `image/png` |
| `.jpg` / `.jpeg` | `image/jpeg` |
| `.bmp` | `image/bmp` |
| `.xml` | `application/xml`, `text/xml` |

## Next steps

- [API Authentication Guide](get-api-token.md) — obtain and configure your API key.
- [Register and Maintain Your Employees](contractor-resources-employees.md) — find employee subject ids.
- [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) — the related flow for requirement-scoped document uploads.
- Explore the [API Reference](../index.html?section=api) for full request and response schemas.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
