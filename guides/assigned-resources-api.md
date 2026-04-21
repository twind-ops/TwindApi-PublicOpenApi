# Resources API — List assigned resources

This guide explains how to list **resources** (employees, vehicles, equipment)
that are currently assigned to active contracts on the Twind platform, and how
to read the **engagement context** (contract, site, activity, assigned risks)
attached to each assignment.

Three endpoints cover the read surface:

| Endpoint | Axis | Response |
| -------- | ---- | -------- |
| `GET /v1/companies/{id}/assigned-resources` | Client view | `ResourceBasicData` — id, name, type only |
| `GET /v1/companies/{id}/assigned-resources-detailed` | Client view | `ResourceDetailedData` — per-type attributes **plus** `engagements[]` |
| `GET /v1/companies/{id}/assigned-resources/as-contractor` | Contractor view | `ResourceDetailedData` — same shape as the client-detailed endpoint |

The detailed endpoints return **one entry per resource** with a nested
`engagements` array: a resource deployed on N engagements appears once, and the
array has N items. This keeps pagination stable across calls (pagination is
per resource, not per row).

## Prerequisites

Before you integrate, ensure you have the following:

- **A Twind account** on the API environment you are targeting.
- **The Resources API product enabled** for the company whose data you will
  read. Contact [Twind Support](mailto:support@twind.com) to request activation
  if the product does not appear in **Configuration → APIs → Resources API**.
- **An API key** bound to the _Public API Manager_ role. See the
  [API Authentication Guide](get-api-token.md) for key creation.

> The client-view endpoints return resources from **every contractor and
> subcontractor** in the client's contract tree — subcontracts inherit the head
> client's id, so no extra parameter is needed to walk the chain.

## Authentication

Every request must carry an API key in the **`X-Api-Key`** header. See the
[API Authentication Guide](get-api-token.md) for the full setup. Example:

```text
X-Api-Key: your-api-key-here
```

> **Security tip:** never commit API keys to version control or log them in
> full.

## Response shapes

### `ResourceBasicData`

Returned by the basic client endpoint. Suitable when you only need the
resource ids for downstream filtering (for example, against access-control
endpoints).

```json
{
  "id": "f3a1b2c3-...-...",
  "name": "John Doe",
  "resourceType": "EMPLOYEE"
}
```

### `ResourceDetailedData`

Returned by both detailed endpoints. `engagements` is always present (empty
when the resource is not assigned anywhere visible to the caller).

```json
{
  "id": "f3a1b2c3-...",
  "name": "John Doe",
  "resourceType": "EMPLOYEE",
  "firstName": "John",
  "lastName": "Doe",
  "identity": "12345678Z",
  "registrationPlate": null,
  "serialNumber": null,
  "type": null,
  "manufacturer": null,
  "model": null,
  "engagements": [
    {
      "assignmentId": "a1111111-...",
      "contract": { "id": "c1111111-...", "name": "Site A — 2026" },
      "site":     { "id": "s1111111-...", "name": "Plant A" },
      "activity": { "id": "y1111111-...", "name": "Welding" },
      "assignedRisks": [
        { "id": "r1111111-...", "name": "Hot work",      "description": "Open flame or spark-producing work." },
        { "id": "r2222222-...", "name": "Confined space" }
      ]
    },
    {
      "assignmentId": "a2222222-...",
      "contract": { "id": "c2222222-...", "name": "Site B — Maintenance" },
      "site":     { "id": "s2222222-...", "name": "Plant B" },
      "activity": { "id": "y2222222-...", "name": "Inspection" },
      "assignedRisks": []
    }
  ]
}
```

Field notes:

- **`resourceType`** is one of `EMPLOYEE`, `VEHICLE`, `EQUIPMENT`. The per-type
  attributes (`firstName`/`lastName`/`identity`, `registrationPlate`, or
  `serialNumber`/`type`/`manufacturer`/`model`) are populated only for the
  matching type.
- **`engagements[].assignmentId`** is the id of the assignment record tying the
  resource to a specific engagement. Use it when you need a stable join key for
  follow-up calls or audit trails.
- **`engagements[].site`** and **`engagements[].activity`** are optional:
  engagements on a soft-deleted site or activity still surface, with the
  corresponding field omitted.
- **`engagements[].assignedRisks`** is populated **only for EMPLOYEE** resources.
  It lists the risks attached to that specific assignment (not the employee's
  global risk profile). `description` is optional — omitted when the client has
  not authored one.

## Endpoint 1 — List as client (basic)

[`GET /v1/companies/{id}/assigned-resources`](#tag/shared/GET/v1/companies/{id}/assigned-resources)

Lightweight list of resource ids/names across every contractor and
subcontractor the client has active contracts with. Returns
`PagedModelResourceBasicData`.

### Query parameters

| Name | Type | Notes |
| ---- | ---- | ----- |
| `q` | `string` | Search by resource name (case-insensitive, substring). |
| `resourceId` | `uuid` | Single resource id. Combined with `resourceIds` using **OR** — the response is the union. |
| `resourceIds` | `uuid[]` | Multiple resource ids. |
| `resourceTypes` | `string[]` | Any combination of `EMPLOYEE`, `VEHICLE`, `EQUIPMENT`. |
| `resourceType` | `string` | **Deprecated** — use `resourceTypes` instead. If both are sent, they are combined with OR. |
| `contractorIds` | `uuid[]` | Restrict the result to resources of these contractors. |
| `page`, `size`, `sort` | pagination | Default `size=10`, `sort=name,ASC`. **Max `size=100`.** |

### Example: cURL — list as client

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/assigned-resources?resourceTypes=EMPLOYEE&size=50" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

## Endpoint 2 — List as client (detailed)

[`GET /v1/companies/{id}/assigned-resources-detailed`](#tag/shared/GET/v1/companies/{id}/assigned-resources-detailed)

Same scope as endpoint 1 but returns the detailed shape with the `engagements`
array. Accepts the same filters (`q`, `resourceId`, `resourceIds`,
`resourceTypes`, `resourceType` deprecated, `contractorIds`, `page`, `size`,
`sort`).

### Example: cURL — list as client (detailed)

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/assigned-resources-detailed?resourceTypes=EMPLOYEE&contractorIds={contractorId}&size=50" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

## Endpoint 3 — List as contractor (detailed)

[`GET /v1/companies/{id}/assigned-resources/as-contractor`](#tag/shared/GET/v1/companies/{id}/assigned-resources/as-contractor)

Same detailed shape as endpoint 2, scoped to the contractor's side: you see
every engagement where the company acts as contractor, across **all client
relationships**. Use this when integrating the contractor's own systems (for
example, an HR platform keeping resource deployment in sync).

### Additional parameter

| Name | Type | Notes |
| ---- | ---- | ----- |
| `companyScope` | `string` | `MY_COMPANY` (default — only the caller company's resources), `MY_SUBCONTRACTORS` (resources of subcontractors the caller has engaged — requires the `RESOURCE_READ_SUBCONTRACTOR` permission on the key's role), or `ALL`. |

All other parameters (`q`, `resourceId`, `resourceIds`, `resourceTypes`,
`contractorIds`, pagination) are identical to endpoints 1 and 2.

### Example: cURL — list as contractor, own resources

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/assigned-resources/as-contractor?size=100" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

### Example: cURL — list as contractor, including subcontractor resources

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/assigned-resources/as-contractor?companyScope=ALL&size=100" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

## Common flows

- **Sync resource deployment into an HR / scheduling system.** Poll the
  contractor detailed endpoint on a schedule. Use `assignmentId` as the stable
  key against your local tables so you can detect additions, removals, and
  risk changes on a single assignment.
- **Feed access-control integrations.** When you need just the resource ids to
  drive other API calls (for example `GET /v1/companies/{id}/access-control`),
  use the basic client endpoint — it is cheaper and the ids are identical.
- **Audit assigned risks per engagement.** Filter by `resourceTypes=EMPLOYEE`
  on the detailed endpoints, then iterate `engagements[].assignedRisks` per
  entry. Non-employee resources always have `assignedRisks: []`.

## Pagination

- Default `size = 10`, default sort `name,ASC`.
- **Maximum `size = 100`.** Requests above the cap are rejected with
  `400 Bad Request`. Use pagination (`page=0..N`) to walk larger result sets.
- Pagination is **per resource**, not per engagement. A resource with multiple
  engagements counts as one page entry — avoid scripting against a row count
  derived from the flat number of engagements.
- Sorting is by `name` by default. `sort=name,DESC` and other sortable
  properties are available; see the interactive reference for the current list.

## Authorization

The three endpoints gate on `COMPANY_READ` or `TEMPORARY_AUTHORIZATION_READ`.
API keys created under the _Public API Manager_ role with the Resources API
product active already carry sufficient permissions. If your key returns
**`403 Forbidden`**, confirm the product is still active for the company and
that the key has not been deleted or rotated.

## Next steps

- Explore the [API Reference](../index.html) for the full parameter list and
  response schemas on each endpoint.
- Combine the resource ids from the basic endpoint with the
  [access-control endpoints](../index.html#tag/access-control) to drive
  downstream automation.
