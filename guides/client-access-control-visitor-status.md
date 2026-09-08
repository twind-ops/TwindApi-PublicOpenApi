# Access Control — Query Visitor Authorization Status (Client)

This guide explains how a **client company** — typically a turnstile or physical
access-control integrator — queries whether a visitor is currently authorized to
enter one of its sites, using the Twind HTTP API.

This is a **separate surface from worker/resource access control**. Visitors are
their own access-control subject with their own lifecycle (a scheduled visit
expires; a worker authorization does not) and their own data-protection
boundaries (a visitor's identity is shared across every client that visitor has
visited, but their visits and personal data stay scoped to the client that
recorded them). If you already integrate with the
[worker Access Control Status API](client-access-control-status.md), this is a
different endpoint with a different response shape — it does not replace or
change that one.

## Prerequisites

Before you integrate, ensure you have the following:

- **Authentication** — Valid credentials for the API (API key). See
  [API Authentication Guide](get-api-token.md) for API keys and the `X-Api-Key`
  header.
- **Company id** — The client company (`companyId`) whose site you are gating.
- **Visitor id** — The Twind `visitorId` for the person at the gate. Visitors are
  created and looked up via the
  <!-- markdownlint-disable-next-line MD051 -->
  [visitor endpoints](#tag/visitors/GET/v1/companies/{companyId}/visitor) — this
  guide assumes you already have one.
- **Site id** — The site the visitor is presenting at. Site IDs come from
  <!-- markdownlint-disable-next-line MD051 -->
  [`GET /v1/companies/{companyId}/sites`](#tag/sites/GET/v1/companies/{companyId}/sites).
- **The visitor-scheduling capability enabled for this client.** Without it, this
  endpoint returns `403 Forbidden` regardless of your API key's other
  permissions — contact support to enable it.

## Authentication

Include credentials on every request using **`X-Api-Key`** as described in the
[API Authentication Guide](get-api-token.md).

Example header:

```text
X-Api-Key: your-api-key-here
```

> **Security tip:** Do not log full tokens or keys. Store secrets outside your
> repository.

## Understanding visitor authorization statuses

Each visitor-site combination resolves to one of three statuses, evaluated fresh
on every request — never cached against a badge or credential:

| Status | Meaning |
| --- | --- |
| `ALLOWED` | The visitor has an active, in-window authorization for this site. Let them through. |
| `NOT_ALLOWED` | No active authorization — no visit was scheduled, it has not started yet, it has ended, or it was revoked. Deny entry. |
| `PARTIALLY_ALLOWED` | Reserved for future use; not produced by this endpoint today. Treat the same as `NOT_ALLOWED` if you see it. |

A **revoked** authorization takes effect at the next time you call this
endpoint — there is no credential-side signal, so integrations that gate on a
printed badge or a cached prior response will not observe a revocation. Always
resolve status at presentation time, not once per visit.

## Get a visitor's access control status at a site

<!-- markdownlint-disable-next-line MD051 -->
[`GET /v1/companies/{companyId}/visitor/{visitorId}/access-control`](#tag/visitor-authorization/GET/v1/companies/{companyId}/visitor/{visitorId}/access-control)

Returns the visitor's current access control status at the given site.

### Example: cURL — resolve a visitor at a site

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{companyId}/visitor/{visitorId}/access-control?siteId=cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`, `ALLOWED`)

```json
{
  "visitorId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "clientId": "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee",
  "siteId": "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
  "subjectType": "VISITOR",
  "status": "ALLOWED"
}
```

**Response** (`200 OK`, no active authorization)

```json
{
  "visitorId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "clientId": "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee",
  "siteId": "cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee",
  "subjectType": "VISITOR",
  "status": "NOT_ALLOWED"
}
```

Note that a visitor with no scheduled visit at all, a visitor whose visit has
not started or has already ended, and a visitor whose visit was explicitly
revoked are **indistinguishable** in this response — all three resolve to
`NOT_ALLOWED`. Deny entry in every case; the endpoint does not disclose which
of the three applies.

### Understanding the response fields

- **`status`** — The only field that should drive your gate decision. Treat
  anything other than `ALLOWED` as a denial.
- **`subjectType`** — Always `VISITOR` on this endpoint; present for parity with
  the worker access-control status shape.
- **`clientId`** / **`siteId`** — Echo the request parameters, useful for
  logging.

## Validation and errors (overview)

- **400** — Invalid `visitorId`, `siteId`, or `companyId` (malformed UUID or
  missing `siteId`).
- **401** — Missing or invalid API key.
- **403** — Your integration does not have client access to this company, or
  this client does not have the visitor-scheduling capability enabled.
- **500** — Internal server error; retry with exponential back-off.

A `visitorId` that does not exist, or that belongs to a different client, does
**not** produce a `404`. It resolves as `NOT_ALLOWED`, exactly like a valid
visitor with no active authorization — so a mistyped or cross-client id fails
safe (denies entry) rather than leaking whether the id exists elsewhere.

## Related flows

- **Worker/resource access control** — For the equivalent status check on
  employees, vehicles, and equipment, see the
  [Access Control Status Guide](client-access-control-status.md). It is a
  separate endpoint with a separate response shape.
- **Visitor records** — To create or look up a visitor and obtain a `visitorId`,
  see the visitors endpoints referenced above.
- **Visit register** — To record the visitor's physical entry and exit once you
  have decided to admit them, see the
  [Access Register Guide](client-access-control-register.md).

## Next steps

- Authenticate with the [API Authentication Guide](get-api-token.md) if you
  have not set up your API key yet.
- Explore the OpenAPI / API reference for your environment for full request and
  response schemas.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for
assistance.*
