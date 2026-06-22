# Access Control — Access Register

This guide explains how to use the **access register** in the Twind HTTP API.
The access register is a chronological log of **site entries and exits** for
contractor resources (employees, vehicles, and equipment). Use it to record when
a resource arrives at a site, when it leaves, and to query the full movement
history.

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (API key). See
  [API Authentication Guide](get-api-token.md) for API keys and the `X-Api-Key`
  header.
- **Company id** — The company (`companyId`) whose access register you are
  managing.
- **Resource and site ids** — The UUIDs of the resource and site. Obtain
  resource IDs from the access control status endpoints and site IDs from
  <!-- markdownlint-disable-next-line MD051 -->
  [`GET /v1/companies/{companyId}/sites`](#tag/sites/GET/v1/companies/{companyId}/sites).

Your Twind account must be allowed to read and write access register data for
that company; contact support if an endpoint returns **403 Forbidden**.

## Authentication

Include credentials on every request using **`X-Api-Key`** as described in the
[API Authentication Guide](get-api-token.md).

Example header:

```text
X-Api-Key: your-api-key-here
```

> **Security tip:** Do not log full tokens or keys. Store secrets outside your
> repository.

## Typical flow

1. **Record an entry** — call `POST /access-register` when a resource arrives
   on site.
2. **Query the register** — call `GET /access-register` to list entries, filter
   by site, contractor, resource type, date range, or open entries.
3. **Get a single record** — call `GET /access-register/{id}` to fetch one
   entry in full.
4. **Record an exit** — call `PATCH /access-register/{id}` when the resource
   leaves the site.

## Step 1: Record a site entry

<!-- markdownlint-disable-next-line MD051 -->
[`POST /v1/companies/{companyId}/access-register`](#tag/access-register/POST/v1/companies/{companyId}/access-register)

### Example: cURL — record an entry

```bash
curl -X POST \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{companyId}",
    "resourceId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "siteId": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
    "entryAt": "2026-06-22T08:00:00+00:00",
    "origin": "WEB",
    "closeOpenEntries": true,
    "entryNotes": "Arrived for scheduled maintenance."
  }'
```

**Response** (`200 OK`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

The **`id`** is the access register entry ID. Store it to record the exit later.

## Step 2: Query the access register

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-register`](#tag/access-register/GET/v1/companies/{companyId}/access-register)

Returns paginated access register records. Default sort is `entry_at` descending
(most recent first).

### Example: cURL — list all entries for today

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register?from=2026-06-22T00:00:00%2B00:00&to=2026-06-22T23:59:59%2B00:00" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

### Example: cURL — list open entries (on site right now)

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register?entryOnly=true" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

### Example: cURL — search by resource name

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register?q=John&resourceType=EMPLOYEE" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "content": [
    {
      "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
      "client": {
        "id": "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "My Client Company"
      },
      "contractor": {
        "id": "dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Acme Contractor Ltd"
      },
      "resource": {
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "type": "EMPLOYEE",
        "name": "John",
        "surname": "Smith",
        "identityId": "ID654321"
      },
      "site": {
        "id": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee",
        "name": "Main Warehouse"
      },
      "entry": {
        "at": "2026-06-22T08:00:00+00:00",
        "notes": "Arrived for scheduled maintenance.",
        "origin": "WEB"
      },
      "exit": null,
      "timeOnSite": null
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

- **`exit`** is `null` when the resource has not yet left the site.
- **`timeOnSite`** is populated once an exit is recorded.

## Step 3: Get a single access register record

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/access-register/{accessRecordId}`](#tag/access-register/GET/v1/companies/{companyId}/access-register/{accessRecordId})

### Example: cURL — get by ID

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register/ffffffff-ffff-ffff-ffff-ffffffffffff" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`) — same shape as a single item from the list response.

## Step 4: Record a site exit

<!-- markdownlint-disable-next-line MD051 -->
[`PATCH /v1/companies/{companyId}/access-register/{accessRegisterId}`](#tag/access-register/PATCH/v1/companies/{companyId}/access-register/{accessRegisterId})

Sets the exit time and optional notes on an open access register record.

### Example: cURL — record an exit

```bash
curl -X PATCH \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register/ffffffff-ffff-ffff-ffff-ffffffffffff" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "companyId": "{companyId}",
    "exitAt": "2026-06-22T17:30:00+00:00",
    "origin": "WEB",
    "exitNotes": "Work completed. Left site."
  }'
```

**Response** (`200 OK`)

```json
{
  "id": "ffffffff-ffff-ffff-ffff-ffffffffffff"
}
```

## Pagination

All list responses include a `page` object:

| Field | Description |
| --- | --- |
| `page.number` | Current zero-based page index. |
| `page.size` | Items per page. |
| `page.totalElements` | Total matching records. |
| `page.totalPages` | Total pages. |

Request the next page by incrementing `page`:

### Example: cURL — request page 2

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/access-register?page=1&size=10" \
  -H "X-Api-Key: your-api-key-here"
```

## Validation and errors (overview)

- **400** — Invalid request body or validation error (e.g. missing required
  fields).
- **401** — Missing or invalid API key.
- **403** — Your integration is not allowed to manage the access register for
  this company.
- **404** — Access register entry not found (wrong ID or wrong company).

## Related flows

- **Access control status** — Before recording an entry, you can verify whether
  a resource is currently **ALLOWED** at the site using the
  [Access Control Status Guide](client-access-control-status.md).
- **Temporary authorizations** — To grant a resource access during a date range
  when it might otherwise be blocked, see the
  [Temporary Authorizations Guide](client-access-control-temporary-authorizations.md).

## Next steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you
  have not set up your API key yet.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
