# Single Submission: Reuse Evidence Across Requirements

When a requirement is configured for **single submission**, one approved document can satisfy multiple matching instances across contracts or clients — so you never upload the same file twice. This guide walks through the full flow: upload the document, retrieve which other instances qualify, and propagate it to the ones you choose. This guide is written for **contractor** companies on the **Core plan or higher**.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **An instance id** — the original instance you are submitting the document for. Retrieve pending instances from [Track Your Pending Requirements](contractor-requirements-track-instances.md). The instance must be in `PENDING_UPLOAD`, `REJECTED`, or `EXPIRED` state.
- **Core plan or higher** — the single submission feature is not available on the Basic plan.

## Step 1: Upload the document to the instance

The upload is a two-part process: upload the file to object storage, then register the submission against the requirement instance. The full mechanics are covered in [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) — follow Steps 1 and 2 of that guide to obtain the file storage key, then come back here for the registration call below.

### Register the submission

[`POST /v1/companies/{companyId}/evidences/upload`](#tag/submissions/POST/v1/companies/{companyId}/evidences/upload)

The URL is company-scoped, but the submission is always tied to a specific requirement instance via `requirementInstanceId` in the body.

| Field | Required | Description |
| --- | --- | --- |
| `requirementInstanceId` | Yes | The instance id from the Prerequisites. |
| `issueDate` | Yes | Issue date of the document (`YYYY-MM-DD`). |
| `expirationDate` | No | Expiration date (`YYYY-MM-DD`). Include it — matches in Step 2 are filtered against each destination contract's start date, so omitting it may reduce or eliminate results. |
| `filePaths` | Yes | Storage keys from the presigned upload (see [Upload Documents for a Requirement](contractor-requirements-upload-documents.md)). |
| `expressValidation` | Yes | Send `false` unless the client has document management enabled. |

### Example

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/upload" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementInstanceId": "00000000-0000-0000-0000-000000000050",
    "issueDate": "2026-01-01",
    "expirationDate": "2027-01-01",
    "filePaths": [
      "evidences/00000000-0000-0000-0000-000000000002/00000000-0000-0000-0000-000000000050/2026-06-22/insurance-certificate.pdf"
    ],
    "expressValidation": false
  }'
```

Response (`200 OK`):

```json
{
  "successfulEvidenceIds": ["00000000-0000-0000-0000-000000000071"],
  "failedEvidenceIds": []
}
```

Take the first entry from `successfulEvidenceIds` — this is the **evidence id** you will need in Step 3. The instance is now in `PENDING_REVIEW`.

## Step 2: Get the matching instances

Retrieve all other instances that qualify for single-submission reuse. The system matches instances that share:

- The same **subject type** (`EMPLOYEE`, `VEHICLE`, `EQUIPMENT`, or `CONTRACTOR`)
- The same **resource** (via applicability records)
- The same **document type**
- No valid submission already (no instance in `APPROVED`, `PENDING_REVIEW`, or `UNDER_GRACE_PERIOD` state)
- A document expiration date later than the destination contract's start date

The response groups matches by client so you can review and select which instances to propagate to.

[`GET /v1/companies/{companyId}/requirement-instances/{instanceId}/matches`](#tag/requirement-instances/GET/v1/companies/{companyId}/requirement-instances/{instanceId}/matches)

### Example: Get matches for an instance

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/requirement-instances/00000000-0000-0000-0000-000000000050/matches" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
[
  {
    "clientId": "00000000-0000-0000-0000-000000000001",
    "clientName": "Industrial Corp",
    "matches": [
      {
        "requirementInstanceId": "00000000-0000-0000-0000-000000000161",
        "contractName": "Plant maintenance 2026",
        "siteName": "North Plant"
      },
      {
        "requirementInstanceId": "00000000-0000-0000-0000-000000000162",
        "contractName": "Plant maintenance 2026",
        "siteName": "South Plant"
      }
    ]
  }
]
```

Pass only ids from this response in Step 3 — any id outside this set will fail validation.

## Step 3: Propagate the document to selected instances

Apply the submission from Step 1 to the instances you selected from the matches in Step 2. The API validates that every id you send is a subset of the matches returned in Step 2 — if any id was not in the match list, the call fails.

[`POST /v1/companies/{companyId}/evidences/{evidenceId}/matching-requirement-instances`](#tag/submissions/POST/v1/companies/{companyId}/evidences/{evidenceId}/matching-requirement-instances)

### Example: Propagate a document to selected instances

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/00000000-0000-0000-0000-000000000071/matching-requirement-instances" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementInstanceIds": [
      "00000000-0000-0000-0000-000000000161",
      "00000000-0000-0000-0000-000000000162"
    ]
  }'
```

Response: `200 OK` (no body). The selected instances now carry the same document.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company, or your plan does not include single submission. | Ensure your company is on the Core plan or higher and your API key has the required permissions. |
| 400 | **Step 3:** An id was not returned by the matches endpoint. | Send only ids from the Step 2 response. |
| 404 | Unknown `instanceId` or `evidenceId`. | Re-fetch ids from your instance list. |

## Next Steps

- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — see all pending instances across your contracts.
- [Track Submission Status and Review Outcome](contractor-requirements-track-submission-status.md) — check whether the submission was approved or rejected after propagation.
- [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) — full presigned upload mechanics.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
