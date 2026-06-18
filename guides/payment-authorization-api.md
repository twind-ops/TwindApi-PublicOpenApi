# Payment Authorization API

Query the payment authorization status of your contractors and contracts, and find the
requirements blocking payment when a contractor or contract is **not authorized**.

The status endpoints are read-only (`GET`); a small set of
[configuration endpoints](#configuration) additionally let you read and update the client's
calculation mode. The API mirrors the business rules of the Twind Payment Authorization
module, including both calculation modes (Individual and Subcontracting Chain).

## Prerequisites

- **Client company ID** (`clientId`) — UUID of your client company. Obtain from
  `GET /v1/users/me/companies` (field `companyId`).
- **Payment Authorization product** — must be subscribed for the company. Endpoints
  return **403 Forbidden** otherwise.
- **API key** — See [API Authentication Guide](get-api-token.md).
- *(Optional)* **Requirements API product** — needed only to dereference a blocking
  requirement instance into its full configuration and evidence (see
  [Step 4](#step-4-resolve-a-blocking-requirement)).

Contact support if an endpoint returns **403 Forbidden** unexpectedly.

## Authentication

```text
X-Api-Key: your-api-key-here
```

See [API Authentication Guide](get-api-token.md) for full setup.

---

## How payment authorization works

A contractor's status is driven by **payment-required requirements** — existing
requirements the client admin tags as payment-required in the requirements module.
No new requirement types are involved; tagging a requirement makes it count toward
payment authorization. Disabled requirements are excluded from the calculation.

- Status is calculated **in real time** per contractor-contract pair: `AUTHORIZED` when
  every payment-required requirement is satisfied, `NOT_AUTHORIZED` otherwise. In
  `SUBCONTRACTING_CHAIN` mode a contractor's subcontractors count too — see
  [Calculation modes](#calculation-modes).
- The `by-company` endpoint (Step 1) then aggregates these pair-level results into a
  single status per contractor.
- If a client has **no payment-required requirements**, every contractor is
  `AUTHORIZED` by default.
- The same contractor can be `AUTHORIZED` on one contract and `NOT_AUTHORIZED` on
  another — use the by-contract endpoints (Step 3) for that granularity.

---

## Calculation modes

Payment authorization is computed in one of two **calculation modes**, which decide how a
contractor's status is aggregated across a subcontracting chain:

- **Individual** — each contract (and each contractor-contract pair) is evaluated on its
  own. A contractor's status reflects only its own payment-required requirements; its
  subcontractors never affect it.
- **Subcontracting Chain** — the whole subcontracting tree (every contract sharing the same
  main contract) is treated as a single unit. A single failing contractor at any level
  marks every contract in the tree `NOT_AUTHORIZED`, both up and down the chain (expired
  contracts never block).

The mode is a **client-level setting** that applies to all of the client's payment
authorization calculations. Every row and detail response reflects the mode in effect via
the `calculationMode` field. You can also read it directly with `GET .../config` and update
it with `PUT .../config` — see [Configuration](#configuration).

| Mode | Meaning |
|------|---------|
| `INDIVIDUAL` | Each contractor/contract is evaluated on its own — its `paymentStatus` reflects only its own payment-required requirements. |
| `SUBCONTRACTING_CHAIN` | A contractor's status also depends on its subcontractors: a single failing contractor at any level of the subcontracting tree marks **every** contract in that tree `NOT_AUTHORIZED` (expired contracts never block). **All** endpoints — both the list and the detail ones — return this chain-aggregated `paymentStatus`. Only the **detail** responses additionally expose *which* requirement blocks: `blockingRequirements[]` / `issues[]` may include requirements owned by *other* contractors in the chain, each carrying its own `contractor` field. |

> When resolving a blocking requirement (Step 4), always read the `requirementInstanceId`'s
> owning company from the issue's own `contractor.id` — in Subcontracting Chain mode it can
> differ from the contractor you queried.

---

## Step 1: List contractors by payment status

[`GET /v1/companies/{clientId}/payment-authorization/by-company`](#tag/payment-authorization/GET/v1/companies/{clientId}/payment-authorization/by-company)

Returns one row per contractor with at least one active contract with the client, with
their **aggregated** payment authorization status. Paginated.

> **Which calculation mode are you in?** The aggregation depends on the client's mode. If
> you don't already know it, call [`GET .../config`](#configuration) first. In
> `SUBCONTRACTING_CHAIN` mode a contractor can be `NOT_AUTHORIZED` because of a
> *subcontractor's* failing requirement rather than its own — so seeing whole chains marked
> `NOT_AUTHORIZED` is expected. See [Calculation modes](#calculation-modes), then drill into
> the [contractor detail](#step-2-inspect-a-contractors-blocking-requirements) or
> [contract detail](#step-3-work-at-the-contract-level) to find the responsible company.

### Common query parameters

| Parameter | Description |
|-----------|-------------|
| `page`, `size` | Pagination. Zero-based `page`, `size` defaults to 10. |
| `sort` | `field,direction` — allowed field: `contractor_name` (default). E.g. `?sort=contractor_name,asc`. |
| `paymentStatus` | `AUTHORIZED` or `NOT_AUTHORIZED`. |
| `contractorIds` | Filter by contractor company UUIDs. |
| `contractIds` | Only contractors with at least one matching contract. |
| `siteIds` | Filter by site UUIDs (matches contract scope, including child sites). |
| `activityIds` | Filter by activity UUIDs. |
| `managerIds` | Filter by contract manager user IDs. |
| `dateFrom`, `dateTo` | Contract date range (`contract.dateFrom >= dateFrom`, `contract.dateTo <= dateTo`). ISO 8601 date format (`YYYY-MM-DD`). |
| `maxContractsPerContractor` | Cap the `contracts[]` preview per row. Omit to return all (useful for exports). |

### Example: List contractors by payment status

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/by-company?paymentStatus=NOT_AUTHORIZED&page=0&size=20" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "content": [
    {
      "contractor": {
        "id": "11111111-0000-0000-0000-000000000001",
        "name": "Electrical Works Ltd",
        "taxId": "B12345678"
      },
      "contracts": [
        { "id": "aaaaaaaa-0000-0000-0000-000000000001", "name": "Building Maintenance 2026" }
      ],
      "totalContractsCount": 1,
      "paymentStatus": "NOT_AUTHORIZED",
      "calculationMode": "INDIVIDUAL"
    }
  ],
  "page": { "size": 20, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Save the `contractor.id` of any `NOT_AUTHORIZED` row to inspect what's blocking it
([Step 2](#step-2-inspect-a-contractors-blocking-requirements)).

---

## Step 2: Inspect a contractor's blocking requirements

[`GET /v1/companies/{clientId}/payment-authorization/contractors/{contractorId}`](#tag/payment-authorization/GET/v1/companies/{clientId}/payment-authorization/contractors/{contractorId})

Returns the contractor, its aggregated payment status, its contracts with the client, and —
when `NOT_AUTHORIZED` — the `blockingRequirements[]` currently preventing payment, each
with the specific failing **subject** (contractor company, employee, vehicle, equipment or
product).

### Example: Get a contractor's payment status

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/contractors/11111111-0000-0000-0000-000000000001" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "contractor": {
    "id": "11111111-0000-0000-0000-000000000001",
    "name": "Electrical Works Ltd",
    "taxId": "B12345678"
  },
  "paymentStatus": "NOT_AUTHORIZED",
  "calculationMode": "INDIVIDUAL",
  "contracts": [
    {
      "id": "aaaaaaaa-0000-0000-0000-000000000001",
      "name": "Building Maintenance 2026",
      "level": 0,
      "paymentStatus": "NOT_AUTHORIZED"
    }
  ],
  "blockingRequirements": [
    {
      "requirementInstanceId": "dddddddd-0000-0000-0000-000000000001",
      "requirement": {
        "id": "eeeeeeee-0000-0000-0000-000000000001",
        "name": "Liability Insurance"
      },
      "status": "EXPIRED",
      "subject": {
        "type": "CONTRACTOR",
        "id": "11111111-0000-0000-0000-000000000001",
        "name": "Electrical Works Ltd",
        "identifier": "B12345678"
      },
      "contractor": {
        "id": "11111111-0000-0000-0000-000000000001",
        "name": "Electrical Works Ltd",
        "taxId": "B12345678"
      }
    }
  ]
}
```

### Reading a blocking requirement

| Field | Meaning |
|-------|---------|
| `requirementInstanceId` | The instance blocking payment. Use it in [Step 4](#step-4-resolve-a-blocking-requirement). |
| `requirement.{id,name}` | The requirement **definition** that failed. |
| `status` | Why it blocks: `PENDING_UPLOAD`, `PENDING_REVIEW`, `REJECTED`, `EXPIRED` or `PENDING_VALIDITY`. Satisfied statuses (`APPROVED`, `UNDER_GRACE_PERIOD`) never appear here. |
| `subject` | The specific entity failing: `type` is `CONTRACTOR`, `EMPLOYEE`, `VEHICLE`, `EQUIPMENT` or `PRODUCT`. `identifier` is a human-readable id (national id, plate, …) when available. |
| `contractor` | The company that **owns** the failing requirement. Equals the queried contractor in Individual mode; may differ in Subcontracting Chain mode. |

> **404 Not Found** means the contractor has no active contract with this client.

---

## Step 3: Work at the contract level

When you need per-contract granularity instead of an aggregated contractor status, use the
by-contract pair.

### List contracts by payment status

[`GET /v1/companies/{clientId}/payment-authorization/by-contract`](#tag/payment-authorization/GET/v1/companies/{clientId}/payment-authorization/by-contract)

Returns one row per contract. Accepts the same filters as `by-company` — except
`maxContractsPerContractor`, which is `by-company`-only — plus:

| Parameter | Description |
|-----------|-------------|
| `subcontractingLevel` | Filter to a single contract level (exact match, not a range): `0` = main contract, `1` = first subcontract level, `2` = second, and so on. |
| `showExpired` | `false` (default) returns only non-expired contracts; `true` includes expired ones. |

### Example: List contracts by payment status

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/by-contract?paymentStatus=NOT_AUTHORIZED&showExpired=false&page=0&size=20" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "content": [
    {
      "contractor": { "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd" },
      "contract": {
        "id": "aaaaaaaa-0000-0000-0000-000000000001",
        "name": "Building Maintenance 2026",
        "dateFrom": "2026-01-01",
        "dateTo": "2026-12-31",
        "level": 0,
        "sites": [
          {
            "id": "ssssssss-0000-0000-0000-000000000001",
            "name": "Site A",
            "level": "SITE",
            "breadcrumb": [
              { "id": "bizbiz00-0000-0000-0000-000000000001", "name": "Acme Group", "level": "BUSINESS" },
              { "id": "ssssssss-0000-0000-0000-000000000001", "name": "Site A", "level": "SITE" }
            ]
          }
        ],
        "activities": [{ "id": "actact01-0000-0000-0000-000000000001", "name": "Wiring" }]
      },
      "paymentStatus": "NOT_AUTHORIZED",
      "calculationMode": "INDIVIDUAL"
    }
  ],
  "page": { "size": 20, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

### Inspect a single contract

[`GET /v1/companies/{clientId}/payment-authorization/by-contract/{contractId}`](#tag/payment-authorization/GET/v1/companies/{clientId}/payment-authorization/by-contract/{contractId})

Returns the contract's payment status, an `issueCount`, and the `issues[]` blocking it.
Each item in `issues[]` has the **same shape** as `blockingRequirements[]` in Step 2 — only the field name differs between the two endpoints.
It also returns `calculationMode` and a `contracts[]` array of the contracts evaluated
together: in `INDIVIDUAL` mode that is just the contract you queried; in
`SUBCONTRACTING_CHAIN` mode it lists every active contract in the subcontracting tree, each
with its own `contractor` and `paymentStatus`.

### Example: Inspect a single contract's payment status

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/by-contract/aaaaaaaa-0000-0000-0000-000000000001" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "contractor": { "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd" },
  "contract": {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "name": "Building Maintenance 2026",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-12-31",
    "level": 0,
    "sites": [
      {
        "id": "ssssssss-0000-0000-0000-000000000001",
        "name": "Site A",
        "level": "SITE",
        "breadcrumb": [
          { "id": "bizbiz00-0000-0000-0000-000000000001", "name": "Acme Group", "level": "BUSINESS" },
          { "id": "ssssssss-0000-0000-0000-000000000001", "name": "Site A", "level": "SITE" }
        ]
      }
    ],
    "activities": [{ "id": "actact01-0000-0000-0000-000000000001", "name": "Wiring" }]
  },
  "paymentStatus": "NOT_AUTHORIZED",
  "issueCount": 1,
  "issues": [
    {
      "requirementInstanceId": "dddddddd-0000-0000-0000-000000000001",
      "requirement": { "id": "eeeeeeee-0000-0000-0000-000000000001", "name": "Liability Insurance" },
      "status": "EXPIRED",
      "subject": { "type": "CONTRACTOR", "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd", "identifier": "B12345678" },
      "contractor": { "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd", "taxId": "B12345678" }
    }
  ],
  "calculationMode": "INDIVIDUAL",
  "contracts": [
    {
      "id": "aaaaaaaa-0000-0000-0000-000000000001",
      "name": "Building Maintenance 2026",
      "level": 0,
      "contractor": { "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd", "taxId": "B12345678" },
      "paymentStatus": "NOT_AUTHORIZED"
    }
  ]
}
```

### Example: Subcontracting Chain mode

Here the queried main contract (`level: 0`) is `NOT_AUTHORIZED` even though the main
contractor itself is compliant — a **subcontractor** (`level: 1`) further down the tree has
an expired requirement. In chain mode that failure cascades: the subcontract is
`NOT_AUTHORIZED`, and that bubbles up to mark **every** contract in the tree — including the
main contract — `NOT_AUTHORIZED`.

Two fields in the `issues[]` entry are easy to confuse:

- **`contractor`** is the *responsible* company — here the subcontractor, **not** the
  contract's main contractor. This is the `contractor.id` trap from Step 2: always
  dereference a blocking requirement against this `contractor.id`.
- **`subject`** is the *failing* entity and is polymorphic (`CONTRACTOR`, `EMPLOYEE`,
  `VEHICLE`, …). When the requirement is on the company itself, `subject` and `contractor`
  point at the same entity — as they do here.

`contracts[]` lists every contract in the chain with its own status.

```json
{
  "contractor": { "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd" },
  "contract": {
    "id": "aaaaaaaa-0000-0000-0000-000000000001",
    "name": "Building Maintenance 2026",
    "level": 0,
    "sites": [{ "id": "ssssssss-0000-0000-0000-000000000001", "name": "Site A", "level": "SITE", "breadcrumb": [] }],
    "activities": [{ "id": "actact01-0000-0000-0000-000000000001", "name": "Wiring" }]
  },
  "paymentStatus": "NOT_AUTHORIZED",
  "issueCount": 1,
  "issues": [
    {
      "requirementInstanceId": "dddddddd-0000-0000-0000-000000000002",
      "requirement": { "id": "eeeeeeee-0000-0000-0000-000000000002", "name": "Social Security Certificate" },
      "status": "EXPIRED",
      "subject": { "type": "CONTRACTOR", "id": "22222222-0000-0000-0000-000000000002", "name": "Welding Subcontractor SL", "identifier": "B87654321" },
      "contractor": { "id": "22222222-0000-0000-0000-000000000002", "name": "Welding Subcontractor SL", "taxId": "B87654321" }
    }
  ],
  "calculationMode": "SUBCONTRACTING_CHAIN",
  "contracts": [
    {
      "id": "aaaaaaaa-0000-0000-0000-000000000001",
      "name": "Building Maintenance 2026",
      "level": 0,
      "contractor": { "id": "11111111-0000-0000-0000-000000000001", "name": "Electrical Works Ltd", "taxId": "B12345678" },
      "paymentStatus": "NOT_AUTHORIZED"
    },
    {
      "id": "aaaaaaaa-0000-0000-0000-000000000002",
      "name": "Welding subcontract",
      "level": 1,
      "contractor": { "id": "22222222-0000-0000-0000-000000000002", "name": "Welding Subcontractor SL", "taxId": "B87654321" },
      "paymentStatus": "NOT_AUTHORIZED"
    }
  ]
}
```

---

## Step 4: Resolve a blocking requirement

The Payment Authorization API tells you *which* requirement instance is blocking, but not
its full configuration or evidence. To get that, dereference the `requirementInstanceId`
against the **Requirements API**:

[`GET /v1/companies/{companyId}/requirement-instances/{instanceId}`](#tag/requirements/GET/v1/companies/{companyId}/requirement-instances/{instanceId})

- `instanceId` = the `requirementInstanceId` from the issue.
- `companyId` = the issue's **`contractor.id`** (the company that owns the requirement) —
  *not* necessarily the contractor you originally queried.

### Example: Fetch the blocking requirement instance

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/11111111-0000-0000-0000-000000000001/requirement-instances/dddddddd-0000-0000-0000-000000000001" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

> Requires the **Requirements API** product to be subscribed in addition to Payment
> Authorization. Resolving an `EMPLOYEE` / `VEHICLE` / `EQUIPMENT` / `PRODUCT` subject id
> against its resource list endpoint likewise requires the matching resource product.

---

## Configuration

Read and manage the client's calculation mode, and review its change history. These
endpoints require the Payment Authorization product to be active; updating the mode
additionally requires write permission.

### Read the current calculation mode

[`GET /v1/companies/{clientId}/payment-authorization/config`](#tag/payment-authorization/GET/v1/companies/{clientId}/payment-authorization/config)

Returns the client's current [calculation mode](#calculation-modes). Defaults to
`INDIVIDUAL` when no mode has been explicitly saved.

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/config" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{ "calculationMode": "INDIVIDUAL" }
```

### Update the calculation mode

[`PUT /v1/companies/{clientId}/payment-authorization/config`](#tag/payment-authorization/PUT/v1/companies/{clientId}/payment-authorization/config)

Sets the calculation mode. The change applies immediately to every status calculation and
is recorded in the configuration history. Requires the `PAYMENT_AUTHORIZATION_WRITE`
permission.

```bash
curl -X PUT \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/config" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{ "calculationMode": "SUBCONTRACTING_CHAIN" }'
```

**Response** (`204 No Content`)

### Review the configuration history

[`GET /v1/companies/{clientId}/payment-authorization/history`](#tag/payment-authorization/GET/v1/companies/{clientId}/payment-authorization/history)

Returns product activation, deactivation and calculation-mode changes, most recent first.

```bash
curl -X GET \
  "https://app.twind.io/api/v1/companies/{clientId}/payment-authorization/history?page=0&size=10" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Response** (`200 OK`)

```json
{
  "content": [
    {
      "timestamp": "2026-06-01T10:15:30Z",
      "eventName": "system_product.updated",
      "calculationMode": "SUBCONTRACTING_CHAIN",
      "actor": { "id": "uuuuuuuu-0000-0000-0000-000000000001", "name": "Jane Admin", "email": "jane@client.com" }
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

`eventName` is one of `system_product.created` (product activated),
`system_product.updated` (e.g. mode changed) or `system_product.deleted` (product
deactivated).

---

## Errors

Errors are returned in the standard [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807)
problem format, with a `detail` message you can surface to help diagnose the cause.

| Status | When | Meaning |
|--------|------|---------|
| `400` | Invalid request | A malformed parameter, or an unknown `calculationMode` value on `PUT /config`. |
| `401` | Not authenticated | The `X-Api-Key` header is missing or invalid. |
| `403` | Not allowed | One of three distinct cases — read the `detail` message: your key lacks the required permission; the **Payment Authorization product is not subscribed** for the company; or the feature is disabled. |
| `404` | Nothing here for this client | The contractor or contract isn't linked to this client (e.g. requesting contractor detail for a contractor you don't engage). On `PUT /config`, a caller that bypasses product-gating (e.g. Global Admin) gets `404` instead of `403` when the product isn't enabled. |
| `5xx` | Unexpected server error | Same problem format; retry or contact support if it persists. |

A response body follows the RFC 7807 shape (the `detail` text varies by cause):

```json
{
  "type": "about:blank",
  "title": "Forbidden",
  "status": 403,
  "detail": "Payment Authorization product is not enabled for company 11111111-0000-0000-0000-000000000001"
}
```

---

## Next Steps

- Set up authentication with the [API Authentication Guide](get-api-token.md).
- Use the [Postman Setup Guide](postman-setup.md) to explore all endpoints interactively.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
