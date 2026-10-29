/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API origin, or empty for same-origin `/api/v1`. No trailing slash required. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
