/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SOURCE?: 'mock' | 'http'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MOCK_LATENCY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
