# Visits API — Visitor documentation upload guide

This guide explains how to attach **documentation files** to a **visitor** in the
Twind HTTP API. Files are uploaded to object storage with a presigned URL, then
referenced when you **create** or **update** a visitor.

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (JWT session or API key,
  depending on your integration). See [API Authentication Guide](get-api-token.md)
  for API keys and the `X-Api-Key` header.
- **Company id** — The client company (`companyId`) whose visit register you are
  using.

Your Twind account must be allowed to read and write visitor data for that
company; contact support if an endpoint returns **403 Forbidden** for a flow you
expect to use.

## Authentication

Include credentials on every request. For interactive users, use a **Bearer**
token. For machine integrations, use **`X-Api-Key`** as described in the
[API Authentication Guide](get-api-token.md).

Example header:

```text
Authorization: Bearer your-token-here
```

or

```text
X-Api-Key: your-api-key-here
```

> **Security tip:** Do not log full tokens or keys. Store secrets outside your
> repository.

## Upload visitor documentation (three steps)

The API does **not** accept raw file bytes on `POST .../visitor`. You upload each
file to object storage first, then pass the resulting **object keys** (or
compatible paths) in the **`files`** array on create or update.

### At a glance

1. Request a presigned upload URL from the API.
2. POST each file to the storage URL (multipart form) using the returned fields.
3. **POST** `/v1/companies/{companyId}/visitor` (create) or **PUT**
   `/v1/companies/{companyId}/visitor/{visitorId}` (update) with **`files`** set
   to the keys from step 2.

You can repeat steps 1–2 for multiple files, then send all keys in one **`files`**
array.

## Step 1: Request a presigned upload URL

### Request — presigned upload URL

```http
GET /v1/companies/{companyId}/visitor/temporary-upload-url?contentType={mime}&fileName={name}
```

### Example: cURL — GET temporary upload URL

```bash
curl -X GET \
  "https://api.twind.io/v1/companies/{companyId}/visitor/temporary-upload-url?contentType=application/pdf&fileName=visitor-id.pdf" \
  -H "Authorization: Bearer your-token-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "url": "https://your-bucket.s3.region.amazonaws.com",
  "fields": {
    "key": "visitors/{companyId}/{yyyy-MM-dd}/visitor-id.pdf",
    "Content-Type": "application/pdf",
    "policy": "…",
    "x-amz-algorithm": "AWS4-HMAC-SHA256",
    "x-amz-credential": "…",
    "x-amz-date": "…",
    "x-amz-signature": "…"
  }
}
```

- **`url`** — POST target for the upload.
- **`fields`** — Send every entry as form fields together with the file. The
  server stores objects under `visitors/{companyId}/{date}/…`.
- Use the **same** `contentType` you sent to the API when uploading; the policy
  is tied to it. When S3 conditions include `Content-Type`, send it as a **named
  form field** **`Content-Type`** (not only the MIME type on the file part). If
  it is missing from `fields` but the upload returns **403**, add **`Content-Type`**
  with that same value.

## Step 2: Upload the file to object storage

Send **POST** `multipart/form-data` to **`url`**, including all **`fields`**
plus the file (same pattern as other presigned POST flows in Twind).

### Example: cURL — POST file to storage

```bash
curl -X POST "$URL_FROM_STEP_1" \
  -F "key=visitors/…/visitor-id.pdf" \
  -F "Content-Type=application/pdf" \
  -F "policy=…" \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" \
  -F "x-amz-credential=…" \
  -F "x-amz-date=…" \
  -F "x-amz-signature=…" \
  -F "file=@./visitor-id.pdf;type=application/pdf"
```

Repeat for each documentation file you need. Collect each object **`key`** (from
**`fields.key`**) for the next step.

## Step 3: Create or update the visitor with file paths

### Create visitor

```http
POST /v1/companies/{companyId}/visitor
Content-Type: application/json
```

### Body (main fields)

| Field | Required | Description |
| --- | --- | --- |
| `visitorName` | Yes | Visitor first name. |
| `visitorSurname` | Yes | Visitor last name. |
| `visitorIdentityType` | Yes | Identity document type (string). |
| `visitorIdentity` | Yes | Identity number or reference. |
| `visitorEmail` | No | Email (validated when present). |
| `visitorPlateNumber` | No | Vehicle plate; if present, must not be blank. |
| `companyName` | Yes | Visiting company name. |
| `companyTaxId` | Yes | Visiting company tax id. |
| `files` | No | Object keys for uploaded docs (one per file from step 2). |

### Example: cURL — POST create visitor

```bash
curl -X POST \
  "https://api.twind.io/v1/companies/{companyId}/visitor" \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "visitorName": "Jane",
    "visitorSurname": "Doe",
    "visitorIdentityType": "ID_CARD",
    "visitorIdentity": "ID123456",
    "visitorEmail": "jane@example.com",
    "visitorPlateNumber": null,
    "companyName": "Acme Corp",
    "companyTaxId": "TAX-001",
    "files": [
      "visitors/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/2025-06-15/document.pdf"
    ]
  }'
```

**Response** (`201 Created`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

The **`id`** is the **visitor** record id.

### Update visitor

Replace documentation or other fields:

```http
PUT /v1/companies/{companyId}/visitor/{visitorId}
Content-Type: application/json
```

Use the same JSON shape as create (`CreateVisitorDto`). Set **`files`** to the
list of keys for the documentation that should be stored after the update.

## Validation and errors (overview)

- **Missing files** — Each path in **`files`** must exist in object storage before
  create/update succeeds.
- **403** — Your integration is not allowed to perform this operation for the
  company.
- Other failures return **4xx** with problem details where the API supports it.

When reading visits or visitor details, documentation may be exposed to the
client as download URLs; field names depend on the response schema for your API
version.

## Related flows

- **Visit register — entry** — When you **register a visit entry** (visitor on
  site), call **POST** `/v1/companies/{companyId}/visit-register` with
  **`visitorId`** set to the visitor **`id`** returned from **Step 3** in this
  guide (create or update visitor). That links the visit to the profile whose
  documentation you uploaded.
- **Visit register — exit** — When the visitor leaves, **register the visit exit**
  with **PATCH**
  `/v1/companies/{companyId}/visit-register/{visitRegisterId}`, using the
  **visit register record id** from the entry response or from listing visits.
  Exit registration does not repeat **`visitorId`** in the path; it closes the
  open visit created at entry for that same visitor.

## Next Steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you use
  API keys.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
