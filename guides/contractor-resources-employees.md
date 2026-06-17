# Register and Maintain Your Employees

When your company is hired, your employees must exist in Twind before they can be assigned to contracts, accumulate compliance documentation and pass access control. This guide covers creating and maintaining employee records, and is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Country id** — employee identity documents reference a country, from [`GET /v1/countries`](#tag/lookups/GET/v1/countries).

## Step 1: Check your clients' classification requirements

Some clients mandate an **employee classification** (their own categorization of personnel) before the employee can be assigned to their contracts. This endpoint returns the classifications defined by each of your active clients; if a client appears here, include one of its types in the `classifications` of your employees.

`GET /v1/companies/{companyId}/classification/employee-types`

### Example: List client classifications

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/classification/employee-types" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`) — one entry per active client:

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Industrial Corp",
    "types": [
      { "id": "00000000-0000-0000-0000-000000000110", "name": "Electrician" },
      { "id": "00000000-0000-0000-0000-000000000111", "name": "Site supervisor" }
    ]
  }
]
```

Each `types[].id` is a `clientResourceTypeId`; the entry `id` is the `clientId` to pair it with. If you create the employee with `classifications: []` while a client listed here mandates a type, the record is created but stays `isAssignable: false` for that client — [assigning it to a contract site](contractor-contracts-assign-resources.md) fails with a 400 until you set the classification (via `PATCH`).

## Step 2: Create the employee

Required fields: `firstName`, `lastName`, `identityType` (`PASSPORT`, `IDENTITY_NUMBER`, `SOCIAL_SECURITY_NUMBER` or `OTHER`), `identity`, `countryId` and `classifications` (send `[]` if none of your clients mandates one).

`POST /v1/companies/{companyId}/employees`

### Example: Create an employee

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/employees" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "identityType": "IDENTITY_NUMBER",
    "identity": "12345678Z",
    "countryId": "00000000-0000-0000-0000-000000000140",
    "email": "john.smith@acme-maintenance.example",
    "birthDate": "1990-05-14",
    "classifications": [
      {
        "clientId": "00000000-0000-0000-0000-000000000001",
        "clientResourceTypeId": "00000000-0000-0000-0000-000000000110"
      }
    ]
  }'
```

Response (`201 Created`):

```json
{
  "id": "00000000-0000-0000-0000-000000000030"
}
```

The returned `id` is the **resource id** of the employee — the one used to assign them to contract sites and to track their requirement instances.

## Step 3: Keep the record up to date

List your employees with the public [`GET /v1/companies/{companyId}/employees`](#tag/resource-lists/GET/v1/companies/{companyId}/employees) (supports `q` text search; `isAssignable` tells you whether the employee can be assigned). Fetch one with `GET .../employees/{id}` and update with `PATCH` — only the fields you send are modified, except `classifications`, which **replaces the whole set** when provided.

### Example: Update an employee's contact data

```bash
curl -X PATCH "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/employees/00000000-0000-0000-0000-000000000030" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "j.smith@acme-maintenance.example",
    "phonePrefix": "+34",
    "phone": "600123456"
  }'
```

Response: `204 No Content`.

When an employee leaves the company, soft-delete the record using [`DELETE /v1/companies/{companyId}/employees/{id}`](#tag/resources/DELETE/v1/companies/{companyId}/employees/{id}). The employee is removed from future assignments but their historical data is preserved.

### Example: Delete an employee

```bash
curl -X DELETE "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/employees/00000000-0000-0000-0000-000000000030" \
  -H "X-Api-Key: your-api-key-here"
```

Response: `204 No Content`. (`GET .../employees/total` returns your current headcount as a plain number.)

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 400 | Validation error — missing required field, invalid `identityType` value, malformed `countryId`, or a `classifications` entry with unknown ids. | Check Step 1 for valid classification ids and the field list in Step 2. |
| 404 | Unknown employee `id` (or already deleted). | Re-fetch the id from the employees list. |

## Next Steps

- [Register and Maintain Your Vehicles](contractor-resources-vehicles.md) and [Equipment](contractor-resources-equipment.md) — same flow for your other resources.
- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — put the new employee to work on a contract.
- Explore the [API Reference](../index.html) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
