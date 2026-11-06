# Upload and Approve an Evidence for a Contractor's Employee

Sometimes the client already holds the document a contractor's employee needs — a training certificate issued by your own safety team, a medical fitness report, an access induction — and you want to load it into Twind yourself and mark it as valid, instead of waiting for the contractor to upload it. This guide walks the full flow starting from the employee's national ID (DNI/NIE/passport number): find the employee, find the requirement instance, upload the file on behalf of the contractor, and approve it. This guide is written for **client** companies.

> **Note:** There is no single "upload and auto-approve" call. An evidence you upload on behalf of a contractor enters `PENDING_REVIEW` like any other; you approve it with a second call (Step 6). Both calls are needed.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Permissions** — the API key user must be able to read assigned resources and requirement instances, submit evidences on behalf of contractors, and review the requirement (the instance's `permissions` must include `REVIEW`, see Step 2).
- **The employee is assigned to one of your contracts** — Twind only generates employee requirement instances for resources deployed on a contract site (see [See Assigned Resources and Their Risks](client-contracts-assigned-resources.md)).

The examples use these ids:

| Id | Value |
| --- | --- |
| Your client company | `00000000-0000-0000-0000-000000000001` |
| Contractor company | `00000000-0000-0000-0000-000000000002` |
| Employee (resource) | `00000000-0000-0000-0000-000000000030` |
| Requirement | `00000000-0000-0000-0000-000000000060` |
| Requirement instance | `00000000-0000-0000-0000-000000000070` |
| Evidence | `00000000-0000-0000-0000-000000000071` |

## Step 1: Find the employee by national ID

Search the resources assigned to your contracts with `q` set to the national ID, restricted to employees.

[`GET /v1/companies/{id}/assigned-resources`](#tag/assigned-resources/GET/v1/companies/{id}/assigned-resources)

`q` is a **partial, accent-insensitive** search that matches the national ID but also names, plates, serial numbers and company names. Always keep only the row whose `identity` equals the national ID you searched for.

### Example: Search by national ID

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/assigned-resources?q=12345678Z&resourceTypes=EMPLOYEE&page=0&size=10" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000030",
      "name": "John Smith",
      "resourceType": "EMPLOYEE",
      "identity": "12345678Z"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Keep the **resource id** (`content[].id`) of the row whose `identity` equals the national ID. If no row on this page matches, request the remaining pages (`page.totalPages`) before concluding that the employee is not assigned to any of your contracts.

## Step 2: Find the requirement instance for that employee

First get the id of the requirement you want to satisfy. Look it up by name in your requirement configurations (or reuse it if you already have it), and check that `subject` is `EMPLOYEE` and `evidenceType` is `UPLOAD`.

[`GET /v1/companies/{companyId}/requirements`](#tag/configuration/GET/v1/companies/{companyId}/requirements)

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirements?name=Work-at-height&subject=EMPLOYEE&page=0&size=10" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

Keep the **requirement id** (`content[].id`). Then list the instances of that requirement for that employee:

[`GET /v1/companies/{companyId}/requirement-instances/as-client`](#tag/instances/GET/v1/companies/{companyId}/requirement-instances/as-client)

### Example: Instance of a requirement for one employee

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirement-instances/as-client?requirementIds=00000000-0000-0000-0000-000000000060&resourceIds=00000000-0000-0000-0000-000000000030&page=0&size=10" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000070",
      "requirement": {
        "id": "00000000-0000-0000-0000-000000000060",
        "name": "Work-at-height training certificate",
        "type": "UPLOAD",
        "critical": true
      },
      "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L.", "taxId": "B12345678" },
      "subject": { "id": "00000000-0000-0000-0000-000000000030", "name": "John Smith", "type": "EMPLOYEE", "identifier": "12345678Z" },
      "evidences": [
        { "id": "00000000-0000-0000-0000-000000000050", "status": "EXPIRED", "uploadDate": "2025-06-10T11:20:00Z" }
      ],
      "permissions": ["VIEW_DETAILS", "REVIEW"]
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Keep two values for the next steps:

- **Requirement instance id** — `content[].id`.
- **Contractor id** — `content[].contractor.id`. You upload *on behalf of* this company, so it goes into `asSubcontractorId` in Steps 3 and 5.

Check that `permissions` contains `REVIEW`; without it the approval in Step 6 is refused. Pick an instance whose `contractor.id` is the company you are loading the document for. Requirements scoped `SITE_SPECIFIC`, `CONTRACT_SPECIFIC` or `PROJECT_SPECIFIC` can return several instances for the same employee and contractor: use each row's `contracts` and `applicableEngagements` to choose the one for the intended site, contract or project (or narrow the query with `contractIds` / `siteIds`).

## Step 3: Get a presigned upload URL

Request a presigned POST URL for the file. Pass the contractor id from Step 2 as `asSubcontractorId`: the instance belongs to the contractor, not to you, and without it the request is refused.

[`GET /v1/companies/{companyId}/evidences/{requirementInstanceId}/temporary-upload-url`](#tag/submissions/GET/v1/companies/{companyId}/evidences/{requirementInstanceId}/temporary-upload-url)

### Example: Get the upload URL

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/evidences/00000000-0000-0000-0000-000000000070/temporary-upload-url?contentType=application%2Fpdf&fileName=work-at-height-john-smith.pdf&asSubcontractorId=00000000-0000-0000-0000-000000000002" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

Response (`200 OK`):

```json
{
  "url": "https://your-bucket.s3.region.amazonaws.com/",
  "fields": {
    "key": "evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-11-05/work-at-height-john-smith.pdf",
    "Content-Type": "application/pdf",
    "x-amz-algorithm": "AWS4-HMAC-SHA256",
    "x-amz-credential": "…",
    "x-amz-date": "…",
    "policy": "…",
    "x-amz-signature": "…",
    "x-amz-security-token": "…"
  }
}
```

Save `fields.key` — it goes into `filePaths` in Step 5. Accepted `contentType` values are listed in [Supported content types](contractor-requirements-upload-documents.md#supported-content-types).

## Step 4: Upload the file to storage

POST the file to `url` as `multipart/form-data`, sending **every** entry of `fields` unchanged as form fields, and the file last. If `fields` has no `Content-Type` entry, add one yourself with the same `contentType` you sent in Step 3; storage rejects the upload with **403** otherwise.

### Example: Upload the file

```bash
curl -X POST "$URL_FROM_STEP_3" \
  -F "key=evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-11-05/work-at-height-john-smith.pdf" \
  -F "Content-Type=application/pdf" \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" \
  -F "x-amz-credential=…" \
  -F "x-amz-date=…" \
  -F "policy=…" \
  -F "x-amz-signature=…" \
  -F "x-amz-security-token=…" \
  -F "file=@./work-at-height-john-smith.pdf;type=application/pdf"
```

Response: `204 No Content`. For several files, repeat Steps 3–4 once per file and send all keys together in Step 5.

## Step 5: Register the evidence

Register the uploaded file against the instance, again with `asSubcontractorId` set to the contractor id.

[`POST /v1/cm/companies/{companyId}/evidences/upload`](#tag/submissions/POST/v1/cm/companies/{companyId}/evidences/upload)

| Field | Required | Description |
| --- | --- | --- |
| `requirementInstanceId` | Yes | The instance from Step 2. |
| `expressValidation` | Yes | Send `false`. `true` requests paid express validation and consumes units of the Express add-on — pointless when you approve the evidence yourself. |
| `issueDate` | Yes | Date the document was issued (`YYYY-MM-DD`); drives the expiration calculation. |
| `filePaths` | Yes | The `fields.key` values from Step 3, one per file. |
| `expirationDate` | No | Explicit expiration date, when the document carries one. |
| `comments` | No | Note stored with the evidence. |

### Example: Register the evidence

```bash
curl -X POST "https://app.twind.io/api/v1/cm/companies/00000000-0000-0000-0000-000000000001/evidences/upload?asSubcontractorId=00000000-0000-0000-0000-000000000002" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementInstanceId": "00000000-0000-0000-0000-000000000070",
    "expressValidation": false,
    "issueDate": "2026-11-04",
    "expirationDate": "2027-11-04",
    "filePaths": [
      "evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-11-05/work-at-height-john-smith.pdf"
    ]
  }'
```

Response (`200 OK`):

```json
{
  "successfulEvidenceIds": ["00000000-0000-0000-0000-000000000071"],
  "failedEvidenceIds": []
}
```

Keep the **evidence id** (`successfulEvidenceIds[0]`). The evidence is now in `PENDING_REVIEW`.

> **Important:** This call answers `200 OK` even when the registration fails. A failure shows up as an empty `successfulEvidenceIds` and the **requirement instance id** in `failedEvidenceIds`. Always check `failedEvidenceIds` before moving on; the usual causes are a missing `asSubcontractorId`, a `filePaths` key that is not in storage, or missing permissions.

## Step 6: Approve the evidence

Approve the evidence you just registered. `issueDate` is required; send the same `issueDate` (and `expirationDate`, if any) you registered in Step 5 unless you want to correct them.

[`PUT /v1/companies/{companyId}/evidences/{evidenceId}/approve`](#tag/submissions/PUT/v1/companies/{companyId}/evidences/{evidenceId}/approve)

### Example: Approve

```bash
curl -X PUT "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/evidences/00000000-0000-0000-0000-000000000071/approve" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "issueDate": "2026-11-04",
    "expirationDate": "2027-11-04"
  }'
```

Response: `204 No Content`. No `asSubcontractorId` here — approving is a client action on your own requirement.

To confirm, repeat the Step 2 instance query: the evidence with the id from Step 5 now has `status: "APPROVED"`.

> **Note:** Having evidence review delegated to CTAIMA (document management) does not prevent you from approving: what gates Step 6 is `REVIEW` in the instance's `permissions` (Step 2).

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 (Step 3) | `asSubcontractorId` missing, or the contractor is not in a contract with your company. | Pass `contractor.id` from Step 2 as `asSubcontractorId`. |
| 403 (storage, Step 4) | The multipart POST does not match the presigned policy. | Send every `fields` entry unchanged, include `Content-Type`, and put the file last. |
| 200 with `failedEvidenceIds` (Step 5) | Registration failed downstream: missing `asSubcontractorId`, unknown `filePaths` key, or insufficient permissions. | Check the three causes; re-run Steps 3–5 if the presigned upload expired. |
| 400 (Step 5) | `expressValidation` or `requirementInstanceId` missing from the body, or not a boolean / UUID. | Always send both fields. |
| 403 (Step 6) | The API key user cannot review this requirement (`permissions` on the instance lacks `REVIEW`). | Use a user with review rights over the requirement's sites and teams. |
| 400 (Step 6) | Missing `issueDate`, or dates inconsistent with the requirement's expiration configuration. | Include a valid `issueDate`; check the requirement's `expirationType`. |

## Next Steps

- [Review and Approve Evidences](client-requirements-review-evidences.md) — approve or reject evidences uploaded by contractors.
- [Monitor Contractor Compliance](client-requirements-monitor-compliance.md) — check which instances are still missing or expiring.
- [See Assigned Resources and Their Risks](client-contracts-assigned-resources.md) — where the employee's assignments, and therefore their requirements, come from.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [api-support@twind.io](mailto:api-support@twind.io) for assistance.*
