/**
 * Guides configuration data
 * This file is shared between index.html (navbar) and guides/index.html (cards)
 */
const GUIDES_DATA = [
  {
    id: "get-api-token",
    file: "get-api-token.md",
    title: "Get API Key",
    description: "Learn how to obtain and configure your API key for authentication.",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
    </svg>`,
  },
  // Add more guides here following the same structure:
  // {
  //   id: "unique-id",
  //   file: "filename.md",
  //   title: "Guide Title",
  //   description: "Brief description of the guide.",
  //   icon: `<svg>...</svg>`,
  // },
];
