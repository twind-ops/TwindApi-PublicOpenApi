# Assign Resources to a Contract Site

When work at a contract site starts, you assign your employees, vehicles and equipment to that site — with the right **risks** for each employee. From that moment Twind generates the compliance requirements for those resources and they can pass access control. This guide is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Resources registered** — your employees, vehicles or equipment must already exist in Twind.

## Step 1: Find the contract's sites

Get the contract detail to see its sites. Each `siteId` is a possible assignment target; the activities tell you what work is expected there. Contract ids come from [`GET /v1/companies/{companyId}/contracts/with-clients`](#tag/contract-listings/GET/v1/companies/{companyId}/contracts/with-clients) (see [View Your Contracts and Clients](contractor-contracts-view.md)).

[`GET /v2/companies/{companyId}/contracts/{contractId}`](#tag/contract-listings/GET/v2/companies/{companyId}/contracts/{contractId})

### Example: Get the sites of a contract

```bash
curl -X GET "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/contracts/00000000-0000-0000-0000-000000000010" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "id": "00000000-0000-0000-0000-000000000010",
  "name": "Plant maintenance 2026",
  "sites": [
    {
      "siteId": "00000000-0000-0000-0000-000000000020",
      "name": "North Plant",
      "level": "SITE",
      "activities": [{ "id": "00000000-0000-0000-0000-000000000090", "name": "Electrical maintenance" }],
      "resourceCount": 0,
      "hasSubcontracts": false
    }
  ]
}
```

## Step 2: Find the resources to assign

List your resources to obtain their ids. Only resources with `isAssignable: true` can be assigned. All lists are paginated and support `q` for text search.

> **`isAssignable: false`?** The usual cause is a resource created with `classifications: []` for a client that mandates resource types: the PUT in Step 3 then fails with a clear **400**. Set a classification per client on the resource first — see [Register and Maintain Your Employees](contractor-resources-employees.md), [Vehicles](contractor-resources-vehicles.md) or [Equipment](contractor-resources-equipment.md).

[`GET /v1/companies/{companyId}/employees`](#tag/resource-lists/GET/v1/companies/{companyId}/employees) · [`GET .../vehicles`](#tag/resource-lists/GET/v1/companies/{companyId}/vehicles) · [`GET .../equipment`](#tag/resource-lists/GET/v1/companies/{companyId}/equipment)

### Example: Find an employee

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/employees?q=John&page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    {
      "id": "00000000-0000-0000-0000-000000000030",
      "firstName": "John",
      "lastName": "Smith",
      "identity": "12345678Z",
      "isAssignable": true
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

For **employees** you also choose the risks of the assignment — they determine which compliance requirements are triggered. Risks are defined by the client; list them with `GET /v1/companies/{companyId}/risks`. Vehicles and equipment take no risks (`riskIds: []`).

## Step 3: Set the site's resources

This endpoint replaces the **complete assignment** for the (contract, site) pair: the body is a JSON array with the desired state, and resources currently assigned but absent from it are unassigned. To remove everything, send `[]`; to add one resource, resend all current ones plus the new one.

[`PUT /v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}/resources`](#tag/assignments/PUT/v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}/resources)

### Example: Assign an employee (with risks) and a vehicle

```bash
curl -X PUT "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/contracts/00000000-0000-0000-0000-000000000010/sites/00000000-0000-0000-0000-000000000020/resources" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "resourceId": "00000000-0000-0000-0000-000000000030",
      "riskIds": ["00000000-0000-0000-0000-000000000080"]
    },
    {
      "resourceId": "00000000-0000-0000-0000-000000000040",
      "riskIds": []
    }
  ]'
```

Response: `204 No Content`.

To adjust the risks of one resource that is already assigned — without resending the whole list — use:

[`PUT /v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}/resources/{resourceId}/risks`](#tag/assignments/PUT/v2/companies/{companyId}/contracts/{contractId}/sites/{siteId}/resources/{resourceId}/risks)

### Example: Update risks for an assigned resource

```bash
curl -X PUT "https://app.twind.io/api/v2/companies/00000000-0000-0000-0000-000000000002/contracts/00000000-0000-0000-0000-000000000010/sites/00000000-0000-0000-0000-000000000020/resources/00000000-0000-0000-0000-000000000030/risks" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{ "riskIds": ["00000000-0000-0000-0000-000000000080", "00000000-0000-0000-0000-000000000081"] }'
```

Response: `204 No Content`.

> **Note:** Both calls are full replaces — risks not included in `riskIds` are removed. To verify the result, fetch the site detail (`GET /v2/.../contracts/{contractId}/sites/{siteId}`).

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 404 | Unknown `contractId` or `siteId`, the site is not part of that contract, or a `resourceId` does not exist. | Re-fetch ids from Steps 1–2. |
| 400 | Invalid body — e.g. a resource that is not assignable, or malformed `riskIds`. | Check `isAssignable` (Step 2) and that risk ids are valid UUIDs. |

## Next Steps

- [View Your Contracts and Clients](contractor-contracts-view.md) — where the contract and site ids come from, and how to list your deployed resources across all contracts.
- [Request to Subcontract Part of the Work](contractor-contracts-request-subcontract.md) — when another company takes part of the job.
- [See Assigned Resources and Their Risks](client-contracts-assigned-resources.md) — how your client sees these assignments.
- Explore the [API Reference](../index.html) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
