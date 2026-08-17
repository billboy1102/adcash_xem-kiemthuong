/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MONLIX_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
