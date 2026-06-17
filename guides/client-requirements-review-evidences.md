# Review and Approve Evidences

When contractors submit evidences for your requirements, someone has to validate them: approve the ones that satisfy your acceptance criteria and reject the rest, with a reason the contractor can act on. Only approved evidences count towards compliance. This guide is written for **client** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Evidence review not delegated** — if your company has document management delegated (evidences reviewed by CTAIMA), the approve and reject calls in Step 3 return **403 "User cannot review requirement"** for every evidence. This flow applies only when your company reviews its own evidences.

## Step 1: Find the evidences waiting for review

List your requirement instances and pick those whose `evidences` array carries an entry in `PENDING_REVIEW` — that is the one to review. Filter by `requirementIds` (ids from your [requirements list](client-requirements-configure.md)), or use `excludeStatus=APPROVED` to see everything still open.

[`GET /v1/companies/{companyId}/requirement-instances/as-client`](#tag/instances/GET/v1/companies/{companyId}/requirement-instances/as-client)

### Example: List instances pending review

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirement-instances/as-client?requirementIds=00000000-0000-0000-0000-000000000060&page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
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
        {
          "id": "00000000-0000-0000-0000-000000000071",
          "status": "PENDING_REVIEW",
          "uploadDate": "2026-06-10T11:20:00Z"
        }
      ]
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Keep the **evidence id** (`evidences[].id`) for the next steps.

> **Note:** The instance-level `status=PENDING_REVIEW` filter can return no results even when instances with pending evidences exist (other status values filter fine). Until that is fixed, filter as in the example and read `evidences[].status` instead.

## Step 2: Inspect the evidence

Fetch the evidence details: the uploaded `files` (URLs), the contractor's declared `dateOfIssue`, and any `comment`.

[`GET /v1/companies/{companyId}/evidences/{evidenceId}`](#tag/evidence/GET/v1/companies/{companyId}/evidences/{evidenceId})

### Example: Get evidence details

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/evidences/00000000-0000-0000-0000-000000000071" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000071",
  "status": "PENDING_REVIEW",
  "files": ["https://storage.twind.io/evidences/2026/06/certificate-john-smith.pdf"],
  "dateOfIssue": "2026-06-01",
  "comment": "Renewed certificate, valid for one year.",
  "createdAt": "2026-06-10T11:20:00Z"
}
```

## Step 3: Approve or reject

Both decisions require the **`issueDate`** — the date the document was actually issued, which drives the expiration calculation. When rejecting, include a `reason` and, if it helps the contractor, the specific `rejectedAcceptanceCriteria`.

[`PUT /v1/companies/{companyId}/evidences/{evidenceId}/approve`](#tag/evidence/PUT/v1/companies/{companyId}/evidences/{evidenceId}/approve) · [`PUT .../reject`](#tag/evidence/PUT/v1/companies/{companyId}/evidences/{evidenceId}/reject)

### Example: Approve

```bash
curl -X PUT "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/evidences/00000000-0000-0000-0000-000000000071/approve" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "issueDate": "2026-06-01",
    "expirationDate": "2027-06-01"
  }'
```

Response: `200 OK` (no body).

### Example: Reject with actionable feedback

```bash
curl -X PUT "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/evidences/00000000-0000-0000-0000-000000000071/reject" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "issueDate": "2026-06-01",
    "reason": "The certificate does not name the employee.",
    "rejectedAcceptanceCriteria": [
      "Employee name matches the assigned resource"
    ]
  }'
```

Response: `200 OK` (no body). The instance returns to `PENDING_UPLOAD` and the contractor sees your reason.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not a company your user belongs to. | Ensure your user has the necessary permissions for this action. |
| 403 "User cannot review requirement" | Your company has evidence review delegated (document management enabled) — the API refuses approve/reject for any evidence. | Reviews are handled by CTAIMA in that setup; use this flow only when review is not delegated. |
| 400 | Missing `issueDate`, or dates inconsistent with the requirement's expiration configuration. | Include a valid `issueDate`; check the requirement's `expirationType`. |
| 404 | Unknown `evidenceId`, or the evidence was already reviewed. | Re-list pending instances (Step 1) and use a current id. |

## Next Steps

- [Monitor Contractor Compliance](client-requirements-monitor-compliance.md) — the broader view these decisions feed into.
- [Configure the Requirements You Demand from Contractors](client-requirements-configure.md) — where the acceptance criteria come from.
- [Submit an Agreement for a Requirement](contractor-requirements-submit-agreement.md) — the contractor-side flow that produces what you review here.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
