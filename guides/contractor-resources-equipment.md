# Register and Maintain Your Equipment

When machinery or tools are used on client sites, they must exist in Twind so they can be assigned to contracts, accumulate compliance documentation and pass access control. This guide covers creating and maintaining equipment records, and is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).

## Step 1: Get the type ids

Creating equipment requires a **standard equipment type** from the platform catalog. Additionally, some clients mandate their own **equipment classification** before the equipment can be assigned to their contracts — check both before creating.

[`GET /v1/standard-equipment-types`](#tag/equipment/GET/v1/standard-equipment-types) · [`GET /v1/companies/{companyId}/classification/equipment-types`](#tag/equipment/GET/v1/companies/{companyId}/classification/equipment-types)

### Example: Browse the standard types

```bash
curl -X GET "https://app.twind.io/api/v1/standard-equipment-types?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    { "id": "00000000-0000-0000-0000-000000000130", "name": "Excavator", "description": "Earth-moving machinery" },
    { "id": "00000000-0000-0000-0000-000000000131", "name": "Crane", "description": "Lifting equipment" }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 2, "totalPages": 1 }
}
```

The client classifications endpoint returns one entry per active client, each with its `types[]` — pair the entry `id` (`clientId`) with a `types[].id` (`clientResourceTypeId`) in the `classifications` of the equipment. If you create the equipment with `classifications: []` while a client listed here mandates a type, the record is created but stays `isAssignable: false` for that client — [assigning it to a contract site](contractor-contracts-assign-resources.md) fails with a 400 until you set the classification (via `PATCH`).

## Step 2: Create the equipment

Required fields: `name`, `serialNumber`, `equipmentType` (a standard type id from Step 1) and `classifications` (send `[]` if none of your clients mandates one).

[`POST /v1/companies/{companyId}/equipment`](#tag/equipment/POST/v1/companies/{companyId}/equipment)

### Example: Create an equipment item

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/equipment" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Excavator B",
    "serialNumber": "EXC-20260101",
    "equipmentType": "00000000-0000-0000-0000-000000000130",
    "manufacturer": "Caterpillar",
    "model": "320",
    "classifications": []
  }'
```

Response (`201 Created`):

```json
{
  "id": "00000000-0000-0000-0000-000000000050"
}
```

The returned `id` is the **resource id** of the equipment — the one used to assign it to contract sites.

## Step 3: Keep the record up to date

List your equipment with the public [`GET /v1/companies/{companyId}/equipment`](#tag/resource-lists/GET/v1/companies/{companyId}/equipment) (supports `q` text search; `isAssignable` tells you whether the item can be assigned). Fetch one with `GET .../equipment/{id}` and update with `PATCH` — only the fields you send are modified, except `classifications`, which **replaces the whole set** when provided.

### Example: Update the model information

```bash
curl -X PATCH "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/equipment/00000000-0000-0000-0000-000000000050" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "320 GC"
  }'
```

Response: `204 No Content`.

When a piece of equipment is retired, soft-delete the record using [`DELETE /v1/companies/{companyId}/equipment/{id}`](#tag/resources/DELETE/v1/companies/{companyId}/equipment/{id}). The equipment is removed from future assignments but its historical data is preserved.

### Example: Delete equipment

```bash
curl -X DELETE "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/equipment/00000000-0000-0000-0000-000000000050" \
  -H "X-Api-Key: your-api-key-here"
```

Response: `204 No Content`.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 400 | Validation error — missing required field, unknown `equipmentType` id, or a `classifications` entry with unknown ids. | Check the type ids from Step 1 and the field list in Step 2. |
| 404 | Unknown equipment `id` (or already deleted). | Re-fetch the id from the equipment list. |

## Next Steps

- [Register and Maintain Your Employees](contractor-resources-employees.md) and [Vehicles](contractor-resources-vehicles.md) — same flow for your other resources.
- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — put the new equipment to work on a contract.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
