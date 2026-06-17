# Submit an Agreement for a Requirement

Some requirements ask your company to accept a set of terms or policies rather than upload a document. When a requirement instance is of type `AGREEMENT`, you resolve it by submitting an acceptance — no file needed. This guide is written for **contractor** companies.

## Prerequisites

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **The requirement instance id** — from [Track Your Pending Requirements](contractor-requirements-track-instances.md). Check the instance detail to confirm `evidenceType` is `AGREEMENT`.

## Submit the acceptance

[`POST /v1/companies/{companyId}/evidences/agreement`](#tag/evidence/POST/v1/companies/{companyId}/evidences/agreement)

### Example: Accept an agreement requirement

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/evidences/agreement" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementInstanceId": "00000000-0000-0000-0000-000000000072"
  }'
```

Response (`201 Created`):

```json
{
  "id": "00000000-0000-0000-0000-000000000160"
}
```

The requirement instance moves to `PENDING_REVIEW`. The client then reviews and approves or rejects the submission.

To submit on behalf of a subcontractor in your chain, add `?asSubcontractorId={subcontractorCompanyId}` to the URL.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `asSubcontractorId` points outside your subcontractor chain. | Ensure your user has the necessary permissions; check the subcontractor id. |
| 400 | Submitting against an upload-type instance. | Check `evidenceType` in the instance detail. |
| 404 | Unknown `requirementInstanceId`. | Re-fetch it from [Track Your Pending Requirements](contractor-requirements-track-instances.md). |

## Next Steps

- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — find requirement instance ids and check their status.
- [Track and Reuse Submitted Documents](contractor-requirements-track-evidences.md) — follow the review outcome of what you submitted.
- [Review and Approve Submissions](client-requirements-review-evidences.md) — the client-side flow that decides on your submission.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
