# Using Postman with the Twind API

This guide explains how to import the Twind API into Postman using the pre-built collection and environment files.

## Prerequisites

- [Postman](https://www.postman.com/downloads/) installed
- A Twind API key (see the [Get API Key](get-api-token.md) guide)

## Step 1: Import the files into Postman

1. Open Postman
2. Click **Import** (top left)
3. Select the **Link** tab and paste each URL below, one at a time:

| File | Import URL |
|------|------------|
| Collection | [https://api-doc.twind.io/twind-postman-collection.json](https://api-doc.twind.io/twind-postman-collection.json) |
| Environment | [https://api-doc.twind.io/twind-postman-environment.json](https://api-doc.twind.io/twind-postman-environment.json) |

4. Click **Import** after each URL

Alternatively, click each link to open the file in your browser, then save it and import via **Import → File**.

## Step 2: Select the environment

1. In the top-right corner of Postman, open the environment dropdown
2. Select **Twind API**

## Step 3: Set your credentials

1. Click the **Twind API** environment name to open it
2. In the `apiKey` row, enter your API key in the **Current value** column
3. In the `companyId` row, enter your company ID
4. Click **Save**

Your credentials are now set for all requests in the collection.

## Step 4: Send a request

Open the **Shared** folder in the collection and run **Get current user information** to verify your API key is working:

```
GET {{baseUrl}}/v1/users/me
```

A `200` response with your user details confirms everything is set up correctly.

## Next Steps

- Explore the [API Reference](../index.html) for all available endpoints
- See the [Get API Key](get-api-token.md) guide if you need to create or manage your API keys

## Using a different API client

If you use Insomnia, Bruno, or another OpenAPI-compatible tool, you can import the spec directly — these tools organise requests by tag automatically, so no pre-built collection is needed.

Import via URL directly from [api-doc.twind.io](https://api-doc.twind.io/openapi-public-api.yaml), or use the **Download** button in the [API Reference](../index.html) to save the file and import it from disk.

---

*Need help? Contact [support@twind.com](mailto:support@twind.com) for assistance.*
