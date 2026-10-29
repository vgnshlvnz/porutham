export const openApi = {
  openapi: "3.0.3",
  info: {
    title: "Vinmeen API",
    version: "1.0.0",
    description:
      "Horoscope porutham for Tamil families. Compute a Lahiri sidereal Moon nakshatra, or match a pair under a named tradition. Third-party apps send X-Api-Key or Authorization: Bearer, issued by POST /api/v1/keys. The Vinmeen site on this host, and origins listed in FIRST_PARTY_ORIGINS, call the API without a key; those requests are limited per IP. A local development key, vnm_dev_local_key, exists only when ENVIRONMENT is not production.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Reference" },
    { name: "Calculation" },
    { name: "Account" },
  ],
  components: {
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "X-Api-Key" },
      bearer: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ apiKey: [] }, { bearer: [] }],
  paths: {
    "/api/v1/health": {
      get: { tags: ["Account"], security: [], summary: "Liveness", responses: { "200": { description: "OK" } } },
    },
    "/api/v1/keys": {
      post: {
        tags: ["Account"],
        security: [],
        summary: "Issue an API key. The token is returned once.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["name", "email"], properties: { name: { type: "string" }, email: { type: "string" } } } } },
        },
        responses: { "201": { description: "Key issued" }, "400": { description: "Validation error" }, "429": { description: "Too many keys from this address" } },
      },
    },
    "/api/v1/traditions": {
      get: { tags: ["Reference"], summary: "Supported matching traditions", parameters: [{ $ref: "#/components/parameters/lang" }], responses: { "200": { description: "Traditions" } } },
    },
    "/api/v1/nakshatras": {
      get: { tags: ["Reference"], summary: "27 nakshatras", parameters: [{ $ref: "#/components/parameters/lang" }], responses: { "200": { description: "Nakshatras" } } },
    },
    "/api/v1/rasis": {
      get: { tags: ["Reference"], summary: "12 rasis", parameters: [{ $ref: "#/components/parameters/lang" }], responses: { "200": { description: "Rasis" } } },
    },
    "/api/v1/kovils": {
      get: { tags: ["Reference"], summary: "Nine Nagarathar kovils", parameters: [{ $ref: "#/components/parameters/lang" }], responses: { "200": { description: "Kovils" } } },
    },
    "/api/v1/poruthams": {
      get: {
        tags: ["Reference"],
        summary: "Porutham or koota definitions for a tradition",
        parameters: [{ $ref: "#/components/parameters/lang" }, { name: "tradition", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Definitions" } },
      },
    },
    "/api/v1/places": {
      get: {
        tags: ["Reference"],
        summary: "Search places worldwide",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Places with latitude, longitude, and IANA timezone" } },
      },
    },
    "/api/v1/nakshatra": {
      post: {
        tags: ["Calculation"],
        summary: "Sidereal Moon nakshatra, pada, and rasi from birth details",
        parameters: [{ $ref: "#/components/parameters/lang" }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Birth" } } } },
        responses: { "200": { description: "Placement" }, "400": { description: "Validation error" } },
      },
    },
    "/api/v1/match": {
      post: {
        tags: ["Calculation"],
        summary: "Match a pair. Each person may send a star or birth details.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tradition", "bride", "groom"],
                properties: {
                  tradition: { type: "string", example: "tamil-nadu" },
                  lang: { type: "string", enum: ["en", "ta"] },
                  asOf: { type: "string", format: "date", description: "Reference date for dasa sandhi. Defaults to today." },
                  bride: { $ref: "#/components/schemas/Person" },
                  groom: { $ref: "#/components/schemas/Person" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Match report" }, "400": { description: "Validation error" } },
      },
    },
  },
  components_extra_note: "parameters and schemas are merged below",
} as const;

export function openApiDocument() {
  return {
    openapi: openApi.openapi,
    info: openApi.info,
    servers: openApi.servers,
    tags: openApi.tags,
    security: openApi.security,
    paths: openApi.paths,
    components: {
      securitySchemes: openApi.components.securitySchemes,
      parameters: {
        lang: { name: "lang", in: "query", schema: { type: "string", enum: ["en", "ta"], default: "en" } },
      },
      schemas: {
        Birth: {
          type: "object",
          required: ["date", "time", "latitude", "longitude", "timezone"],
          properties: {
            date: { type: "string", example: "1990-08-15" },
            time: { type: "string", example: "10:30" },
            latitude: { type: "number", example: 13.0827 },
            longitude: { type: "number", example: 80.2707 },
            timezone: { type: "string", example: "Asia/Kolkata" },
            placeName: { type: "string" },
          },
        },
        Person: {
          type: "object",
          properties: {
            name: { type: "string" },
            nakshatraId: { type: "string", example: "rohini" },
            pada: { type: "integer", minimum: 1, maximum: 4 },
            rasiId: { type: "string", example: "rishabha" },
            birth: { $ref: "#/components/schemas/Birth" },
            gothra: { type: "string" },
            kovil: { type: "string" },
          },
        },
      },
    },
  };
}
