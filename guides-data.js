/**
 * Guides configuration data
 * This file is shared between index.html (navbar) and guides/index.html (cards)
 */
const GUIDES_DATA = [
  {
    id: "postman-setup",
    file: "postman-setup.md",
    title: "Postman Setup",
    description: "Import the pre-built Postman collection and environment to start making API requests in minutes.",
    icon: "assets/icon-postman.svg",
  },
  {
    id: "get-api-token",
    file: "get-api-token.md",
    title: "Get API Key",
    description: "Learn how to obtain and configure your API key for authentication.",
    icon: "assets/icon-key.svg",
  },
  {
    id: "visits-documentation-upload-api",
    file: "visits-documentation-upload-api.md",
    title: "Visits Documentation Upload API",
    description: "Learn how to upload visits documentation using the Twind API.",
    icon: "assets/icon-visitor.svg",
  },
  {
    id: "evidence-upload-api",
    file: "evidence-upload-api.md",
    title: "Document Upload API",
    description: "Learn how to upload documents as evidence using the Twind API.",
    icon: "assets/icon-file-upload.svg",
  },
  {
    id: "requirement-upload-api",
    file: "requirement-upload-api.md",
    title: "Requirement Template Upload API",
    description:
      "Learn how to upload a requirement template file using the Twind API.",
    icon: "assets/icon-file-upload.svg",
  },
  {
    id: "assigned-resources-api",
    file: "assigned-resources-api.md",
    title: "Resources API — Assigned resources",
    description:
      "List resources assigned to active contracts with engagement context (contract, site, activity, assigned risks) from the client or contractor side.",
    icon: "assets/icon-file-upload.svg",
  },
];
