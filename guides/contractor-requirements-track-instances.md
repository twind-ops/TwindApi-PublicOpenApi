# Track Your Pending Requirements

Every requirement a client demands from you materializes as a **requirement instance**: one obligation for one of your resources (or for your company), with a status and a deadline. Tracking them is how you always know what is missing and for when — before it blocks your people at the gate. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](../index.html#tag/user/GET/v1/users/me/companies).

## Step 1: List what is pending and for when

Filter by `status` (`PENDING_UPLOAD`, `REJECTED`, `EXPIRED`, `UNDER_GRACE_PERIOD`…) or use `excludeStatus=APPROVED` for everything unresolved. `onlyExpiringInFifteenDays=true` gives you the short-term risk; `clientIds` and `contractIds` narrow by client or contract.

[`GET /v1/companies/{companyId}/requirement-instances/as-contractor`](../index.html#tag/instances/GET/v1/companies/{companyId}/requirement-instances/as-contractor)

### Example: Everything unresolved, by client

```bash
curl -X GET "https://app.twinddev.com/api/v1/companies/00000000-0000-0000-0000-000000000002/requirement-instances/as-contractor?excludeStatus=APPROVED&sort=evidence_expiration,asc&page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000070",
      "requirement": { "id": "00000000-0000-0000-0000-000000000060", "name": "Work-at-height training certificate", "type": "UPLOAD", "critical": true },
      "client": { "id": "00000000-0000-0000-0000-000000000001", "name": "Industrial Corp", "taxId": "A11223344" },
      "subject": { "id": "00000000-0000-0000-0000-000000000030", "name": "John Smith", "type": "EMPLOYEE", "identifier": "12345678Z" },
      "contracts": [ { "id": "00000000-0000-0000-0000-000000000010", "name": "Plant maintenance 2026", "dateFrom": "2026-07-01" } ],
      "evidences": [
        { "id": "00000000-0000-0000-0000-000000000071", "status": "REJECTED", "uploadDate": "2026-06-10T11:20:00Z" }
      ],
      "isUpcomingDate": false
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

The instance `id` is what you need to submit evidence; the `evidences[].id` is what you need to see why something was rejected.

## Step 2: Open the instance to see what exactly is asked

The detail returns the requirement's full configuration — the `acceptanceCriteria` your evidence will be validated against, the expiration rules, and the `templateFile` to fill in, if any — plus the current evidence with its `reason` when rejected.

[`GET /v1/companies/{companyId}/requirement-instances/{instanceId}`](../index.html#tag/instances/GET/v1/companies/{companyId}/requirement-instances/{instanceId})

### Example: Get instance details

```bash
curl -X GET "https://app.twinddev.com/api/v1/companies/00000000-0000-0000-0000-000000000002/requirement-instances/00000000-0000-0000-0000-000000000070" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000070",
  "requirement": {
    "id": "00000000-0000-0000-0000-000000000060",
    "name": "Work-at-height training certificate",
    "evidenceType": "UPLOAD",
    "isCritical": true,
    "expirationType": "PERIODIC",
    "periodicity": 1,
    "periodicityType": "YEARS",
    "gracePeriod": 15,
    "acceptanceCriteria": [
      "Certificate is issued by an accredited training provider",
      "Employee name matches the assigned resource"
    ]
  },
  "evidence": {
    "id": "00000000-0000-0000-0000-000000000071",
    "status": "REJECTED",
    "reason": "The certificate does not name the employee.",
    "files": ["https://storage.twinddev.com/evidences/2026/06/certificate-john-smith.pdf"],
    "createdAt": "2026-06-10T11:20:00Z",
    "revisedAt": "2026-06-10T16:45:00Z"
  },
  "client": { "id": "00000000-0000-0000-0000-000000000001", "name": "Industrial Corp", "taxId": "A11223344" },
  "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L.", "taxId": "B12345678" },
  "subject": { "id": "00000000-0000-0000-0000-000000000030", "name": "John Smith", "type": "EMPLOYEE", "identifier": "12345678Z" }
}
```

## Step 3: Check the history when something is unclear

The audit log lists every event on the instance — submissions, approvals, rejections, status changes — with who did what and when.

[`GET /v1/companies/{companyId}/requirement-instances/{instanceId}/logs`](../index.html#tag/instances/GET/v1/companies/{companyId}/requirement-instances/{instanceId}/logs)

### Example: Get the audit log of an instance

```bash
curl -X GET "https://app.twinddev.com/api/v1/companies/00000000-0000-0000-0000-000000000002/requirement-instances/00000000-0000-0000-0000-000000000070/logs?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response: paginated event list (`eventName`, `createdBy`, `createdByCompany`, `createdAt`).

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 404 | Unknown `instanceId`, or the instance does not belong to your company's chain. | Re-fetch ids from Step 1. |
| 400 | Invalid filter value — e.g. an unknown `status`. | Fix the query parameters. |

## Next Steps

- [Submit an Agreement for a Requirement](contractor-requirements-submit-agreement.md) — resolve the pending instances you found here.
- [Track and Reuse Submitted Evidences](contractor-requirements-track-evidences.md) — follow the review outcome of what you submitted.
- [Monitor Contractor Compliance](client-requirements-monitor-compliance.md) — the same instances, seen from the client's side.
- Explore the [API Reference](../index.html) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
