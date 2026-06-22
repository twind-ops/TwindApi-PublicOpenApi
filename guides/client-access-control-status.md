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
X-Api-Key: your-api-key-here
```

> **Security tip:** Do not log full tokens or keys. Store secrets outside your
> repository.

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
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

### Example: cURL — filter by contractor and status

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?contractorId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&status=NOT_ALLOWED" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

### Example: cURL — show resources expiring within 15 days

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?onlyExpiringInFifteenDays=true&sort=end_of_access,asc" \
  -H "X-Api-Key: your-api-key-here" \
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
        "identityId": "ID123456"
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
  -H "X-Api-Key: your-api-key-here" \
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

All list endpoints return a `page` object alongside the `content` array:

| Field | Description |
| --- | --- |
| `page.number` | Current zero-based page index. |
| `page.size` | Number of items per page. |
| `page.totalElements` | Total matching records across all pages. |
| `page.totalPages` | Total number of pages. |

Request the next page by incrementing `page`:

### Example: cURL — request page 2

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-control/as-client?page=1&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

## Validation and errors (overview)

- **401** — Missing or invalid API key.
- **403** — Your integration does not have client access to this company.
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

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
