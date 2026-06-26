# See Assigned Resources and Their Risks

When work is underway, you want to know exactly which resources — employees, vehicles, equipment — are deployed on your contracts, at which sites, and with which **risks**, since assigned risks determine which compliance requirements are triggered. This guide is written for **client** companies; the views cover your whole contract tree, including subcontractors.

> **Note:** These views are read-only for the client. Risks are assigned by the **contractor** when deploying resources to a site of the contract (see [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md)).

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).

## Step 1: List the resources assigned to your contracts

Two views are available. The lightweight one returns one row per resource (id, name, type) — useful for lookups and filters. The detailed one adds per-resource attributes plus an array describing every assignment (contract, site, activity) where that resource is currently deployed, with the risks assigned on each one.

[`GET /v1/companies/{id}/assigned-resources`](#tag/assigned-resources/GET/v1/companies/{id}/assigned-resources) · [`GET /v2/companies/{id}/assigned-resources-detailed/as-client`](#tag/assigned-resources/GET/v2/companies/{id}/assigned-resources-detailed/as-client)

Both support filtering by `q` (name search), `resourceTypes` (`EMPLOYEE`, `VEHICLE`, `EQUIPMENT`) and `contractorIds`. Max page size: 100.

### Example: Detailed list of assigned employees

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/assigned-resources-detailed/as-client?resourceTypes=EMPLOYEE&page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000030",
      "name": "John Smith",
      "resourceType": "EMPLOYEE",
      "firstName": "John",
      "lastName": "Smith",
      "identity": "12345678Z",
      "engagements": [
        {
          "assignmentId": "00000000-0000-0000-0000-000000000150",
          "contract": { "id": "00000000-0000-0000-0000-000000000010", "name": "Plant maintenance 2026" },
          "site": { "id": "00000000-0000-0000-0000-000000000020", "name": "North Plant" },
          "activity": { "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" },
          "assignedRisks": [
            { "id": "00000000-0000-0000-0000-000000000080", "name": "Work at height" }
          ]
        }
      ]
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

The `engagements` JSON property lists the resource's **assignments**: each entry is one (contract, site, activity) deployment with its risks. Pagination is per resource — a resource deployed on N assignments is a single entry. Keep the `contract.id` and `site.id` for the next steps.

## Step 2: See a contract's deployment overview

The contract detail shows each site with its activities and a `resourceCount`; the resources view returns the full roster grouped by site.

[`GET /v2/companies/{companyId}/contracts/{contractId}`](#tag/contract-listings/GET/v2/companies/{companyId}/contracts/{contractId}) · `GET /v2/companies/{companyId}/contracts/{contractId}/resources`

### Example: Roster of a contract, grouped by site

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/contracts/00000000-0000-0000-0000-000000000010/resources" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "contractId": "00000000-0000-0000-0000-000000000010",
  "sites": [
    {
      "siteId": "00000000-0000-0000-0000-000000000020",
      "name": "North Plant",
      "level": "SITE",
      "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
      "resources": [
        {
          "resourceId": "00000000-0000-0000-0000-000000000030",
          "resourceType": "EMPLOYEE",
          "name": "John Smith",
          "risks": [{ "id": "00000000-0000-0000-0000-000000000080", "name": "Work at height" }]
        }
      ]
    }
  ]
}
```

## Step 3: Inspect one site of the contract

To focus on a single site — its activities, scope and the resources deployed there with their risks — fetch the site detail.

[`GET /v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}`](#tag/assignments/GET/v2/companies/{companyId}/contracts/{contractId}/sites/{siteId})

### Example: Site detail

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/contracts/00000000-0000-0000-0000-000000000010/sites/00000000-0000-0000-0000-000000000020" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "contractId": "00000000-0000-0000-0000-000000000010",
  "siteId": "00000000-0000-0000-0000-000000000020",
  "name": "North Plant",
  "level": "SITE",
  "scopeSites": [],
  "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
  "resources": [
    {
      "resourceId": "00000000-0000-0000-0000-000000000030",
      "resourceType": "EMPLOYEE",
      "name": "John Smith",
      "risks": [{ "id": "00000000-0000-0000-0000-000000000080", "name": "Work at height" }]
    }
  ]
}
```

If a resource is missing a risk it should carry, ask the contractor to update the assignment — risk updates are made by the contractor on its side of the contract.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | `companyId` is not a company your user belongs to. | Use a user of the client company that owns the contract. |
| 404 | Unknown `contractId` or `siteId`, the site is not part of that contract, or the contract is outside your API key user's team-visibility scope. | Re-fetch ids from Steps 1–2. A team-scoped key only sees contracts within its assigned sites and clients. |

## Next Steps

- [Create a Contract with a Contractor](client-contracts-create.md) — where contracts and their sites come from.
- [Review and Approve Subcontract Requests](client-contracts-subcontracts.md) — subcontractor resources also show up in these views.
- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — the contractor-side flow that creates the assignments (and risks) you see here.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
