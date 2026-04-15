# Using Postman with the Twind API

This guide explains how to import the Twind API into Postman using the pre-built collection and environment files.

## Prerequisites

- [Postman](https://www.postman.com/downloads/) installed
- A Twind API key (see the [Get API Key](get-api-token.md) guide)

## Step 1: Download the files

Download both files below:

| File | Description |
|------|-------------|
| [openapi-public-api-postman-collection.json](https://raw.githubusercontent.com/twind-ops/TwindApi-PublicOpenApi/main/openapi-public-api-postman-collection.json) | Collection with all endpoints organised by section |
| [postman-environment-twind-api.json](https://raw.githubusercontent.com/twind-ops/TwindApi-PublicOpenApi/main/postman-environment-twind-api.json) | Environment with the production base URL pre-configured |

Alternatively, you can paste either URL directly into Postman's **Import → Link** dialog to import without downloading.

## Step 2: Import into Postman

1. Open Postman
2. Click **Import** (top left)
3. Drag and drop both files, or click **files** and select them
4. Click **Import**

## Step 3: Select the environment

1. In the top-right corner of Postman, open the environment dropdown
2. Select **Twind API**

## Step 4: Set your API key

1. Click the **Twind API** environment name to open it
2. In the `apiKey` row, enter your API key in the **Current value** column
3. Click **Save**

Your API key is now set for all requests in the collection.

## Step 5: Send a request

Open the **Shared** folder in the collection and run **Get current user information** to verify your API key is working:

```
GET {{baseUrl}}/v1/users/me
```

A `200` response with your user details confirms everything is set up correctly.

## Next Steps

- Explore the [API Reference](../index.html) for all available endpoints
- See the [Get API Key](get-api-token.md) guide if you need to create or manage your API keys

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
