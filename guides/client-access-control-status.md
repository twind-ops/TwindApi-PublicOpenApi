# Access Control — Query Status (Client)

This guide explains how a **client company** queries the access control status of
contractor resources (employees, vehicles, and equipment) assigned to its sites
using the Twind HTTP API.

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (API key). See
  [API Authentication Guide](get-api-token.md) for API keys and the `X-Api-Key`
  header.
- **Company id** — The client company (`companyId`) whose access control data
  you want to query.

Your Twind account must have client-level access to the company; contact support
if an endpoint returns **403 Forbidden** for a flow you expect to use.

## Authentication

Include credentials on every request using **`X-Api-Key`** as described in the
[API Authentication Guide](get-api-token.md).

Example header:

```text
X-Api-Key: YOUR_API_KEY
```

> **Security tip:** Do not log full tokens or keys. Store secrets outside your
> repository.

## Find resource IDs assigned to your contracts

Most access-control flows need a **`resourceId`** — the UUID of the specific
employee, vehicle, or equipment. These IDs come from the **assigned resources**
endpoints, which list every resource deployed on contracts where your company
acts as client, across the whole contract tree (direct contractors and their
subcontractors).

Two views are available:

- **Lightweight** — one row per resource (`id`, `name`, `resourceType`). Use it
  when you only need the IDs.
  <!-- markdownlint-disable-next-line MD051 -->
  [`GET /v1/companies/{id}/assigned-resources`](#tag/assigned-resources/GET/v1/companies/{id}/assigned-resources)
- **Detailed** — adds per-resource attributes plus an `assignments` array with
  every (contract, site) deployment and, for employees, the risks applied there.
  <!-- markdownlint-disable-next-line MD051 -->
  [`GET /v2/companies/{id}/assigned-resources-detailed/as-client`](#tag/assigned-resources/GET/v2/companies/{id}/assigned-resources-detailed/as-client)

Both support filtering by `q` (name search), `resourceTypes` (`EMPLOYEE`,
`VEHICLE`, `EQUIPMENT`) and `contractorIds`. Max page size: 100. See
[See Assigned Resources and Their Risks](client-contracts-assigned-resources.md)
for the full walkthrough.

### Example: cURL — list assigned resource IDs

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/assigned-resources?resourceTypes=EMPLOYEE&page=0&size=100" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

**Response** (`200 OK`, trimmed)

```json
{
  "content": [
    {
      "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "name": "Jane Doe",
      "resourceType": "EMPLOYEE"
    }
  ],
  "page": { "size": 100, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Keep the `id` values — they are the `resourceId` you pass to the status,
access-register, and temporary-authorization endpoints below. Site IDs come from
<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/sites`](#tag/sites/GET/v1/companies/{companyId}/sites).

## Understanding access control statuses

Each resource-site combination carries one of three statuses:

| Status | Meaning |
| --- | --- |
| `ALLOWED` | All requirements are met. The resource is cleared to access the site. |
| `NOT_ALLOWED` | One or more requirements are failing. The resource is blocked. |
| `PARTIALLY_ALLOWED` | The resource is allowed for some contract activities but not all. Check `statusPerContractActivity` in the response for the breakdown. |

The `accessControlType` field controls the enforcement mode:

| Type | Behaviour |
| --- | --- |
| `RESTRICTIVE` | Access is blocked when requirements fail (`NOT_ALLOWED`). |
| `PERMISSIVE` | Access is allowed even when requirements are open (issues are advisory only). |

## List access control statuses (as client)

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/as-client`](#tag/access-status/GET/v1/companies/{companyId}/access-control/as-client)

Returns a paginated list of access control entries for all contractor resources
linked to the client company. Each entry shows the resource's access status along
with contractor, site, and requirement details.

### Example: cURL — list all access control entries

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

### Example: cURL — filter by contractor and status

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?contractorId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&status=NOT_ALLOWED" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

### Example: cURL — show resources expiring within 15 days

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?onlyExpiringInFifteenDays=true&sort=end_of_access,asc" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "content": [
    {
      "resource": {
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "type": "EMPLOYEE",
        "name": "Jane",
        "surname": "Doe",
        "identity": "09547483E",
        "identityType": "NIF"
      },
      "contractor": {
        "id": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Acme Contractor Ltd",
        "taxId": "TAX-001",
        "email": "contact@acme.com"
      },
      "site": {
        "id": "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Main Warehouse"
      },
      "status": "PARTIALLY_ALLOWED",
      "accessControlType": "RESTRICTIVE",
      "issues": [],
      "statusPerContractActivity": [
        {
          "contractId": "dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee",
          "contractName": "2026 Service Contract",
          "contractDateFrom": "2026-01-01",
          "contractDateTo": "2026-12-31",
          "activityId": "eeeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee",
          "activityName": "Maintenance",
          "allowed": true,
          "status": "ALLOWED"
        },
        {
          "contractId": "dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee",
          "contractName": "2026 Service Contract",
          "contractDateFrom": "2026-01-01",
          "contractDateTo": "2026-12-31",
          "activityId": "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee",
          "activityName": "Installation",
          "allowed": false,
          "status": "NOT_ALLOWED"
        }
      ]
    }
  ],
  "page": {
    "size": 10,
    "number": 0,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

### Understanding the response fields

- **`status`** — Overall access status. `PARTIALLY_ALLOWED` means the resource
  is cleared for some activities but blocked for others — inspect
  `statusPerContractActivity` to see which.
- **`accessControlType`** — `RESTRICTIVE` blocks access on failure;
  `PERMISSIVE` treats issues as advisory.
- **`issues`** — Requirement issues causing a `NOT_ALLOWED` or
  `PARTIALLY_ALLOWED` status.
- **`statusPerContractActivity`** — Per-activity breakdown. Use this to identify
  exactly which activities are blocked and why.

## Search access status by identifier (NIF, serial number, plate)

When you know a resource's real-world identifier but not its `resourceId` UUID,
use the **`identity`** query parameter on the list endpoint. It matches the
identifier against whichever column carries it for each resource type. The
matched value is returned in a type-specific field of `resource`:

| Resource type | `identity` value | Response field |
| --- | --- | --- |
| `EMPLOYEE` | National ID / tax number (e.g. NIF `09547483E`) | `resource.identity` |
| `VEHICLE` | Registration plate (matrícula) | `resource.registrationPlate` |
| `EQUIPMENT` | Serial number | `resource.serialNumber` |

The match is **exact and case-insensitive** — the full identifier must be
supplied. Partial values, prefixes, or wildcards are not supported and will
return no results.

Combine `identity` with `siteIds` to restrict the search to specific sites, and
with `resourceTypes` when the same identifier could exist across resource types.

### Example: cURL — look up an employee by NIF at a site

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?identity=09547483E&siteIds={siteId}" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

The response uses the same paginated
<!-- markdownlint-disable-next-line MD051 -->
[`CursorPageResponseGetAccessControlResponse`](#tag/access-status/GET/v1/companies/{companyId}/access-control/as-client)
shape as the list endpoint above. An identifier with no matching resource returns
`200 OK` with an empty `content` array — not a `404`.

## Get status for a specific resource

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/{id}`](#tag/access-status/GET/v1/companies/{companyId}/access-control/{id})

Returns detailed access control status for a single resource at a specific site.
The `{id}` path parameter is a **composite identifier** in the format
`{resourceId}-{siteId}` — concatenate the two UUIDs with a hyphen separator.

### Example: cURL — get status for a specific resource at a site

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "clientId": "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee",
  "resource": {
    "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "type": "EMPLOYEE",
    "name": "Jane",
    "surname": "Doe"
  },
  "contractor": {
    "id": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
    "name": "Acme Contractor Ltd",
    "taxId": "TAX-001",
    "email": "contact@acme.com"
  },
  "site": {
    "id": "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
    "name": "Main Warehouse"
  },
  "status": "NOT_ALLOWED",
  "accessControlType": "RESTRICTIVE",
  "issues": [
    {
      "requirementId": "11111111-bbbb-cccc-dddd-eeeeeeeeeeee",
      "requirementName": "Safety Training Certificate"
    }
  ],
  "issueRequirements": [],
  "statusPerContractActivity": []
}
```

## Pagination

The list endpoint supports two pagination modes:

- **Page mode** (default) — `page` / `size` / `sort`. Use it for UIs and
  ad-hoc queries.
- **Cursor mode** — `cursor` / `size`. Use it for a **full sync** (export every
  row into your own system). Page offsets shift when rows are created or
  revoked between requests, so walking pages can skip or duplicate rows; the
  cursor walk does not.

### Page mode

Every response returns a `page` object alongside the `content` array:

| Field | Description |
| --- | --- |
| `page.number` | Current zero-based page index. |
| `page.size` | Number of items per page. |
| `page.totalElements` | Total matching records across all pages. |
| `page.totalPages` | Total number of pages. |

Request the next page by incrementing `page`:

#### Example: cURL — request page 2

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?page=1&size=10" \
  -H "X-Api-Key: $TWIND_API_KEY"
```

### Cursor mode (full sync)

1. Send the first request with `cursor=start` plus your filters and `size`.
2. Read `nextCursor` from the response.
3. Repeat the **same request** replacing `cursor` with that `nextCursor`.
4. Stop when `nextCursor` is `null`.

#### Example: cURL — start a cursor walk

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?cursor=start&size=100&status=NOT_ALLOWED" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

**Response** (`200 OK`, trimmed)

```json
{
  "content": [
    {
      "resource": {
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "type": "EMPLOYEE"
      },
      "site": {
        "id": "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Main Warehouse"
      },
      "status": "NOT_ALLOWED"
    }
  ],
  "page": {
    "size": 100,
    "number": -1,
    "totalElements": -1,
    "totalPages": -1
  },
  "nextCursor": "<opaque-cursor>"
}
```

#### Example: cURL — continue the walk

Pass `nextCursor` URL-encoded and keep every other parameter unchanged:

```bash
curl -G \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client" \
  --data-urlencode "cursor=$NEXT_CURSOR" \
  --data-urlencode "size=100" \
  --data-urlencode "status=NOT_ALLOWED" \
  -H "X-Api-Key: $TWIND_API_KEY" \
  -H "Accept: application/json"
```

#### Cursor mode rules

- **Treat the cursor as opaque.** Do not parse or build it; only send `start`
  or a `nextCursor` you received.
- **Fixed order.** Rows come ordered by `(resource.id, site.id)`. `sort` is
  rejected with `400`, and `page` is ignored.
- **No totals.** `page.number`, `page.totalElements` and `page.totalPages` are
  `-1`. If the first response carries real counts, the request was not in cursor
  mode (check that `cursor` was sent). Outside cursor mode `nextCursor` is
  always `null`.
- **Keep filters unchanged.** A continuation with different filters is **not**
  rejected: it silently returns rows of the new filter set, so your sync would
  mix two result sets. To change filters, start a new walk with `cursor=start`.
- **Consistency.** Every row that exists and matches the filters for the whole
  walk is returned exactly once. Rows created or revoked during the walk may or
  may not appear. Time-dependent status (end of access, temporary
  authorizations, `onlyExpiringInFifteenDays`) is evaluated at the instant the
  walk started; changes made by access recalculation during the walk are
  reflected.
- **24-hour lifetime.** A cursor older than 24 hours fails with `400`; restart
  the walk with `cursor=start`.

The same cursor mode is available on the contractor-side endpoint
<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/as-contractor`](#tag/access-status/GET/v1/companies/{companyId}/access-control/as-contractor).

## Validation and errors (overview)

- **400** — A deprecated singular filter was combined with its plural
  counterpart (e.g. `siteId` and `siteIds`); or, in cursor mode, the cursor is
  empty, malformed, older than 24 hours, started under a different site
  hierarchy grouping, or combined with `sort`.
- **401** — Missing or invalid API key.
- **403** — Your integration does not have client access to this company.
- **404** — Resource not found; the composite `{resourceId}-{siteId}` identifier does not match any access control record (single-resource endpoint only).
- **500** — Internal server error; retry with exponential back-off.

## Related flows

- **Temporary authorizations** — To grant a contractor resource temporary access
  outside of its normal compliance window, see the
  [Temporary Authorizations Guide](client-access-control-temporary-authorizations.md).
- **Access register** — To view the physical entry and exit log for resources at
  your sites, see the [Access Register Guide](client-access-control-register.md).

## Next steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you
  have not set up your API key yet.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas.

---

*Need help? Contact [api-support@twind.io](mailto:api-support@twind.io) for
assistance.*
