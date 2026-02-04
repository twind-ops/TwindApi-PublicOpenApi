# How to Obtain Your API Key

This guide explains how to get your API key and start using the Twind Access Control API.

## Prerequisites

- An active Twind account with API access enabled
- Admin or developer permissions in your organization

## Getting Your API Key

### Step 1: Access the Developer Settings

Log in to your Twind account and navigate to **Settings > API & Integrations**.

### Step 2: Generate a New API Key

Click on **"Generate New API Key"** and provide a descriptive name for your key (e.g., "Production Integration" or "Development Testing").

### Step 3: Copy and Store Your Key

Once generated, copy your API key immediately. For security reasons, the full key will only be displayed once.

> **Important:** Store your API key securely. Never share it publicly or commit it to version control.

## Using Your API Key

Include your API key in all requests using the `X-Api-Key` header:

```bash
curl -X GET "https://app.twind.io/api/v1/me" \
  -H "X-Api-Key: your-api-key-here"
```

## Verifying Your Setup

To verify your API key is working correctly, make a request to the `/v1/me` endpoint:

```bash
GET /v1/me
```

A successful response will return your user information and associated companies.

## Next Steps

- Check out the [API Reference](#) for all available endpoints
- Learn about common workflows in our other guides

---

*Need help? Contact support@twind.com for assistance.*
