# Monitor Contractor Compliance

While your contractors work, you want to know at any moment what documentation is missing, expired or about to expire — before it blocks access to your sites. The unit of monitoring is the **requirement instance**: one requirement applied to one contractor resource (or to the company itself). This guide is written for **client** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).

## Step 1: List the instances that need attention

Filter the instance list by `status` (one of `APPROVED`, `REJECTED`, `PENDING_REVIEW`, `PENDING_UPLOAD`, `UNDER_GRACE_PERIOD`, `EXPIRED`, `PENDING_VALIDITY`) or invert with `excludeStatus=APPROVED` to see everything unresolved. Other useful filters: `contractorIds`, `contractIds`, `siteIds`, `onlyCriticalRequirements`. Sort by `evidence_expiration` to chase the most urgent first.

[`GET /v1/companies/{companyId}/requirement-instances/as-client`](#tag/instances/GET/v1/companies/{companyId}/requirement-instances/as-client)

### Example: Everything unresolved, most urgent first

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirement-instances/as-client?excludeStatus=APPROVED&sort=evidence_expiration,asc&page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000070",
      "requirement": { "id": "00000000-0000-0000-0000-000000000060", "name": "Work-at-height training certificate", "type": "UPLOAD", "critical": true },
      "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L.", "taxId": "B12345678" },
      "subject": { "id": "00000000-0000-0000-0000-000000000030", "name": "John Smith", "type": "EMPLOYEE", "identifier": "12345678Z" },
      "contracts": [ { "id": "00000000-0000-0000-0000-000000000010", "name": "Plant maintenance 2026", "dateFrom": "2026-07-01" } ],
      "evidences": [
        { "id": "00000000-0000-0000-0000-000000000071", "status": "EXPIRED", "expiration": "2026-05-30", "tolerance": "2026-06-14" }
      ],
      "isUpcomingDate": false
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

`tolerance` is the expiration plus the requirement's grace period — the real deadline before the instance counts as non-compliant.

## Step 2: Drill into one instance

The instance detail returns the full requirement configuration (acceptance criteria, expiration rules, template), the current evidence with its status and files, and the parties involved. The audit log tells you what happened and when — submissions, approvals, rejections, status changes — useful when a contractor disputes a rejection.

[`GET /v1/companies/{companyId}/requirement-instances/{instanceId}`](#tag/instances/GET/v1/companies/{companyId}/requirement-instances/{instanceId}) · [`GET .../{instanceId}/logs`](#tag/instances/GET/v1/companies/{companyId}/requirement-instances/{instanceId}/logs)

### Example: Audit trail of an instance

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirement-instances/00000000-0000-0000-0000-000000000070/logs?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "eventName": "EVIDENCE_REJECTED",
      "createdBy": { "id": "auth0|64f1c2d3e4a5b6c7d8e9f0a1", "name": "Carlos Ruiz" },
      "createdByCompany": { "id": "00000000-0000-0000-0000-000000000001", "name": "Industrial Corp" },
      "createdAt": "2026-06-10T16:45:00Z"
    },
    {
      "eventName": "EVIDENCE_SUBMITTED",
      "createdBy": { "id": "auth0|75a2b3c4d5e6f7a8b9c0d1e2", "name": "Jane Doe" },
      "createdByCompany": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L." },
      "createdAt": "2026-06-10T11:20:00Z"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 2, "totalPages": 1 }
}
```

> **Note:** For instances with child requirements, `GET .../{instanceId}/eligible-resources` lists the resources (employees, vehicles, equipment) the child instances can apply to.

## Step 3: Measure a requirement across contractors

For a per-requirement view — e.g. before tightening a critical requirement — the stats endpoint tells you how many contractors are affected by it.

[`GET /v1/companies/{companyId}/requirements/{requirementId}/stats`](#tag/configuration/GET/v1/companies/{companyId}/requirements/{requirementId}/stats)

### Example: Get requirement stats

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirements/00000000-0000-0000-0000-000000000060/stats" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "contractorsAffected": 12
}
```

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | `companyId` is not a company your user belongs to. | Use a user of the client company. |
| 404 | Unknown `instanceId` or `requirementId`, or the instance belongs to another company's chain. | Re-fetch ids from Step 1. |
| 400 | Invalid filter value — e.g. an unknown `status` (allowed: `APPROVED`, `REJECTED`, `PENDING_REVIEW`, `PENDING_UPLOAD`, `UNDER_GRACE_PERIOD`, `EXPIRED`, `PENDING_VALIDITY`). | Fix the query parameters. |

## Next Steps

- [Review and Approve Evidences](client-requirements-review-evidences.md) — act on the `PENDING_REVIEW` instances you find here.
- [Configure the Requirements You Demand from Contractors](client-requirements-configure.md) — adjust the requirements behind the numbers.
- [Track Your Pending Requirements](contractor-requirements-track-instances.md) — the same instances, seen from the contractor's side.
- Explore the [API Reference](../index.html) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
