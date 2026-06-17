# View Your Contracts and Clients

When your company works for several clients, the first thing any integration needs is the list of your client companies and active contracts — they provide the ids (client, contract, site) used by every other API call. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).

## Step 1: List your client companies

Returns the client companies your contractor company works with. Use it to obtain client ids for filtering in other endpoints (access control, contracts, requirement instances).

[`GET /v1/companies/{contractorId}/clients`](#tag/companies/GET/v1/companies/{contractorId}/clients)

### Example: List clients

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/clients?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Industrial Corp",
      "taxId": "A11223344"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

## Step 2: List your contracts

Returns the contracts where your company acts as contractor, with the client, dates, sites and resource counts of each one. Useful filters: `q` (text search), `clientIds`, `showExpired` (default `false`), `siteIds` and `activityIds`.

[`GET /v1/companies/{companyId}/contracts/with-clients`](#tag/contract-listings/GET/v1/companies/{companyId}/contracts/with-clients)

### Example: List active contracts

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/contracts/with-clients?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000010",
      "name": "Plant maintenance 2026",
      "principal": true,
      "client": { "id": "00000000-0000-0000-0000-000000000001", "name": "Industrial Corp", "taxId": "A11223344" },
      "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L.", "taxId": "B12345678" },
      "sites": [
        { "id": "00000000-0000-0000-0000-000000000020", "name": "North Plant", "level": "SITE" }
      ],
      "resources": { "employees": 4, "equipments": 1, "vehicles": 2, "products": 0 },
      "dateFrom": "2026-07-01",
      "dateTo": "2027-06-30",
      "requirements": { "total": 12, "approved": 9 }
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

The `id` of each entry is the **contract id**. The `requirements` block gives you a quick compliance summary per contract.

## Step 3: Drill into one contract

The contract detail returns the full scope: each site with its activities, the subcontracting rules, and a `resourceCount` per site. The `siteId` values here are what you need to assign resources.

[`GET /v2/companies/{companyId}/contracts/{contractId}`](#tag/contract-listings/GET/v2/companies/{companyId}/contracts/{contractId})

### Example: Get the contract detail

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/contracts/00000000-0000-0000-0000-000000000010" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000010",
  "name": "Plant maintenance 2026",
  "dateFrom": "2026-07-01",
  "dateTo": "2027-06-30",
  "client": { "id": "00000000-0000-0000-0000-000000000001", "name": "Industrial Corp" },
  "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L." },
  "subcontracting": { "allowed": true, "onlyClientAllowed": null, "maxLevel": 1, "needsAuthorization": true },
  "sites": [
    {
      "siteId": "00000000-0000-0000-0000-000000000020",
      "name": "North Plant",
      "level": "SITE",
      "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
      "resourceCount": 7,
      "hasSubcontracts": false
    }
  ],
  "hasSubcontracts": false
}
```

## Step 4: List your deployed resources

See which of your employees, vehicles and equipment are currently assigned across all your contracts, along with the risks applied to each deployment.

[`GET /v2/companies/{id}/assigned-resources-detailed/as-contractor`](#tag/assigned-resources/GET/v2/companies/{id}/assigned-resources-detailed/as-contractor)

Supports filtering by `q`, `resourceTypes`, and `companyScope` (`MY_COMPANY`, `MY_SUBCONTRACTORS`, `ALL` — use `ALL` to include resources from your own subcontractors). Max page size: 100.

### Example: List deployed employees

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/assigned-resources-detailed/as-contractor?resourceTypes=EMPLOYEE&page=0&size=10" \
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
      "assignments": [
        {
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

Each resource entry includes an `assignments` array listing every (contract, site, activity) deployment with the risks assigned on each one.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | `companyId` is not a company your user belongs to. | Use your contractor company id from `GET /v1/users/me/companies`. |
| 404 | Unknown `contractId`, or the contract does not involve your company. | Re-fetch contract ids from Step 2. |

## Next Steps

- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — put your employees, vehicles and equipment to work on the contract.
- [Request to Subcontract Part of the Work](contractor-contracts-request-subcontract.md) — when another company takes part of the job.
- Explore the [API Reference](../index.html) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
