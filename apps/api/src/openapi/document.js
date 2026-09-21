import { UPLOAD_STATUSES } from "@openspace/shared";

const errorResponse = {
  description: "The request could not be completed.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

const uploadResponse = {
  description: "Upload record.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Upload" },
    },
  },
};

export const OPENAPI_DOCUMENT = {
  openapi: "3.0.3",
  info: {
    title: "PSB OpenSpace Capture Dashboard API",
    version: "0.2.0",
    description: [
      "Interactive documentation for the PSB-owned Node.js backend.",
      "Frontend developers should call these endpoints through `apps/web/src/services`.",
      "OpenSpace private endpoints and credentials are intentionally excluded.",
    ].join("\n\n"),
  },
  servers: [{ url: "http://localhost:8787", description: "Local Node.js backend" }],
  tags: [
    { name: "System", description: "Backend health and safe frontend configuration." },
    { name: "Projects", description: "PSB-maintained project and floor catalogue." },
    { name: "Dashboard", description: "Upload totals and recent activity." },
    { name: "Uploads", description: "INSV intake, history, status, retry and cancellation." },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Check backend health",
        operationId: "getHealth",
        responses: {
          200: {
            description: "Backend is running.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } },
          },
        },
      },
    },
    "/api/config": {
      get: {
        tags: ["System"],
        summary: "Get browser-safe configuration",
        description: "Returns only non-secret settings. It never returns OpenSpace credentials.",
        operationId: "getConfig",
        responses: {
          200: {
            description: "Safe runtime settings.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Config" } } },
          },
        },
      },
    },
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List approved projects and floors",
        description: "Populates the project and floor dropdowns from PSB's local SQLite catalogue.",
        operationId: "listProjects",
        responses: {
          200: {
            description: "Active projects with their configured sheets.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/Project" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Get upload totals and recent uploads",
        operationId: "getDashboardSummary",
        responses: {
          200: {
            description: "Dashboard metrics and five newest local upload records.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/DashboardSummary" } },
            },
          },
        },
      },
    },
    "/api/uploads": {
      get: {
        tags: ["Uploads"],
        summary: "Search upload history",
        operationId: "listUploads",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" }, description: "Search capture, file, project or floor name." },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/UploadStatus" } },
          { name: "siteId", in: "query", schema: { type: "string" }, description: "Filter by local project/site ID." },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          200: {
            description: "Filtered, paginated upload records.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PaginatedUploads" } },
            },
          },
        },
      },
      post: {
        tags: ["Uploads"],
        summary: "Stage an INSV file and start its upload job",
        description: "Receives one local `.insv` file. Returns immediately with HTTP 202 while background work continues.",
        operationId: "createUpload",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["siteId", "sheetId", "captureName", "deviceId", "capturedAt", "file"],
                properties: {
                  siteId: { type: "string", description: "Selected project ID from GET /api/projects." },
                  sheetId: { type: "string", description: "Selected floor/sheet ID belonging to the project." },
                  captureName: { type: "string", maxLength: 120 },
                  deviceId: { type: "string", example: "Insta360 OneX5:sn:SERIAL_NUMBER" },
                  capturedAt: { type: "string", format: "date-time" },
                  file: { type: "string", format: "binary", description: "One `.insv` file." },
                },
              },
            },
          },
        },
        responses: {
          202: uploadResponse,
          400: errorResponse,
          500: errorResponse,
        },
      },
    },
    "/api/uploads/recent": {
      get: {
        tags: ["Uploads"],
        summary: "Get the newest uploads",
        operationId: "getRecentUploads",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 20, default: 5 } },
        ],
        responses: {
          200: {
            description: "Newest local upload records.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: { items: { type: "array", items: { $ref: "#/components/schemas/Upload" } } },
                },
              },
            },
          },
        },
      },
    },
    "/api/uploads/statuses/values": {
      get: {
        tags: ["Uploads"],
        summary: "List supported upload statuses",
        operationId: "listUploadStatuses",
        responses: {
          200: {
            description: "Values accepted by the history status filter.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: { items: { type: "array", items: { $ref: "#/components/schemas/UploadStatus" } } },
                },
              },
            },
          },
        },
      },
    },
    "/api/uploads/{id}": {
      get: {
        tags: ["Uploads"],
        summary: "Get the latest upload state",
        description: "The progress screen polls this endpoint. `uploadProgress` describes file transfer only, not OpenSpace processing percentage.",
        operationId: "getUpload",
        parameters: [{ $ref: "#/components/parameters/UploadId" }],
        responses: { 200: uploadResponse, 404: errorResponse },
      },
    },
    "/api/uploads/{id}/retry": {
      post: {
        tags: ["Uploads"],
        summary: "Retry a failed upload or processing-status check",
        description: "Re-uploads when the local file still exists; otherwise resumes status polling for an already submitted capture.",
        operationId: "retryUpload",
        parameters: [{ $ref: "#/components/parameters/UploadId" }],
        responses: { 202: uploadResponse, 409: errorResponse },
      },
    },
    "/api/uploads/{id}/cancel": {
      post: {
        tags: ["Uploads"],
        summary: "Cancel a staged or transferring upload",
        description: "OpenSpace processing cannot be cancelled after the complete file has been submitted.",
        operationId: "cancelUpload",
        parameters: [{ $ref: "#/components/parameters/UploadId" }],
        responses: { 200: uploadResponse, 409: errorResponse },
      },
    },
  },
  components: {
    parameters: {
      UploadId: {
        name: "id",
        in: "path",
        required: true,
        description: "Local UUID returned by POST /api/uploads.",
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {
      UploadStatus: { type: "string", enum: [...UPLOAD_STATUSES] },
      Error: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
          issues: { type: "array", items: { type: "object", additionalProperties: true } },
        },
      },
      Health: {
        type: "object",
        required: ["status", "mode", "timestamp"],
        properties: {
          status: { type: "string", example: "ok" },
          mode: { type: "string", enum: ["mock", "live"] },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      Config: {
        type: "object",
        required: ["openSpaceMode", "defaultDeviceId", "maximumUploadBytes"],
        properties: {
          openSpaceMode: { type: "string", enum: ["mock", "live"] },
          defaultDeviceId: { type: "string" },
          maximumUploadBytes: { type: "integer", format: "int64" },
        },
      },
      Sheet: {
        type: "object",
        required: ["sheetId", "siteId", "name", "defaultStartPosition"],
        properties: {
          sheetId: { type: "string" },
          siteId: { type: "string" },
          name: { type: "string" },
          createdDate: { type: "string", format: "date", nullable: true },
          imagePath: { type: "string", nullable: true },
          defaultStartPosition: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "number" },
            example: [0, 0, 1.5],
          },
        },
      },
      Project: {
        type: "object",
        required: ["siteId", "name", "status", "sheets", "canUpload"],
        properties: {
          siteId: { type: "string" },
          name: { type: "string" },
          address: { type: "string", nullable: true },
          status: { type: "string", enum: ["active", "inactive"] },
          createdDate: { type: "string", format: "date", nullable: true },
          sheets: { type: "array", items: { $ref: "#/components/schemas/Sheet" } },
          canUpload: { type: "boolean", description: "True when at least one floor is configured." },
        },
      },
      Upload: {
        type: "object",
        required: ["id", "siteId", "projectName", "sheetId", "floorName", "captureName", "deviceId", "fileName", "fileSize", "capturedAt", "startPosition", "status", "uploadProgress", "bytesSent", "retryCount", "pendingSeen", "localFileDeleted", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          captureId: { type: "string", nullable: true, description: "Server-side OpenSpace workflow identifier." },
          openSpaceUploadId: { type: "string", nullable: true, description: "Server-side OpenSpace upload identifier." },
          siteId: { type: "string" },
          projectName: { type: "string" },
          sheetId: { type: "string" },
          floorName: { type: "string" },
          captureName: { type: "string" },
          deviceId: { type: "string" },
          fileName: { type: "string" },
          fileSize: { type: "integer", format: "int64" },
          capturedAt: { type: "string", format: "date-time" },
          startMicro: { type: "integer", format: "int64" },
          startPosition: { type: "array", minItems: 3, maxItems: 3, items: { type: "number" } },
          status: { $ref: "#/components/schemas/UploadStatus" },
          uploadProgress: { type: "integer", minimum: 0, maximum: 100, description: "Backend-to-OpenSpace file-transfer percentage." },
          bytesSent: { type: "integer", format: "int64" },
          retryCount: { type: "integer", minimum: 0 },
          errorMessage: { type: "string", nullable: true },
          viewerUrl: { type: "string", format: "uri", nullable: true, description: "Singapore OpenSpace login URL, not a capture-specific viewer link." },
          pendingSeen: { type: "boolean", description: "Whether this capture has been observed in pendingCaptures." },
          localFileDeleted: { type: "boolean" },
          uploadStartedAt: { type: "string", format: "date-time", nullable: true },
          submittedAt: { type: "string", format: "date-time", nullable: true },
          processingCompletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PaginatedUploads: {
        type: "object",
        required: ["items", "page", "pageSize", "total"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Upload" } },
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1 },
          total: { type: "integer", minimum: 0 },
        },
      },
      DashboardSummary: {
        type: "object",
        required: ["totalUploads", "inProgress", "completed", "failed", "recentUploads"],
        properties: {
          totalUploads: { type: "integer", minimum: 0 },
          inProgress: { type: "integer", minimum: 0 },
          completed: { type: "integer", minimum: 0 },
          failed: { type: "integer", minimum: 0 },
          recentUploads: { type: "array", maxItems: 5, items: { $ref: "#/components/schemas/Upload" } },
        },
      },
    },
  },
};
