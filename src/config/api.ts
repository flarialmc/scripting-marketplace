// Base URL for API calls - uses marketplace's own API routes
const getBaseUrl = () => {
  // Client-side: use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side: use internal localhost (same container)
  return 'http://localhost:5020';
};

export const API_CONFIG = {
  get BASE_URL() {
    return getBaseUrl();
  },
  ENDPOINTS: {
    SCRIPTS: {
      LIST: '/api/scripts',
      DOWNLOAD: (scriptId: string) => `/api/scripts/${scriptId}/download`,
    },
    CONFIGS: { 
      LIST: '/api/configs',
      DOWNLOAD: (configId: string) => `/api/configs/${configId}/download`,
    },
  },
};
