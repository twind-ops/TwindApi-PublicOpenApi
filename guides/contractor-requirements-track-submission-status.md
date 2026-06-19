# Track Submission Status and Review Outcome

After submitting a document you want to know whether it was approved or rejected — and if rejected, exactly why, so the fix is fast. This guide covers how to check the review outcome of a submission and how to request express review when your client has that feature enabled. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **A submission id** — returned when you submit a document (see [Upload Documents for a Requirement](contractor-requirements-upload-documents.md)), an agreement (see [Submit an Agreement for a Requirement](contractor-requirements-submit-agreement.md)), or a single-submission propagation (see [Single Submission: Reuse Evidence Across Requirements](contractor-requirements-track-evidences.md)); or taken from the `evidences[].id` field of your [instance list](contractor-requirements-track-instances.md).

## Step 1: Check the review outcome

Fetch the submission detail to see its current `status`. When the submission is rejected, the response includes the reviewer's `reason` and the specific `rejectedAcceptanceCriteria` that failed — use these to understand exactly what needs to change before resubmitting.

[`GET /v1/companies/{companyId}/evidences/{evidenceId}`](#tag/submissions/GET/v1/companies/{companyId}/evidences/{evidenceId})

### Example: Get the submission status

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/00000000-0000-0000-0000-000000000071" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

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

Possible `status` values:

| Status | Meaning |
| --- | --- |
| `PENDING_REVIEW` | Submitted, waiting for the client to review. |
| `APPROVED` | Accepted — the instance is compliant. |
| `REJECTED` | Rejected — see `reason` and `rejectedAcceptanceCriteria` for details. |
| `UNDER_GRACE_PERIOD` | Previously approved but nearing expiration; still counts as valid. |

A rejected submission is fixed by resubmitting — see [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) for document-type requirements, or [Submit an Agreement for a Requirement](contractor-requirements-submit-agreement.md) for agreement-type ones.

## Step 2: Request express review (optional)

If your client has document management enabled, you can flag a `PENDING_REVIEW` submission for express review. This consumes review credits on the client side and moves the submission to the front of the review queue.

[`PATCH /v1/companies/{companyId}/evidences/{evidenceId}`](#tag/submissions/PATCH/v1/companies/{companyId}/evidences/{evidenceId})

### Example: Request express review

```bash
curl -X PATCH "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/00000000-0000-0000-0000-000000000071" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{ "expressValidation": true }'
```

Response: `204 No Content`.

> This call only succeeds when the target client has the document management product enabled and the submission is still in `PENDING_REVIEW`. Attempting it on an already-reviewed submission returns `400`.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 400 | Express review requested but document management is not enabled for the client, or the submission is no longer in `PENDING_REVIEW`. | Check the submission status before requesting express review. |
| 404 | Unknown submission id. | Re-fetch the id from your instance list. |

## Next Steps

- [Upload Documents for a Requirement](contractor-requirements-upload-documents.md) — resubmit a corrected document after a rejection.
- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — see all pending instances across your contracts.
- [Single Submission: Reuse Evidence Across Requirements](contractor-requirements-track-evidences.md) — propagate a submitted document to multiple matching requirements.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
