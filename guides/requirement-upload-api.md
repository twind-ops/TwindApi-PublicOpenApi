# Requirements API — Requirement template upload guide

This guide explains how to upload a **requirement template** file through the Twind
HTTP API. The API does not accept raw file bytes on the requirement create or
update routes. You upload the file to object storage with a presigned URL, then
pass the resulting **object key** in **`templateFile`** when you **create** or
**update** a requirement.

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (JWT session or API key,
  depending on your integration). See [API Authentication Guide](get-api-token.md)
  for API keys and the `X-Api-Key` header.
- **Company id** — The company (`companyId`) that owns the requirement
  definition.

Your Twind account must be allowed to manage requirements for that company;
contact support if an endpoint returns **403 Forbidden** for a flow you expect to
use.

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

## Upload a requirement template (three steps)

The API does **not** accept raw file bytes on `POST .../requirements` or
`PUT .../requirements/{requirementId}`. You upload the file to object storage
first, then set **`templateFile`** to the object key returned from that flow.

### At a glance

1. Request a presigned upload URL from the API.
2. POST the file to the storage URL (`multipart/form-data`) using the returned
   fields.
3. **POST** `/v1/companies/{companyId}/requirements` (create) or **PUT**
   `/v1/companies/{companyId}/requirements/{requirementId}` (update) with
   **`templateFile`** set to the key from step 2, together with the other fields
   required by your API contract.

This flow does **not** use **`asSubcontractorId`** (unlike some evidence
upload routes).

## Step 1: Request a presigned upload URL

### Request — presigned upload URL

```http
GET /v1/companies/{companyId}/requirements/temporary-upload-url?contentType={mime}&fileName={name}
```

### Example: cURL — GET temporary upload URL

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/requirements/temporary-upload-url?contentType=application/pdf&fileName=requirement-template.pdf" \
  -H "Authorization: Bearer your-token-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "url": "https://your-bucket.s3.region.amazonaws.com",
  "fields": {
    "key": "requirements/{companyId}/{yyyy-MM-dd}/requirement-template.pdf",
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
  server stores objects under a **`requirements/…`** prefix (exact layout follows
  server rules for your environment).
- Use the **same** `contentType` you sent to the API when uploading; the policy
  is tied to it. When S3 conditions include `Content-Type`, send it as a **named
  form field** **`Content-Type`** (not only the MIME type on the file part). If
  it is missing from `fields` but the upload returns **403**, add **`Content-Type`**
  with that same value.
- Maximum size is enforced when the URL is generated.

## Step 2: Upload the file to object storage

Send **POST** `multipart/form-data` to **`url`**, including all **`fields`**
plus the file (same pattern as other presigned POST flows in Twind).

### Example: cURL — POST file to storage

```bash
curl -X POST "$URL_FROM_STEP_1" \
  -F "key=requirements/…/requirement-template.pdf" \
  -F "Content-Type=application/pdf" \
  -F "policy=…" \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" \
  -F "x-amz-credential=…" \
  -F "x-amz-date=…" \
  -F "x-amz-signature=…" \
  -F "file=@./requirement-template.pdf;type=application/pdf"
```

After a successful upload, the object must exist at the **`key`** in
**`fields.key`**. Use that string as **`templateFile`** in the next step.

## Step 3: Create or update the requirement with `templateFile`

### Create requirement

```http
POST /v1/companies/{companyId}/requirements
Content-Type: application/json
```

### Body — `templateFile`

| Field | Required | Description |
| --- | --- | --- |
| `templateFile` | No | Object storage key for the uploaded template (from step 2). |

`CreateRequirementDto` has many other required fields (`name`, `subject`,
`evidenceType`, `custody`, `rules`, `acceptanceCriteria`, and others). Use your
OpenAPI schema or product documentation for the full shape; the example below
shows where **`templateFile`** fits.

### Example: cURL — POST create requirement (abbreviated body)

```bash
curl -X POST \
  "https://app.twind.io/api/v1/companies/{companyId}/requirements" \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example requirement",
    "subject": "EMPLOYEE",
    "multipleInstanceRequest": "NONE",
    "appliedTo": "ALL_CONTRACTORS",
    "evidenceType": "UPLOAD",
    "templateFile": "requirements/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/2025-06-15/requirement-template.pdf",
    "critical": false,
    "enableDoesNotApply": false,
    "expirationType": "NONE",
    "canBeSetInFuture": false,
    "acceptanceCriteria": ["Valid on issue date"],
    "custody": { "enabled": false },
    "rules": []
  }'
```

**Response** (`200 OK`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

The **`id`** is the **requirement** record id.

Unlike **`POST .../evidences/upload`**, which returns **`201 Created`**, **`POST .../companies/{companyId}/requirements`** returns **`200 OK`** with the same `{ "id": "…" }` shape. Treat **`200`** as success for requirement creation; do not expect **`201`**.

### Update requirement

Replace or add a template on an existing requirement:

```http
PUT /v1/companies/{companyId}/requirements/{requirementId}
Content-Type: application/json
```

Include **`templateFile`** with the new object key, plus every field required by
`UpdateRequirementDto` for your API version (typically the same logical shape as
create).

## Validation and errors (overview)

- **Missing file** — The path in **`templateFile`** must exist in object storage
  before create or update succeeds.
- **403** — Your integration is not allowed to perform this operation for the
  company.
- Other failures return **4xx** with problem details where the API supports it.

## Next Steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you use
  API keys.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas for `CreateRequirementDto` and `UpdateRequirementDto`.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
