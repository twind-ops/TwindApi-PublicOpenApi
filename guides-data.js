/**
 * Guides configuration data
 * This file is shared between index.html (navbar) and guides/index.html (cards)
 *
 * Structure:
 * - Top-level entries are guide cards.
 * - Entries with type "group" are collapsible role sections (Client / Contractor).
 *   Each group contains a "products" list with one collapsible section per API
 *   product that has endpoints for that role. Products with no endpoints for the
 *   role are intentionally omitted.
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
    type: "group",
    title: "Client Guides",
    icon: "assets/icon-client.svg",
    products: [
      {
        id: "client-requirements",
        title: "Requirements",
        items: [
          {
            id: "client-requirements-configure",
            file: "client-requirements-configure.md",
            title: "Configure the Requirements You Demand from Contractors",
            description: "Create and maintain the requirement configurations that generate compliance obligations for your contractors.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "requirement-upload-api",
            file: "requirement-upload-api.md",
            title: "Upload a Requirement Template",
            description: "Upload a template file to object storage and attach it to a requirement via templateFile.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "client-requirements-review-evidences",
            file: "client-requirements-review-evidences.md",
            title: "Review and Approve Evidences",
            description: "Find the evidences waiting for review, inspect them, and approve or reject with actionable feedback.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "client-requirements-monitor-compliance",
            file: "client-requirements-monitor-compliance.md",
            title: "Monitor Contractor Compliance",
            description: "Track which requirement instances are missing, expired or about to expire across your contractors.",
            icon: "assets/icon-requirements.svg",
          },
        ],
      },
      {
        id: "client-companies-and-contracts",
        title: "Companies and contracts",
        items: [
          {
            id: "client-contracts-create",
            file: "client-contracts-create.md",
            title: "Create a Contract with a Contractor",
            description: "Register a contractor company and create a contract defining its sites and activities.",
            icon: "assets/icon-contract.svg",
          },
          {
            id: "client-contracts-subcontracts",
            file: "client-contracts-subcontracts.md",
            title: "Review and Approve Subcontract Requests",
            description: "List pending subcontract requests, approve or reject them, and audit the subcontracts at each site.",
            icon: "assets/icon-contract.svg",
          },
          {
            id: "client-contracts-assigned-resources",
            file: "client-contracts-assigned-resources.md",
            title: "See Assigned Resources and Their Risks",
            description: "See which resources are deployed on your contracts, per site, and the risks assigned to each one.",
            icon: "assets/icon-contract.svg",
          },
        ],
      },
      {
        id: "client-visits",
        title: "Visits",
        items: [
          {
            id: "visits-documentation-upload-api",
            file: "visits-documentation-upload-api.md",
            title: "Upload Visitor Documentation",
            description: "Attach documentation files to a visitor profile and link them to visit entries.",
            icon: "assets/icon-visitor.svg",
          },
        ],
      },
    ],
  },
  {
    type: "group",
    title: "Contractor Guides",
    icon: "assets/icon-contractor.svg",
    products: [
      {
        id: "contractor-resources",
        title: "Resources",
        items: [
          {
            id: "contractor-resources-employees",
            file: "contractor-resources-employees.md",
            title: "Register and Maintain Your Employees",
            description: "Create employee records with the right client classifications, and keep them up to date.",
            icon: "assets/icon-resource.svg",
          },
          {
            id: "contractor-resources-vehicles",
            file: "contractor-resources-vehicles.md",
            title: "Register and Maintain Your Vehicles",
            description: "Create vehicle records with their standard type and client classifications, and keep them up to date.",
            icon: "assets/icon-resource.svg",
          },
          {
            id: "contractor-resources-equipment",
            file: "contractor-resources-equipment.md",
            title: "Register and Maintain Your Equipment",
            description: "Create equipment records with their standard type and client classifications, and keep them up to date.",
            icon: "assets/icon-resource.svg",
          },
          {
            id: "contractor-contracts-assign-resources",
            file: "contractor-contracts-assign-resources.md",
            title: "Assign Resources to a Contract Site",
            description: "Assign your employees, vehicles and equipment to a contract site, with the right risks for each one.",
            icon: "assets/icon-resource.svg",
          },
        ],
      },
      {
        id: "contractor-requirements",
        title: "Requirements",
        items: [
          {
            id: "contractor-requirements-track-instances",
            file: "contractor-requirements-track-instances.md",
            title: "Track Your Pending Requirements",
            description: "See which requirement instances are pending or rejected, their deadlines, and what each client asks for.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "contractor-requirements-submit-agreement",
            file: "contractor-requirements-submit-agreement.md",
            title: "Submit an Agreement for a Requirement",
            description: "Accept an agreement-type requirement — no file needed.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "contractor-requirements-upload-documents",
            file: "contractor-requirements-upload-documents.md",
            title: "Upload Documents for a Requirement",
            description: "Full upload flow for document-type requirements: presigned URL, S3 upload, multi-file registration and supported file types.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "contractor-requirements-track-submission-status",
            file: "contractor-requirements-track-submission-status.md",
            title: "Track Submission Status and Review Outcome",
            description: "Check whether a submission was approved or rejected, read the reviewer's feedback, and request express review.",
            icon: "assets/icon-requirements.svg",
          },
          {
            id: "contractor-requirements-track-evidences",
            file: "contractor-requirements-track-evidences.md",
            title: "Single Submission: Reuse Evidence Across Requirements",
            description: "Submit a document to the original instance, retrieve matching instances, and propagate it in one flow.",
            icon: "assets/icon-requirements.svg",
          },
        ],
      },
      {
        id: "contractor-companies-and-contracts",
        title: "Companies and contracts",
        items: [
          {
            id: "contractor-contracts-view",
            file: "contractor-contracts-view.md",
            title: "View Your Contracts and Clients",
            description: "List your client companies and active contracts, and drill into the sites and activities of each one.",
            icon: "assets/icon-contract.svg",
          },
          {
            id: "contractor-contracts-request-subcontract",
            file: "contractor-contracts-request-subcontract.md",
            title: "Request to Subcontract Part of the Work",
            description: "Submit a subcontract request for a site and its activities, and track its approval by the client.",
            icon: "assets/icon-contract.svg",
          },
        ],
      },
    ],
  },
];
