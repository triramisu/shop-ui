/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEV_API_TARGET?: string;
  readonly VITE_PAYMENT_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
