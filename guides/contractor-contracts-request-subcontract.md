# Request to Subcontract Part of the Work

When your company needs another company to take part of the work under one of your contracts, you submit a **subcontract request** scoped to a site and its activities. Once the client approves it, the subcontractor gets its own child contract under the same chain — subject to the same requirements and access control. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **The subcontractor registered** — the company you subcontract to must exist on the platform. If it does not, create it with `POST /v1/companies/{id}/contractors`.
- **Subcontracting allowed** — the parent contract's `subcontracting` configuration must allow it (`allowed: true` and the chain below `maxLevel`). Check it in the contract detail (Step 1).

## Step 1: Identify the scope to delegate

Fetch the parent contract detail to confirm the subcontracting rules and pick the site and activities to delegate.

[`GET /v2/companies/{companyId}/contracts/{contractId}`](#tag/contract-listings/GET/v2/companies/{companyId}/contracts/{contractId})

### Example: Check the contract before requesting

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/contracts/00000000-0000-0000-0000-000000000010" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000010",
  "name": "Plant maintenance 2026",
  "subcontracting": { "allowed": true, "onlyClientAllowed": null, "maxLevel": 1, "needsAuthorization": true },
  "sites": [
    {
      "siteId": "00000000-0000-0000-0000-000000000020",
      "name": "North Plant",
      "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
      "hasSubcontracts": false
    }
  ]
}
```

`needsAuthorization: true` means your request will wait for the client's approval.

## Step 2: Submit the subcontract request

Submit one request per subcontractor: the body takes the subcontractor company ids, the site, the activities to delegate there, and the date range. The path `contractorId` is **your** company; `parentContractId` is the contract you are delegating from.

[`POST /v2/companies/{contractorId}/contracts/{parentContractId}/subcontracts/requests`](#tag/subcontracts/POST/v2/companies/{contractorId}/contracts/{parentContractId}/subcontracts/requests)

### Example: Request a subcontract

```bash
curl -X POST "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/contracts/00000000-0000-0000-0000-000000000010/subcontracts/requests" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorIds": ["00000000-0000-0000-0000-000000000003"],
    "siteId": "00000000-0000-0000-0000-000000000020",
    "activityIds": ["00000000-0000-0000-0000-000000000090"],
    "dateFrom": "2026-07-01",
    "dateTo": "2026-12-31"
  }'
```

Response (`200 OK`) — one request id per subcontractor in `contractorIds`:

```json
{
  "ids": ["00000000-0000-0000-0000-000000000100"]
}
```

> **Note:** If the parent contract does **not** require authorization (`needsAuthorization: false`), you can create the subcontract directly with [`POST /v2/companies/{contractorId}/contracts/{parentContractId}/subcontracts`](#tag/subcontracts/POST/v2/companies/{contractorId}/contracts/{parentContractId}/subcontracts) (same body) — the response ids are then the child contracts themselves.

## Step 3: Track your requests

List the requests your company has submitted. While the client decides, the request appears with `status: "PENDING"`; once approved it becomes a child contract and leaves this list (a rejected request is removed as well — the client does not record a reason via the API).

[`GET /v2/companies/{companyId}/subcontracts/requests/as-contractor`](#tag/subcontracts/GET/v2/companies/{companyId}/subcontracts/requests/as-contractor)

### Example: List submitted requests

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/subcontracts/requests/as-contractor?page=0&size=10" \
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

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `contractorId` is not your company. | Ensure your user has the necessary permissions for this action. |
| 400 | Validation error — e.g. subcontracting not allowed on the parent contract, `maxLevel` reached, dates outside the parent contract's range, or direct creation attempted when the contract requires authorization. | Check the `subcontracting` block in Step 1. |
| 404 | Unknown `parentContractId`, `siteId`, `activityIds` or subcontractor company id. | Re-fetch ids from Step 1; register the subcontractor if needed. |

## Next Steps

- [Review and Approve Subcontract Requests](client-contracts-subcontracts.md) — the client-side flow that decides your request.
- [View Your Contracts and Clients](contractor-contracts-view.md) — where the parent contract ids come from.
- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — once approved, the subcontractor assigns its resources the same way.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
