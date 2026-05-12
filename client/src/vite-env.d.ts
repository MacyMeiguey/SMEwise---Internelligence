/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Base URL for backend API calls. Leave empty to use relative URLs
     * (recommended when the API is fronted by the same CloudFront distribution
     * as the static site, or when Vite's dev proxy is handling /api/*).
     */
    readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
