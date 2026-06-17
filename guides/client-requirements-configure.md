# Configure the Requirements You Demand from Contractors

Requirements are the heart of your compliance policy: each one defines a document or condition you demand (from whom, for which resources, with which expiration), and Twind generates the corresponding **requirement instances** for your contractors automatically. This guide covers creating and maintaining requirement configurations, and is written for **client** companies.

## Prerequisites

Before you start, ensure you have the following:

- **API key** — see the [API Authentication Guide](get-api-token.md) for the `X-Api-Key` header.
- **Your client company id** — from [`GET /v1/users/me/companies`](#tag/user/GET/v1/users/me/companies).
- **Rule ids (optional)** — rules scope a requirement by activity, site, contract, contractor, risk or resource type. Get the ids from the corresponding lookups (e.g. [`GET /v1/companies/{companyId}/sites`](#tag/lookups/GET/v1/companies/{companyId}/sites), [`GET .../activities`](#tag/lookups/GET/v1/companies/{companyId}/activities)).

## Step 1: Create the requirement

The body defines what you demand (`name`, `subject`, `evidenceType`), from whom (`appliedTo` + `rules`), and how it expires (`expirationType`). `acceptanceCriteria` is the checklist your reviewers will validate evidences against. If the contractor must fill in a template file, upload it first — see [Upload a Requirement Template](requirement-upload-api.md) — and pass the resulting key in `templateFile`.

[`POST /v1/companies/{companyId}/requirements`](#tag/configuration/POST/v1/companies/{companyId}/requirements)

### Example: Create a periodic employee requirement

```bash
curl -X POST "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirements" \
  -H "X-Api-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work-at-height training certificate",
    "subject": "EMPLOYEE",
    "evidenceType": "UPLOAD",
    "appliedTo": "ALL_CONTRACTORS",
    "multipleInstanceRequest": "NONE",
    "critical": true,
    "enableDoesNotApply": false,
    "expirationType": "PERIODIC",
    "periodicExpiration": {
      "startFirstDayOfMonth": false,
      "periodicity": 1,
      "periodicityType": "YEARS"
    },
    "gracePeriod": 15,
    "canBeSetInFuture": false,
    "custody": { "enabled": false },
    "rules": [
      { "risk": "00000000-0000-0000-0000-000000000080" }
    ],
    "acceptanceCriteria": [
      "Certificate is issued by an accredited training provider",
      "Employee name matches the assigned resource"
    ]
  }'
```

Response (`200 OK`):

```json
{
  "id": "00000000-0000-0000-0000-000000000060"
}
```

With this configuration, every employee assigned with the *Work at height* risk gets an instance of this requirement. An empty `rules` entry list applies the requirement according to `appliedTo` and `subject` alone.

## Step 2: Review your configuration

List your requirements (filters include `name`, `subject`, `evidenceType`, `disabled`, `critical`, and rule-based ones like `riskIds` or `siteIds`), fetch the full configuration of one, and check how many contractors a requirement affects before changing it.

[`GET /v1/companies/{companyId}/requirements`](#tag/configuration/GET/v1/companies/{companyId}/requirements) · [`GET .../requirements/{requirementId}`](#tag/configuration/GET/v1/companies/{companyId}/requirements/{requirementId}) · [`GET .../requirements/{requirementId}/stats`](#tag/configuration/GET/v1/companies/{companyId}/requirements/{requirementId}/stats)

### Example: Check the impact of a requirement

```bash
curl -X GET "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirements/00000000-0000-0000-0000-000000000060/stats" \
  -H "X-Api-Key: your-api-key-here"
```

Response (`200 OK`):

```json
{
  "contractorsAffected": 12
}
```

## Step 3: Update, disable or re-enable

The update is a **full replace** of the configuration (same body shape as the create — fields you omit are cleared, not kept). To stop generating new instances without losing history, disable the requirement; re-enable it later if needed.

> **Note:** If the requirement is reviewed by CTAIMA (document management delegated), some updates are rejected: changing `gracePeriod` returns **403** "Modification of fields reviewed by CTAIMA are not allowed", and changing `name` can return **400** "Last evidence status is required". Resending the current configuration unchanged succeeds.

[`PUT /v1/companies/{companyId}/requirements/{requirementId}`](#tag/configuration/PUT/v1/companies/{companyId}/requirements/{requirementId}) · [`PUT .../disable`](#tag/configuration/PUT/v1/companies/{companyId}/requirements/{requirementId}/disable) · [`PUT .../enable`](#tag/configuration/PUT/v1/companies/{companyId}/requirements/{requirementId}/enable)

### Example: Disable a requirement

```bash
curl -X PUT "https://app.twind.io/api/v1/companies/00000000-0000-0000-0000-000000000001/requirements/00000000-0000-0000-0000-000000000060/disable" \
  -H "X-Api-Key: your-api-key-here"
```

Response: `204 No Content` (both `disable` and `enable`).

## Common errors

| Status | Cause | Fix |
| --- | --- | --- |
| 401 | Missing or invalid `X-Api-Key`. | Check the key; see the [API Authentication Guide](get-api-token.md). |
| 403 | Insufficient permissions, or `companyId` is not a company your user belongs to. | Ensure your user has the necessary permissions for this action. |
| 400 | Validation error — missing required field, `expirationType: PERIODIC` without `periodicExpiration`, or rule entries with unknown ids. | Check the body against Step 1; fetch valid ids from the lookups. |
| 404 | Unknown `requirementId`. | Re-fetch ids from the requirements list. |

## Next Steps

- [Review and Approve Evidences](client-requirements-review-evidences.md) — what happens when contractors respond to your requirements.
- [Monitor Contractor Compliance](client-requirements-monitor-compliance.md) — follow the instances this configuration generates.
- [Upload a Requirement Template](requirement-upload-api.md) — upload mechanics for template files.
- Explore the [API Reference](../index.html?section=api) for all available endpoints.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
