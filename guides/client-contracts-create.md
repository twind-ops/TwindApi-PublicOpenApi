# Create a Contract with a Contractor

When you hire a contractor company, you register it on the platform and create a contract defining **where** the work happens (sites) and **what** it covers (activities per site). Once the contract exists, Twind starts generating compliance requirements and controlling access for that work. This guide is written for **client** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Site and activity ids** — each site in the contract carries its own list of activities. List them with [`GET /v1/companies/{companyId}/sites`](#tag/lookups/GET/v1/companies/{companyId}/sites) and [`GET /v1/companies/{companyId}/activities`](#tag/lookups/GET/v1/companies/{companyId}/activities).
- **A contract manager** — the create call requires a `managerId`: the id of a user of your company, from [`GET /v1/companies/{companyId}/users`](#tag/companies/GET/v1/companies/{companyId}/users). API-key users may get **403 Forbidden** on that endpoint; in that case use your own user id from [`GET /v1/users/me`](#tag/user/GET/v1/users/me) as `managerId`.

## Step 1: Find or register the contractor company

Many companies are already registered in Twind, including ones that have never worked with you. Search for the contractor by its tax ID first, and invite it only when it is not found.

### 1a. Search the Twind company directory

[`GET /v1/companies/{id}/contractors`](#tag/company/GET/v1/companies/{id}/contractors) lists every company registered in Twind that can be assigned to a contract, searchable by name or tax ID with `q`.

- Always send `includeWithoutContractorPlan=true`: client companies can take contracts too and need no invitation. Without it they are left out of the results.
- `q` is a partial match, so keep the row whose `taxId` is exactly the one you searched for.

### Example: Search by tax ID

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/contractors?q=B12345678&includeWithoutContractorPlan=true" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

Response (`200 OK`):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000002",
      "name": "Acme Maintenance S.L.",
      "taxId": "B12345678",
      "classifications": [{ "id": "00000000-0000-0000-0000-000000000050", "name": "Maintenance" }]
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

If a row matches, its `id` is the **contractor company id**: skip to Step 2. `classifications` lists the company types you have assigned to it.

### 1b. Not found: register the contractor company

Create the contractor company and link it to your client company. The contact person receives an invitation to manage the new company.

[`POST /v1/companies/{id}/contractors`](#tag/company/POST/v1/companies/{id}/contractors)

### Example: Create a contractor company

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/contractors" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Maintenance S.L.",
    "taxId": "B12345678",
    "contactEmail": "operations@acme-maintenance.example",
    "contactName": "Jane",
    "contactLastName": "Doe",
    "countryId": "00000000-0000-0000-0000-000000000140",
    "languageId": "00000000-0000-0000-0000-000000000141"
  }'
```

Response (`201 Created`):

```json
{
  "id": "00000000-0000-0000-0000-000000000002"
}
```

The returned `id` is the **contractor company id** — you will use it as `contractorId` in the next step. Country ids come from [`GET /v1/countries`](#tag/lookups/GET/v1/countries) and language ids (the invited contact's platform language) from [`GET /v1/languages`](#tag/lookups/GET/v1/languages) — both filterable by partial name (`?name=Spain`, `?name=Spanish`).

If the call returns `409 Conflict`, the tax ID is already registered in Twind. The response carries no id: repeat the search in 1a.

The contractor company id never changes, so your integration can store it against the tax ID and skip Step 1 the next time it contracts the same company.

## Step 2: Create the contract with its sites and activities

Create the contract between your client company (path `companyId`) and the contractor (`contractorId` in the body). The `sites` array is required and defines the scope: each entry is a site with the list of activities the contractor will perform there. The optional `subcontracting` block sets whether and how the contractor may subcontract; when `allowed` is `true`, `onlyClientAllowed` is **required** (set it to `true` to reserve subcontractor creation and authorization for the client).

[`POST /v2/companies/{companyId}/contracts`](#tag/contracts/POST/v2/companies/{companyId}/contracts)

### Example: Create a contract covering two sites

```bash
curl -X POST "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/contracts" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plant maintenance 2026",
    "contractorId": "00000000-0000-0000-0000-000000000002",
    "managerId": "auth0|64f1c2d3e4a5b6c7d8e9f0a1",
    "dateFrom": "2026-07-01",
    "dateTo": "2027-06-30",
    "sites": [
      {
        "siteId": "00000000-0000-0000-0000-000000000020",
        "activities": ["00000000-0000-0000-0000-000000000090"]
      },
      {
        "siteId": "00000000-0000-0000-0000-000000000021",
        "activities": [
          "00000000-0000-0000-0000-000000000090",
          "00000000-0000-0000-0000-000000000163"
        ]
      }
    ],
    "subcontracting": {
      "allowed": true,
      "onlyClientAllowed": false,
      "maxLevel": 1,
      "needsAuthorization": true
    }
  }'
```

Response (`200 OK`):

```json
{
  "id": "00000000-0000-0000-0000-000000000010"
}
```

The returned `id` is the **contract id**. From this moment the platform generates requirement instances for the contractor according to your requirement configuration.

## Step 3: Verify the contract

Fetch the contract detail to confirm its sites, activities and subcontracting setup. This is also where the contractor finds the site ids needed to assign resources.

[`GET /v2/companies/{companyId}/contracts/{contractId}`](#tag/contract-listings/GET/v2/companies/{companyId}/contracts/{contractId})

### Example: Get the contract detail

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000001/contracts/00000000-0000-0000-0000-000000000010" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000010",
  "name": "Plant maintenance 2026",
  "dateFrom": "2026-07-01",
  "dateTo": "2027-06-30",
  "manager": { "id": "auth0|64f1c2d3e4a5b6c7d8e9f0a1", "name": "Carlos Ruiz" },
  "client": { "id": "00000000-0000-0000-0000-000000000001", "name": "Industrial Corp" },
  "contractor": { "id": "00000000-0000-0000-0000-000000000002", "name": "Acme Maintenance S.L." },
  "parentContractId": null,
  "subcontracting": { "allowed": true, "onlyClientAllowed": false, "maxLevel": 1, "needsAuthorization": true },
  "sites": [
    {
      "siteId": "00000000-0000-0000-0000-000000000020",
      "name": "North Plant",
      "level": "SITE",
      "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
      "resourceCount": 0,
      "hasSubcontracts": false
    }
  ],
  "hasSubcontracts": false
}
```

To change the scope later, use [`PATCH /v2/companies/{companyId}/contracts/{contractId}`](#tag/contracts/PATCH/v2/companies/{companyId}/contracts/{contractId}): the `sites` array you send is the **complete desired state** (sites or activities you omit are removed). If a removal would drop resources already assigned, the API asks for confirmation via `removeAssignedResourcesConfirmed: true`.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not a company your user belongs to. | Ensure your user has the necessary permissions for this action. |
| 400 | Validation error — e.g. empty `sites`, a site with no `activities`, duplicate `siteId` entries, missing `managerId`, `subcontracting.allowed: true` without `onlyClientAllowed`, or `dateTo` earlier than `dateFrom`. | Check the body against the rules in Step 2. |
| 404 | Unknown `contractorId`, `siteId`, `activityId` or `contractId`. | Re-fetch ids from the lookup endpoints listed in Prerequisites. |
| 409 | `POST /v1/companies/{id}/contractors`: a company with this tax ID is already registered in Twind. | Find its id with the search in Step 1a; do not retry the `POST`. |

## Next Steps

- [Review and Approve Subcontract Requests](client-contracts-subcontracts.md) — control who works under this contract's chain.
- [See Assigned Resources and Their Risks](client-contracts-assigned-resources.md) — follow who and what is deployed on your contracts.
- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — the contractor-side flow that puts resources on the contract's sites.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [api-support@twind.io](mailto:api-support@twind.io) for assistance.*
