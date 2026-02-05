# API Authentication Guide

This guide explains how to authenticate and use the Twind Access Control API.

## Prerequisites

Before you can use the API, ensure you have the following:

1. **A Twind account** - If you don't have one, contact [Twind Support](mailto:support@twind.com) to create your account.
2. **Access Control API product enabled** - This product must be activated for your account. Contact [Twind Support](mailto:support@twind.com) to request activation.

> **Note:** After the Access Control API product is enabled, you may need to log out and log back in for the changes to take effect.

## Managing Your API Keys

Once your account is set up and the Access Control API product is enabled, navigate to:

**[https://app.twind.io/configuration/apis](https://app.twind.io/configuration/apis)**

![TWIND API section](/guides/assets/get-api-token_api-section.png)

From this page, you can:

- **Create new API keys** - Generate new keys for your integrations
- **View existing API keys** - See all your current active keys
- **Delete API keys** - Revoke keys that are no longer needed

> **Security Tip:** Store your API keys securely. Never share them publicly or commit them to version control.

## Using Your API Key

To authenticate your requests, include the API key in the `X-Api-Key` HTTP header:

```
X-Api-Key: your-api-key-here
```

### Example: Basic Request with cURL

```bash
curl -X GET "https://api.twind.io/v1/endpoint" \
  -H "X-Api-Key: your-api-key-here"
```

## Verifying Your API Key

To verify that your API key is correctly configured, you can make a request to the `/v1/me` endpoint. This endpoint returns information about the authenticated user.

### Example: Verify Authentication

```bash
curl -X GET "https://api.twind.io/v1/me" \
  -H "X-Api-Key: your-api-key-here"
```

A successful response indicates that your API key is valid and properly configured. You can now use this key to access all available endpoints in the Access Control API.

## Next Steps

- Explore the [API Reference](../index.html) for all available endpoints
- Check out other guides for common integration patterns

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
