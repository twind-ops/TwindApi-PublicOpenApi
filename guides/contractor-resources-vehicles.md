# Register and Maintain Your Vehicles

When vehicles need to enter client sites, they must exist in Twind so they can be assigned to contracts, accumulate compliance documentation and pass access control. This guide covers creating and maintaining vehicle records, and is written for **contractor** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your contractor company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).

## Step 1: Get the type ids

Creating a vehicle requires a **standard vehicle type** from the platform catalog. Additionally, some clients mandate their own **vehicle classification** before the vehicle can be assigned to their contracts — check both before creating.

[`GET /v1/standard-vehicle-types`](#tag/vehicles/GET/v1/standard-vehicle-types) · [`GET /v1/companies/{companyId}/classification/vehicle-types`](#tag/vehicles/GET/v1/companies/{companyId}/classification/vehicle-types)

### Example: Browse the standard types

```bash
curl -X GET "https://app.twind.io/api/v1/standard-vehicle-types?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`, trimmed):

```json
{
  "content": [
    { "id": "00000000-0000-0000-0000-000000000120", "name": "Truck", "description": "Heavy goods vehicle" },
    { "id": "00000000-0000-0000-0000-000000000121", "name": "Van", "description": "Light commercial vehicle" }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 2, "totalPages": 1 }
}
```

The client classifications endpoint returns one entry per active client, each with its `types[]` — pair the entry `id` (`clientId`) with a `types[].id` (`clientResourceTypeId`) in the `classifications` of the vehicle. If you create the vehicle with `classifications: []` while a client listed here mandates a type, the record is created but stays `isAssignable: false` for that client — [assigning it to a contract site](contractor-contracts-assign-resources.md) fails with a 400 until you set the classification (via `PATCH`).

## Step 2: Create the vehicle

Required fields: `name`, `registrationPlate`, `vehicleType` (a standard type id from Step 1) and `classifications` (send `[]` if none of your clients mandates one).

[`POST /v1/companies/{companyId}/vehicles`](#tag/vehicles/POST/v1/companies/{companyId}/vehicles)

### Example: Create a vehicle

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/vehicles" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Truck A",
    "registrationPlate": "1234-ABC",
    "vehicleType": "00000000-0000-0000-0000-000000000120",
    "manufacturer": "Volvo",
    "model": "FH16",
    "tareWeight": 9500,
    "classifications": []
  }'
```

Response (`201 Created`):

```json
{
  "id": "00000000-0000-0000-0000-000000000040"
}
```

The returned `id` is the **resource id** of the vehicle — the one used to assign it to contract sites.

## Step 3: Keep the record up to date

List your vehicles with the public [`GET /v1/companies/{companyId}/vehicles`](#tag/resource-lists/GET/v1/companies/{companyId}/vehicles) (supports `q` text search; `isAssignable` tells you whether the vehicle can be assigned). Fetch one with `GET .../vehicles/{id}` and update with `PATCH` — only the fields you send are modified, except `classifications`, which **replaces the whole set** when provided.

### Example: Update the registration plate

```bash
curl -X PATCH "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/vehicles/00000000-0000-0000-0000-000000000040" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "registrationPlate": "5678-DEF"
  }'
```

Response: `204 No Content`.

When a vehicle leaves the fleet, soft-delete the record using [`DELETE /v1/companies/{companyId}/vehicles/{id}`](#tag/vehicles/DELETE/v1/companies/{companyId}/vehicles/{id}). The vehicle is removed from future assignments but its historical data is preserved.

### Example: Delete a vehicle

```bash
curl -X DELETE "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000002/vehicles/00000000-0000-0000-0000-000000000040" \
  -H "X-Api-Key: your-api-key-here"
```

Response: `204 No Content`.

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not your contractor company. | Ensure your user has the necessary permissions for this action. |
| 400 | Validation error — missing required field, unknown `vehicleType` id, or a `classifications` entry with unknown ids. | Check the type ids from Step 1 and the field list in Step 2. |
| 404 | Unknown vehicle `id` (or already deleted). | Re-fetch the id from the vehicles list. |

## Next Steps

- [Register and Maintain Your Employees](contractor-resources-employees.md) and [Equipment](contractor-resources-equipment.md) — same flow for your other resources.
- [Assign Resources to a Contract Site](contractor-contracts-assign-resources.md) — put the new vehicle to work on a contract.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
