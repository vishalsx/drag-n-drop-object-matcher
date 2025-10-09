
interface ImportMetaEnv {
    readonly VITE_FASTAPI_BASE_URL: string;
    readonly VITE_TTS_SERVICE_URL: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  