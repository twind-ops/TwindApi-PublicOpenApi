# Upload Documents for a Requirement

When a requirement instance asks you to provide a document, you upload the file to storage and then register it against the requirement. This guide covers the full flow: getting a presigned URL, uploading the file, and registering it — including multi-file submissions. This guide is written for **contractor** companies.

## Prerequisites

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **The requirement instance id** — from [Track Your Pending Requirements](contractor-requirements-track-instances.md). Check the instance detail to confirm `evidenceType` is `UPLOAD`.

> **Note — two different ids.** Steps 1–2 use the **requirement instance id** to get a presigned URL and upload the file. The **submission record id** is different: it only exists after Step 3 and is returned in `successfulEvidenceIds`. Use that id when fetching or referencing the submission later.

## Step 1: Get a presigned upload URL

Request a presigned POST URL for your file. `contentType` and `fileName` are required; `contentType` must be one of the accepted MIME types (see [Supported content types](#supported-content-types)).

[`GET /v1/companies/{companyId}/evidences/{requirementInstanceId}/temporary-upload-url`](#tag/submissions/GET/v1/companies/{companyId}/evidences/{requirementInstanceId}/temporary-upload-url)

### Example: Get the upload URL

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/00000000-0000-0000-0000-000000000070/temporary-upload-url?contentType=application%2Fpdf&fileName=insurance-policy.pdf" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "url": "https://your-bucket.s3.region.amazonaws.com",
  "fields": {
    "key": "evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-06-11/insurance-policy.pdf",
    "x-amz-algorithm": "AWS4-HMAC-SHA256",
    "x-amz-credential": "…",
    "x-amz-date": "…",
    "policy": "…",
    "x-amz-signature": "…",
    "x-amz-security-token": "…"
  }
}
```

`url` is the storage endpoint to POST the file to; `fields.key` is the storage key for this file — save it, it goes into `filePaths` in Step 3.

## Step 2: Upload the file to storage

POST the file to `url` as `multipart/form-data`, sending **every** entry of `fields` as a form field (names and values unchanged), **plus a `Content-Type` field you add yourself**, plus the file itself.

### Example: Upload the file to storage

```bash
curl -X POST "$URL_FROM_STEP_1" \
  -F "key=evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-06-11/insurance-policy.pdf" \
  -F "x-amz-algorithm=AWS4-HMAC-SHA256" \
  -F "x-amz-credential=…" \
  -F "x-amz-date=…" \
  -F "policy=…" \
  -F "x-amz-signature=…" \
  -F "x-amz-security-token=…" \
  -F "Content-Type=application/pdf" \
  -F "file=@./insurance-policy.pdf;type=application/pdf"
```

> **Important:** `fields` does **not** include `Content-Type`, but the presigned policy requires it: append a `Content-Type` form field yourself with the exact `contentType` value you sent in Step 1 (as in the example above), or storage replies **403** — sending it only as the MIME type of the file part is not enough.

**Multiple files:** repeat Steps 1–2 once per file — each file gets its own presigned URL and `key`. You then register all keys together in a single Step 3 call.

## Step 3: Register the document

Once every file is in storage, register the submission against the requirement instance in one call.

[`POST /v1/cm/companies/{companyId}/evidences/upload`](#tag/submissions/POST/v1/cm/companies/{companyId}/evidences/upload)

> **Note:** This route lives under `/v1/cm/...` while the presigned-URL route lives under `/v1/...` — the two prefixes are intentional; use each URL as documented.

| Field | Required | Description |
| --- | --- | --- |
| `requirementInstanceId` | Yes | The same instance used in Step 1. |
| `issueDate` | Yes | Date the document was issued (`YYYY-MM-DD`); drives the expiration calculation. |
| `filePaths` | Yes | One entry per uploaded file — the `fields.key` values from Step 1. |
| `expirationDate` | No | Explicit document expiration, when applicable. |
| `comments` | No | Note for the reviewer; **required** when `requirementDoesNotApply` is `true`. |
| `requirementDoesNotApply` | No | Marks the requirement as not applicable instead of providing a document. |
| `expressValidation` | Yes | Requests express validation; needs document management enabled for the client. Send `false` unless that applies — the API rejects bodies without the field. |
| `createdAt` | No | Defaults to server time. |

### Example: Register a document with two files

```bash
curl -X POST "https://app.twind.io/api/v1/cm/companies/00000000-0000-0000-0000-000000000002/evidences/upload" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementInstanceId": "00000000-0000-0000-0000-000000000070",
    "issueDate": "2026-06-01",
    "expirationDate": "2027-06-01",
    "expressValidation": false,
    "filePaths": [
      "evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-06-11/insurance-policy.pdf",
      "evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000070/2026-06-11/insurance-receipt.pdf"
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

The server verifies that every `filePaths` entry exists in storage; the instance then moves to `PENDING_REVIEW`. To submit on behalf of a subcontractor in your chain, add `?asSubcontractorId={subcontractorCompanyId}` to **both** the Step 1 and Step 3 URLs.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `asSubcontractorId` points outside your subcontractor chain. | Ensure your user has the necessary permissions; check the subcontractor id. |
| 400 | A `filePaths` entry not found in storage, an unsupported `contentType` in Step 1, a missing `expressValidation`, `requirementDoesNotApply` without `comments`, or `expressValidation: true` without document management. | Re-check the keys from Step 1 and include `"expressValidation": false`. |
| 404 | Unknown `requirementInstanceId`. | Re-fetch it from [Track Your Pending Requirements](contractor-requirements-track-instances.md). |
| 403 (storage) | The multipart POST does not match the presigned policy. | Send all `fields` unchanged and add the named `Content-Type` form field. |

## Supported content types

Pass one of these MIME types as `contentType` in Step 1, and echo the same string as the `Content-Type` form field in Step 2:

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

## Next Steps

- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — find requirement instance ids and check their status.
- [Track and Reuse Submitted Documents](contractor-requirements-track-evidences.md) — follow the review outcome of what you submitted.
- [Review and Approve Submissions](client-requirements-review-evidences.md) — the client-side flow that decides on your submission.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
