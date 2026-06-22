# Access Control — Temporary Authorizations

This guide explains how a **client company** manages **temporary authorizations**
in the Twind HTTP API. A temporary authorization explicitly grants or denies
access to one or more contractor resources at one or more sites for a defined
date range — useful when a resource needs access outside its normal compliance
window or when you want to pre-approve access for a scheduled project.

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (API key). See
  [API Authentication Guide](get-api-token.md) for API keys and the `X-Api-Key`
  header.
- **Company id** — The client company (`companyId`) issuing the authorization.
- **Resource and site ids** — The UUIDs of the resources and sites to authorize.
  Obtain resource IDs from the access control status endpoints and site IDs from
  <!-- markdownlint-disable-next-line MD051 -->
  [`GET /v1/companies/{companyId}/sites`](#tag/sites/GET/v1/companies/{companyId}/sites).

Your Twind account must hold the **ClientAdmin** or
**TemporaryAuthorizationManager** role for the company; contact support if an
endpoint returns **403 Forbidden**.

## Authentication

Include credentials on every request using **`X-Api-Key`** as described in the
[API Authentication Guide](get-api-token.md).

Example header:

```text
X-Api-Key: your-api-key-here
```

> **Security tip:** Do not log full tokens or keys. Store secrets outside your
> repository.

## How temporary authorizations work

A single **authorization group** (identified by one `id`) covers a
**Cartesian product** of resources × sites for a date window. For example,
authorizing 2 employees at 3 sites creates 6 individual resource-site entries
under one group, all sharing the same `name`, `dateFrom`, `dateTo`, and
`status`.

Possible **status** values:

| Status | Meaning |
| --- | --- |
| `ALLOWED` | The authorization grants access to the resource at the site. |
| `NOT_ALLOWED` | The authorization explicitly blocks access. |

Possible **validity status** values (computed from dates):

| Validity status | Meaning |
| --- | --- |
| `SCHEDULED` | `dateFrom` is in the future. |
| `ACTIVE` | Today falls within `dateFrom`–`dateTo`. |
| `EXPIRED` | `dateTo` is in the past. |
| `DELETED` | The authorization was soft-deleted. |

## Create a temporary authorization

<!-- markdownlint-disable-next-line MD051 -->
[`POST /v1/companies/{companyId}/access-control/temporary-authorizations`](#tag/temporary-authorizations/POST/v1/companies/{companyId}/access-control/temporary-authorizations)

### Example: cURL — create authorization

```bash
curl -X POST \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Project Access",
    "contractorId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "siteIds": [
      "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
      "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee"
    ],
    "resourceIds": [
      "dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee"
    ],
    "dateFrom": "2026-07-01",
    "dateTo": "2026-07-31",
    "status": "ALLOWED",
    "reason": "Contractor crew required on site for July installation work."
  }'
```

**Response** (`201 Created`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

The **`id`** is the authorization group id. Use it to retrieve, update, or
delete the authorization.

## List temporary authorizations

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/temporary-authorizations`](#tag/temporary-authorizations/GET/v1/companies/{companyId}/access-control/temporary-authorizations)

Returns paginated authorizations (one row per resource-site pair).

### Example: cURL — list active authorizations for a contractor

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations?contractorIds=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&validityStatuses=ACTIVE" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "content": [
    {
      "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "name": "Summer Project Access",
      "status": "ALLOWED",
      "dateFrom": "2026-07-01",
      "dateTo": "2026-07-31",
      "authorizedBy": "11111111-bbbb-cccc-dddd-eeeeeeeeeeee",
      "authorizerName": "Alice Manager",
      "reason": "Contractor crew required on site for July installation work.",
      "resource": {
        "id": "dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee",
        "type": "EMPLOYEE",
        "name": "John",
        "surname": "Smith"
      },
      "site": {
        "id": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Main Warehouse"
      },
      "contractor": {
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Acme Contractor Ltd"
      }
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

## Get a temporary authorization by ID

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/temporary-authorizations/{temporaryAuthorizationId}`](#tag/temporary-authorizations/GET/v1/companies/{companyId}/access-control/temporary-authorizations/{temporaryAuthorizationId})

### Example: cURL — get by ID

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations/ffffffff-ffff-ffff-ffff-ffffffffffff" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`) — returns the full authorization detail including all
resource-site pairs under the group.

## Update a temporary authorization

<!-- markdownlint-disable-next-line MD051 -->
[`PATCH /v1/companies/{companyId}/access-control/temporary-authorizations/{temporaryAuthorizationId}`](#tag/temporary-authorizations/PATCH/v1/companies/{companyId}/access-control/temporary-authorizations/{temporaryAuthorizationId})

Updates an existing authorization. The same Cartesian product logic applies:
every `resourceId` is applied to every `siteId`.

### Example: cURL — extend the date range

```bash
curl -X PATCH \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations/ffffffff-ffff-ffff-ffff-ffffffffffff" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Project Access",
    "contractorId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "siteIds": ["bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee"],
    "resourceIds": ["dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee"],
    "dateFrom": "2026-07-01",
    "dateTo": "2026-08-15",
    "status": "ALLOWED",
    "authorizedBy": "11111111-bbbb-cccc-dddd-eeeeeeeeeeee"
  }'
```

**Response** (`200 OK`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

## Delete a temporary authorization

<!-- markdownlint-disable-next-line MD051 -->
[`DELETE /v1/companies/{companyId}/access-control/temporary-authorizations/{temporaryAuthorizationId}`](#tag/temporary-authorizations/DELETE/v1/companies/{companyId}/access-control/temporary-authorizations/{temporaryAuthorizationId})

Soft-deletes the authorization group. The authorization moves to
`validityStatus: DELETED` and no longer grants or blocks access.

### Example: cURL — delete authorization

```bash
curl -X DELETE \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations/ffffffff-ffff-ffff-ffff-ffffffffffff" \
  -H "X-Api-Key: your-api-key-here"
```

**Response** (`204 No Content`) — no body returned.

## Search authorization names

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/temporary-authorizations/names`](#tag/temporary-authorizations/GET/v1/companies/{companyId}/access-control/temporary-authorizations/names)

Returns authorization group names matching a search term. Useful for populating
autocomplete filters.

### Example: cURL — search names

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations/names?q=Summer" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

## Search authorizers

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-control/temporary-authorizations/authorizers`](#tag/temporary-authorizations/GET/v1/companies/{companyId}/access-control/temporary-authorizations/authorizers)

Returns users eligible to authorize temporary authorizations (ClientAdmin or
TemporaryAuthorizationManager role). Useful for populating an approver selector.

### Example: cURL — list authorizers

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/temporary-authorizations/authorizers?q=Alice" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

## Validation and errors (overview)

- **400** — `dateTo` is before `dateFrom`, or `siteIds` / `resourceIds` are
  empty.
- **401** — Missing or invalid API key.
- **403** — Your account does not hold the required role for this company.
- **404** — Authorization not found (wrong ID or already deleted).

## Related flows

- **Access control status** — Check whether a resource is currently allowed at a
  site via the
  [Access Control Status Guide](client-access-control-status.md).
- **Access register** — View the physical entry and exit log for resources at
  your sites in the [Access Register Guide](client-access-control-register.md).

## Next steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you
  have not set up your API key yet.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
