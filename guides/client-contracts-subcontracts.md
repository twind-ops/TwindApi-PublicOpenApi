# Review and Approve Subcontract Requests

When a contractor needs another company to take part of the work, it submits a **subcontract request** that you, as the client, approve or reject. This keeps you in control of who actually works in your contract chain. This guide is written for **client** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Subcontracting enabled** — requests only arrive for contracts whose `subcontracting` configuration allows subcontracting with authorization (see [Create a Contract with a Contractor](client-contracts-create.md)).

## Step 1: List pending subcontract requests

List the subcontract requests waiting for your decision. Narrow the list with the optional `contractId` and `siteId` query parameters.

[`GET /v2/companies/{companyId}/subcontracts/requests`](#tag/subcontracts/GET/v2/companies/{companyId}/subcontracts/requests)

### Example: List pending requests

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/subcontracts/requests?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "requestId": "00000000-0000-0000-0000-000000000100",
      "parentContractId": "00000000-0000-0000-0000-000000000010",
      "siteId": "00000000-0000-0000-0000-000000000020",
      "activityIds": ["00000000-0000-0000-0000-000000000090"],
      "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L." },
      "subcontractor": { "id": "00000000-0000-0000-0000-000000000003", "name": "Volt Subworks S.A." },
      "dateFrom": "2026-07-01",
      "dateTo": "2026-12-31",
      "status": "PENDING",
      "createdAt": "2026-06-01T09:30:00Z"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Each request tells you who wants to subcontract (`contractor`), to whom (`subcontractor`), and the scope: a site of the parent contract plus the activities to delegate there. Keep the `requestId` for the next step.

## Step 2: Approve or reject the request

Approving creates a child contract for the subcontractor under the parent contract — its resources become subject to your requirements and access control like any direct contractor.

[`PUT /v2/companies/{companyId}/subcontracts/requests/{requestId}/approve`](#tag/subcontracts/PUT/v2/companies/{companyId}/subcontracts/requests/{requestId}/approve)

### Example: Approve a request

```bash
curl -X PUT "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/subcontracts/requests/00000000-0000-0000-0000-000000000100/approve" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`) — the id(s) of the child contract(s) created:

```json
{
  "ids": ["00000000-0000-0000-0000-000000000011"]
}
```

[`PUT /v2/companies/{companyId}/subcontracts/requests/{requestId}/reject`](#tag/subcontracts/PUT/v2/companies/{companyId}/subcontracts/requests/{requestId}/reject)

### Example: Reject a request

```bash
curl -X PUT "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/subcontracts/requests/00000000-0000-0000-0000-000000000100/reject" \
  -H "X-Api-Key: your-api-key-here"
```

Response: `204 No Content` — the pending request is removed.

> **Note:** Rejection takes no request body — a rejection reason is **not** stored via this endpoint. If you need to tell the contractor why, do it through your usual communication channel.

## Step 3: Audit the subcontracts at a site

At any time you can list the subcontracts hanging from one site of a contract, with their activities and approval status. Site ids come from the contract detail, [`GET /v2/companies/{companyId}/contracts/{contractId}`](#tag/contract-listings/GET/v2/companies/{companyId}/contracts/{contractId}).

[`GET /v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}/subcontracts`](#tag/subcontracts/GET/v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}/subcontracts)

### Example: List subcontracts at a site

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/contracts/00000000-0000-0000-0000-000000000010/sites/00000000-0000-0000-0000-000000000020/subcontracts" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
[
  {
    "contractId": "00000000-0000-0000-0000-000000000011",
    "subcontractor": { "id": "00000000-0000-0000-0000-000000000003", "name": "Volt Subworks S.A." },
    "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
    "dateFrom": "2026-07-01",
    "dateTo": "2026-12-31",
    "approvalStatus": "APPROVED",
    "hasSubcontracts": false
  }
]
```

`approvalStatus` is `PENDING` or `APPROVED`; `hasSubcontracts` tells you whether this subcontractor has subcontracted further down. For the whole chain at once, `GET /v2/companies/{companyId}/contracts/{contractId}/tree` returns the full contract hierarchy.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions for approve/reject, or `companyId` is not a company your user belongs to. | Ensure your user has the necessary permissions for this action. |
| 404 | Unknown `requestId`, `contractId` or `siteId`, or the request was already decided. | Re-list requests (Step 1) and use a current id. |

## Next Steps

- [Create a Contract with a Contractor](client-contracts-create.md) — where the subcontracting rules (`allowed`, `maxLevel`, `needsAuthorization`) are set.
- [See Assigned Resources and Their Risks](client-contracts-assigned-resources.md) — the approved subcontractor's resources appear in your assigned-resources views.
- Explore the [API Reference](../index.html) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
