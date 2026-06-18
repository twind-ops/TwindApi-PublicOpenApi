# Track and Reuse Submitted Evidences

After submitting an evidence you want to know its review outcome — and when it is rejected, exactly why, so the fix is fast. For **single-submission** requirements, one approved document can also be applied to several matching instances, so you never upload the same file twice. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **An evidence record id** — returned when you [submit evidence](contractor-requirements-submit-agreement.md), or taken from the `evidences[].id` of your [instance list](contractor-requirements-track-instances.md).

## Step 1: Check the review outcome

The evidence detail shows the current `status`, and — when rejected — the reviewer's `reason` and the specific `rejectedAcceptanceCriteria` that failed.

[`GET /v1/companies/{companyId}/evidences/{evidenceId}`](#tag/submissions/GET/v1/companies/{companyId}/evidences/{evidenceId})

### Example: Get the evidence status

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/00000000-0000-0000-0000-000000000071" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000071",
  "status": "REJECTED",
  "reason": "The certificate does not name the employee.",
  "rejectedAcceptanceCriteria": ["Employee name matches the assigned resource"],
  "files": ["https://storage.twind.io/evidences/2026/06/certificate-john-smith.pdf"],
  "dateOfIssue": "2026-06-01",
  "createdAt": "2026-06-10T11:20:00Z",
  "revisedAt": "2026-06-10T16:45:00Z"
}
```

A rejected evidence is fixed by submitting a **new** evidence for the same instance (see [Submit an Agreement for a Requirement](contractor-requirements-submit-agreement.md)) — rejection feedback tells you what to change.

## Step 2: Update evidence flags

The evidence update currently covers the `expressValidation` flag (when your client allows express-validated submissions).

[`PATCH /v1/companies/{companyId}/evidences/{evidenceId}`](#tag/submissions/PATCH/v1/companies/{companyId}/evidences/{evidenceId})

### Example: Mark an evidence for express validation

```bash
curl -X PATCH "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/00000000-0000-0000-0000-000000000071" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{ "expressValidation": true }'
```

Response: `204 No Content`.

## Step 3: Reuse a single-submission evidence

When a requirement allows **single submission**, one evidence (e.g. a company-level insurance policy) can satisfy several requirement instances across contracts or clients. Apply the source evidence to the matching instances in one call — only instances allowed by the single-submission rules and your visibility are accepted.

[`POST /v1/companies/{companyId}/evidences/{evidenceId}/matching-requirement-instances`](#tag/submissions/POST/v1/companies/{companyId}/evidences/{evidenceId}/matching-requirement-instances)

### Example: Apply one evidence to two more instances

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

Response: `200 OK` (no body). The target instances now carry the same evidence.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 400 | A target instance does not match the single-submission rules (different requirement, or outside your visibility). | Send only instances of the same single-submission requirement. |
| 404 | Unknown `evidenceId` or `requirementInstanceIds` entry. | Re-fetch ids from your instance list. |

## Next Steps

- [Submit an Agreement for a Requirement](contractor-requirements-submit-agreement.md) — submit the corrected document after a rejection.
- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — see the instance-level picture.
- [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) — presigned upload mechanics when resubmitting a corrected document.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
