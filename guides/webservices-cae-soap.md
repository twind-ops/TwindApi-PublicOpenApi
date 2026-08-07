# WebServices CAE (SOAP)

The **WebServices CAE** endpoints are a legacy, WCF‑compatible SOAP surface that
re‑exposes Twind access‑control status in the contract that turnstile and site
access‑control systems already consume. They are a drop‑in replacement for the
classic .NET (`BasicHttpBinding`) service, so existing integrations keep working
without code changes.

Two operations are available today:

**`CT_EstadoTrabajadores`**

- **Purpose:** Worker (employee) access status for a company
- **Endpoint:** `POST https://webservice.twind.io/CT_EstadoTrabajadores.svc`
- **WSDL:** `GET https://webservice.twind.io/CT_EstadoTrabajadores.svc/wsdl`

---

**`CT_EstadoVehiculos`**

- **Purpose:** Vehicle access status for a company
- **Endpoint:** `POST https://webservice.twind.io/CT_EstadoVehiculos.svc`
- **WSDL:** `GET https://webservice.twind.io/CT_EstadoVehiculos.svc/wsdl`

> **Building a new integration?** If you are starting from scratch, prefer the REST
> [Access Control](client-access-control-status.md) endpoints — they use standard
> API‑key authentication and JSON. The SOAP surface exists to keep the large base of
> existing CAE turnstile integrations working.

The WSDL document is the **authoritative contract** for each operation (namespaces,
element names, and types). Use it to generate your client; the examples below are
illustrative.

## Prerequisites

- **Company set up in Twind** with access‑control data (contractors, resources, sites).
- **An API key** — the credential for the SOAP surface (see
  [Authentication](#authentication)).
- A SOAP client (generated from the WSDL) or the ability to POST a raw SOAP 1.1
  envelope with `Content-Type: text/xml`.

## The two operations

Both operations take the caller's credentials plus an optional site filter and return
the current access‑control status for the company's resources.

### `CT_EstadoTrabajadores` — worker status

Returns the **employees** (resources of type `EMPLOYEE` with a non‑empty identity
document) known to the company's access control, with their per‑site authorization
state.

- **`centro`** *(optional, UUID)* — restrict the response to a single site. Omit it to
  return every site the caller can see.
- **`fecha`** *(optional)* — accepted for backward compatibility; it is parsed but does
  **not** filter the result.

### `CT_EstadoVehiculos` — vehicle status

Returns the **vehicles** (resources of type `VEHICLE` with a non‑empty plate) with their
per‑site authorization state. Accepts the same optional **`centro`** filter.

### Reading the response

Each returned resource carries its authorization state per site. The key field is the
site **cut‑off date** (`fechaCorte`):

- A resource that is currently allowed is returned with its normal authorization data.
- A resource that has been **revoked** is returned **once** with a **past `fechaCorte`**
  and a reason (`motivo`) — this is the signal the turnstile uses to revoke access.
  (Revoked resources are served for a retention window and then purged, so a turnstile
  that polls regularly always sees the revocation at least once.)

Refer to the WSDL for the exact element names and types of the response.

## Authentication

Every request carries a `userId` / `userClave` credential pair **in the SOAP body**
(never as an HTTP header).

### API key as `userId` / `userClave`

Companies holding the **"WebServices CAE compatible"** product authenticate the SOAP
surface with an **API key**:

- Send an **API key's *name*** as the **`userId`**.
- Send **that same key's *value*** as the **`userClave`**.

Rules:

- The **`userId` must be the name of one of your company's *active* API keys.** Manage
  your keys as described in the [API Authentication Guide](get-api-token.md).
- **Renaming a key changes the `userId`** your client must send. If you rename a key that
  a SOAP integration relies on, update the integration's `userId` to the new name.
- A wrong `userId` or `userClave` returns a **single, generic authentication fault** —
  the response does not disclose which part was wrong or whether the name exists.

Example SOAP 1.1 envelope (illustrative — confirm element names against the WSDL):

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Body>
    <tem:CT_EstadoTrabajadores>
      <tem:userId>YOUR_API_KEY_NAME</tem:userId>
      <tem:userClave>YOUR_API_KEY_VALUE</tem:userClave>
      <!-- optional: restrict to one site -->
      <tem:centro>00000000-0000-0000-0000-000000000000</tem:centro>
    </tem:CT_EstadoTrabajadores>
  </soap:Body>
</soap:Envelope>
```

```bash
curl -X POST "https://<your-soap-host>/CT_EstadoTrabajadores.svc" \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H "SOAPAction: http://tempuri.org/CT_EstadoTrabajadores" \
  --data @request.xml
```

The `CT_EstadoVehiculos` request is identical except for the operation element name.

## Errors

- **Authentication failure** — a single generic SOAP fault (see
  [Authentication](#authentication) above). It does not reveal whether the `userId` or
  the `userClave` was at fault.
- **Invalid `centro`** — if the supplied site UUID is not one the caller can see, the
  operation returns no rows for that site rather than an error.

For anything unexpected, contact [Twind Support](mailto:support@twind.com).
