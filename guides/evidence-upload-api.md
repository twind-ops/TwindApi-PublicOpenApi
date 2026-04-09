# Document Upload API Guide

This guide explains how to submit **documents** through the Twind
HTTP API: file uploads (presigned object storage), agreement-only submissions, and
optional **single submission** (reuse one document across several requirement
instances).

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (JWT session or API key,
  depending on your integration). See [API Authentication Guide](get-api-token.md)
  for API keys and the `X-Api-Key` header.
- **Requirement instance id** — The obligation row you are satisfying
  (employee, vehicle, equipment, or company-level, depending on the
  requirement).
- **Correct requirement type** — File upload flows apply only to **upload-type**
  requirements; agreement-type requirements use a different endpoint.

Your Twind account must be set up to perform submit and read operations for the
relevant companies; contact support if an endpoint returns **403 Forbidden**
for a flow you expect to use.

> **Note:** Path parameters named `evidenceId` are **not** always the same kind
> of id. On the presigned-upload URL, that segment is the **requirement instance
> id** (legacy naming). After you submit documents, other routes use the
> **evidence record id** returned in the response body. See
> [Understanding IDs](#understanding-ids) below.

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

## Understanding IDs

- **`{requirementInstanceId}`** on `GET .../evidences/{...}/temporary-upload-url`
  — **Requirement instance id** — the row for that obligation.
- **`{evidenceId}`** on `GET .../evidences/{...}` (read details) — **Evidence
  record id** — returned after upload or agreement submission.
- **`{evidenceId}`** on `POST .../evidences/{...}/matching-requirement-instances`
  — **Evidence record id** — the source document you want to propagate.

## Upload document (three steps)

The API does **not** accept raw file bytes on `POST .../upload`. You upload the
file to **object storage** using a presigned URL, then register the document
with the **object keys** returned from that flow.

### At a glance

1. Request a presigned upload URL from the API.
2. POST the file to the storage URL (multipart form) using the returned fields.
3. **POST** `/v1/cm/companies/{companyId}/evidences/upload` with metadata and
   `filePaths` set to the object key(s).

## Step 1: Request a presigned upload URL

### Request — presigned upload URL

```http
GET /v1/companies/{companyId}/evidences/{requirementInstanceId}/temporary-upload-url?contentType={mime}&fileName={name}
```

Optional query parameter: **`asSubcontractorId`** — use when submitting on
behalf of another company in your subcontractor chain (when your integration
supports that scenario).

### Example: cURL — GET temporary upload URL

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/evidences/{requirementInstanceId}/temporary-upload-url?contentType=application/pdf&fileName=certificate.pdf" \
  -H "Authorization: Bearer your-token-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "url": "https://your-bucket.s3.region.amazonaws.com",
  "fields": {
    "key": "evidences/{ownerId}/{requirementInstanceId}/{yyyy-MM-dd}/certificate.pdf",
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
  server builds a **`key`** under
  `evidences/{ownerId}/{requirementInstanceId}/{date}`.
- Use the **same** `contentType` you sent to the API; the policy is tied to it.
  When S3 conditions include `Content-Type`, it must be a **named form field**
  **`Content-Type`** (not only the MIME type on the file part). If it is missing
  from `fields` but the upload returns **403**, add **`Content-Type`** with that
  same value.
- Maximum size is enforced when the URL is generated.

## Step 2: Upload the file to object storage

Send **POST** `multipart/form-data` to **`url`**:

1. Add all entries from **`fields`** as form fields (names and values as
   returned).
2. Add the file (often as the **`file`** field; follow your S3 client and the
   presigned policy).

### Example: cURL — POST file to storage

```bash
curl -X POST "$URL_FROM_STEP_1" \
  -F "key=evidences/…/certificate.pdf" \
  -F "Content-Type=application/pdf" \
  -F "policy=…" \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" \
  -F "x-amz-credential=…" \
  -F "x-amz-date=…" \
  -F "x-amz-signature=…" \
  -F "file=@./certificate.pdf;type=application/pdf"
```

After a successful upload, the object must exist at the **`key`** in
**`fields.key`**. Use that string (or the full key returned) in **`filePaths`**
in the next step.

## Step 3: Register the document

### Request — register upload

```http
POST /v1/cm/companies/{companyId}/evidences/upload
Content-Type: application/json
```

Optional query: **`asSubcontractorId`**

### Body (main fields)

| Field | Required | Description |
| --- | --- | --- |
| `requirementInstanceId` | Yes | Must match the instance used for the upload. |
| `issueDate` | Yes | Document date of issue (`YYYY-MM-DD`). |
| `expirationDate` | No | When applicable. |
| `filePaths` | Yes | Object storage keys (e.g. the `key` from step 2). |
| `requirementDoesNotApply` | No | If `true`, `comments` are required. |
| `comments` | No | Required when `requirementDoesNotApply` is true. |
| `expressValidation` | No | Default false; doc management required when true. |
| `createdAt` | No | Defaults to server time. |

### Example: cURL — POST register file

```bash
curl -X POST "https://app.twind.io/api/v1/cm/companies/{companyId}/evidences/upload" \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementInstanceId": "11111111-2222-3333-4444-555555555555",
    "issueDate": "2025-06-01",
    "expirationDate": "2026-06-01",
    "filePaths": [
      "evidences/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/11111111-2222-3333-4444-555555555555/2025-06-15/certificate.pdf"
    ],
    "requirementDoesNotApply": false,
    "expressValidation": false
  }'
```

**Response** (`201 Created`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

The **`id`** is the **evidence record id** for the new submission. The server
checks that files exist in storage and that the requirement is an upload-type
requirement.

**Subcontractor:** add `?asSubcontractorId={uuid}` to the GET and POST URLs when
submitting on behalf of a subcontractor.

## Submit agreement (no file)

For requirements that do not use file upload:

> **Paths:** File **upload registration** above uses **`/v1/cm/companies/...`**
> (compliance-management API). **Agreement** submission below uses
> **`/v1/companies/...`** without the **`/cm/`** segment. The two routes are
> published on different API surfaces; this is intentional. Use the URL that
> matches the operation—**`/v1/cm/.../evidences/upload`** after storage upload,
> and **`/v1/.../evidences/agreement`** for agreement-only evidence.

```http
POST /v1/companies/{companyId}/evidences/agreement
Content-Type: application/json
```

### Body

| Field | Required |
| --- | --- |
| `requirementInstanceId` | Yes |
| `createdAt` | No |

### Example: cURL — POST agreement

```bash
curl -X POST \
  "https://app.twind.io/api/v1/companies/{companyId}/evidences/agreement" \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"requirementInstanceId": "11111111-2222-3333-4444-555555555555"}'
```

**Response** (`201 Created`): `{ "id": "<evidence-uuid>" }` (same shape as file
upload).

## Validation and errors (overview)

- **Wrong requirement type** — File registration fails if the requirement is
  not an upload type.
- **Missing files** — Every `filePaths` entry must exist in object storage.
- **Express validation** — `expressValidation: true` requires document
  management for the client company.
- **Not applicable** — If `requirementDoesNotApply` is true, **comments** must
  be non-empty.
- **Subcontractor** — Invalid chain access returns **403**.
- Other failures return **4xx** with problem details where the API supports it.

## Read evidence after submission

```http
GET /v1/companies/{companyId}/evidences/{evidenceId}
```

Here **`evidenceId`** is the **evidence record id** from the upload or agreement
response.

## Single submission (optional)

**Single submission** lets you upload once, then **propagate** that evidence to
other requirement instances that match the same subject and document type rules,
subject to visibility and server validation.

### Typical flow

1. (Optional) **Discover** peers:
   `GET /v1/companies/{companyId}/requirement-instances/{instanceId}/matches` —
   returns **`200`** with a payload describing `subject` and `matches`, or
   **`404`** if there is nothing to show.
2. (Optional) **Retroactive peers:**
   `GET .../requirement-instances/{instanceId}/retroactive-matches` — similar
   shape for prior valid evidence; **`404`** when empty.
3. **Submit evidence once** using the file or agreement flow above. Save the
   returned **`id`** — this is the **source evidence id**.
4. **Propagate:**
   `POST /v1/companies/{companyId}/evidences/{sourceEvidenceId}/matching-requirement-instances`
   with body `{ "requirementInstanceIds": ["uuid", ...] }` — **`204`** on
   success.

> **Note:** Propagation is only available when single submission is enabled for
> your organization. The source evidence must satisfy the server rules (for
> example status `PENDING_REVIEW` or `APPROVED`, non-null `dateOfIssue`, files
> still present in storage).

### Example: cURL (propagate)

```bash
curl -X POST \
  "https://app.twind.io/api/v1/companies/{companyId}/evidences/{sourceEvidenceId}/matching-requirement-instances" \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"requirementInstanceIds": ["22222222-3333-4444-5555-666666666666"]}'
```

**Example response shape (matches endpoint)** — payloads include `subject` and
`matches`, each match with `requirementName`, `requirementInstance`, `client`,
and `contracts` (with `sites`):

```json
{
  "subject": {
    "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "name": "Jane Doe",
    "type": "EMPLOYEE",
    "identifierType": "NATIONAL_ID",
    "identifier": "12345678A"
  },
  "matches": [
    {
      "requirementName": "Safety certificate",
      "requirementInstance": {
        "id": "22222222-3333-4444-5555-666666666666",
        "status": "PENDING_UPLOAD",
        "dateOfIssue": null,
        "expirationDate": null,
        "evidenceId": null
      },
      "client": { "id": "…", "name": "…", "taxId": "…" },
      "contracts": [
        {
          "id": "…",
          "name": "…",
          "sites": [{ "id": "…", "name": "…" }]
        }
      ]
    }
  ]
}
```

## Other features

Review workflows (approve, reject, update document) use separate endpoints on
the same API surface after submission.

## Next Steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you use
  API keys.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas.
- Contact Twind if you need products or capabilities enabled for evidence or
  single submission.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
