
interface ImportMetaEnv {
  readonly VITE_FASTAPI_BASE_URL: string;
  readonly VITE_TTS_SERVICE_URL: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
