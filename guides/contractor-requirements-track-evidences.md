# Single Submission: Reuse Evidence Across Requirements

When a requirement is configured for **single submission**, one approved document can satisfy multiple matching instances across contracts or clients — so you never upload the same file twice. This guide walks through the full flow: submit the document on the original instance, retrieve which other instances qualify, and propagate it to the ones you choose. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **An instance id** — the original instance you are submitting the document for. Retrieve pending instances from [Track Your Pending Requirements](contractor-requirements-track-instances.md). The instance must be in `PENDING_UPLOAD`, `REJECTED`, or `EXPIRED` state.

## Step 1: Submit the document to the instance

Upload the document directly to the instance. This creates the submission in `PENDING_REVIEW` state on the original instance and triggers the single-submission matching process.

[`POST /v1/companies/{companyId}/requirement-instances/{instanceId}/evidences`](#tag/requirement-instances/POST/v1/companies/{companyId}/requirement-instances/{instanceId}/evidences)

Send the request as `multipart/form-data`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | file | Yes | The document file to upload. |
| `dateOfIssue` | string (date) | Yes | Issue date of the document (`YYYY-MM-DD`). |
| `expirationDate` | string (date) | No | Expiration date of the document (`YYYY-MM-DD`). Omitting it may reduce or eliminate matches in Step 2, since the matching criteria filters by expiration date against destination contract start dates. |

### Example: Submit a document to an instance

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/requirement-instances/00000000-0000-0000-0000-000000000050/evidences" \
  -H "X-Api-Key: your-api-key-here" \
  -F "file=@/path/to/insurance-certificate.pdf" \
  -F "dateOfIssue=2026-01-01" \
  -F "expirationDate=2027-01-01"
```

Response (`201 Created`):

```json
{
  "id": "00000000-0000-0000-0000-000000000071"
}
```

The returned `id` is the **evidence id** — you will need it in Step 3. The submission is now in `PENDING_REVIEW` on the original instance.

## Step 2: Get the matching instances

Retrieve all other instances that qualify for single-submission reuse from the document submitted in Step 1. The system matches instances that share:

- The same **subject type** (`EMPLOYEE`, `VEHICLE`, `EQUIPMENT`, or `CONTRACTOR`)
- The same **resource** (via applicability records)
- The same **document type**
- No valid submission already (no instance in `APPROVED`, `PENDING_REVIEW`, or `UNDER_GRACE_PERIOD` state)
- A document expiration date later than the destination contract's start date

The response groups matches by client so the user can review and select which instances to propagate to.

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

Use this list to let the user select which instances to propagate to. Pass only ids from this list in Step 3 — any id outside this set will fail validation.

## Step 3: Propagate the document to selected instances

Apply the submission from Step 1 to the instances the user selected from the matches in Step 2. The API validates that every id you send is a subset of the matches returned in Step 2 — if any id was not in the match list, the call fails.

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
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 400 | Instance not in a submittable state (`PENDING_UPLOAD`, `REJECTED`, or `EXPIRED`). | Check the instance status before submitting. |
| 400 | An id in Step 3 was not returned by the matches endpoint. | Send only ids from the Step 2 response. |
| 404 | Unknown `instanceId` or `evidenceId`. | Re-fetch ids from your instance list. |

## Next Steps

- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — see all pending instances across your contracts.
- [Track Submission Status and Review Outcome](contractor-requirements-track-submission-status.md) — check whether the submission was approved or rejected after propagation.
- [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) — presigned upload mechanics when resubmitting a corrected document.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
