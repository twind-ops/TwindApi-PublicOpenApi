# Twind Access Control API - Public Documentation

![API Documentation](https://img.shields.io/badge/API-Documentation-blue?style=flat-square&logo=swagger)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=flat-square&logo=github)
![Scalar](https://img.shields.io/badge/Powered%20by-Scalar-purple?style=flat-square)

Public documentation for the Twind Access Control API. This repository contains the OpenAPI specification and supplementary guides for developers integrating with the Twind platform.

## About This Project

This repository serves as the public-facing documentation for the Twind Access Control API. It includes:

- **OpenAPI Specification**: Machine-readable API definition in YAML format
- **Interactive API Reference**: Powered by Scalar for exploring endpoints
- **Developer Guides**: Step-by-step tutorials for common integration flows

---

## Important Notice

> **DO NOT MODIFY `openapi-access-control-api.yaml` MANUALLY**
>
> The OpenAPI specification is generated automatically from [TwindApi](https://github.com/twind-ops/TwindApi). Any manual changes will be overwritten on the next deployment.

---

## Live Documentation

The documentation is published via GitHub Pages:

**[https://twind-ops.github.io/TwindApi-PublicOpenApi/](https://twind-ops.github.io/TwindApi-PublicOpenApi/)**

---

## Local Development

To preview the documentation locally, use a static file server:

```bash
npx serve .
```

Then open http://localhost:3000 in your browser.

> **Note:** Do NOT use `npx @scalar/cli document serve` as it won't include the custom navigation sidebar and guides.

---

## About Scalar

This project uses [Scalar](https://scalar.com) (free tier) to render the interactive API reference.

Scalar is an open-source tool that transforms OpenAPI documents into beautiful, interactive API documentation. It provides:

- Interactive endpoint explorer with "Try it" functionality
- Multiple code snippet examples (curl, JavaScript, Python, etc.)
- Dark/light theme support
- Search functionality

**Resources:**
- [Scalar Documentation](https://guides.scalar.com)
- [Scalar GitHub](https://github.com/scalar/scalar)
- [Scalar API Reference Configuration](https://guides.scalar.com/products/api-references/configuration)

---

## Creating New Guides

Guides are markdown files that provide step-by-step tutorials for common integration scenarios.

### Step 1: Create the Markdown File

Create a new `.md` file in the `/guides` folder:

```
guides/
├── get-api-token.md      # Existing guide
├── your-new-guide.md     # Your new guide
├── index.html
└── styles.css
```

Use this template for your guide:

```markdown
# Guide Title

Brief description of what this guide covers.

## Prerequisites

- Requirement 1
- Requirement 2

## Step 1: First Step

Description and code examples...

```bash
# Example code
curl -X GET "https://api.example.com/endpoint"

## Next Steps

- Link to related guides
- Link to API reference

---

*Need help? Contact support@twind.com*
```

### Step 2: Update the Guides Index

Edit `/guides/index.html` and add your guide to the `guides` array:

```javascript
const guides = [
  {
    file: "get-api-token.md",
    title: "Get API Key",
    description: "Learn how to obtain and configure your API key.",
    icon: `<svg>...</svg>`,
  },
  // Add your new guide here:
  {
    file: "your-new-guide.md",
    title: "Your Guide Title",
    description: "Brief description of your guide.",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>`,
  },
];
```

### Assets and Images

If your guide includes images:

1. Create an `/guides/assets` folder (if it doesn't exist)
2. Place images there following the naming convention: `[md-filename]_[image-name].png`
3. Reference them in your markdown

**Naming Convention:**

```
[md-filename]_[image-name].extension
```

For example, if your guide is `get-api-token.md` and you have an image showing the API section:

```
get-api-token_api-section.png
```

**Reference in Markdown:**

```markdown
![API Section](/guides/assets/get-api-token_api-section.png)
```

---

## Project Structure

```
TwindApi-PublicOpenApi/
├── index.html                      # Main documentation page
├── styles.css                      # Main page styles
├── openapi-access-control-api.yaml # OpenAPI spec (auto-generated)
├── README.md                       # This file
└── guides/
    ├── index.html                  # Guides listing page
    ├── styles.css                  # Guides page styles
    └── get-api-token.md            # Example guide
```

---

## License

This documentation is proprietary to Twind. The OpenAPI specification and guides are provided for integration purposes only.
