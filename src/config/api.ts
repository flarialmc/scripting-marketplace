// Server-side URL (internal Docker network) vs Client-side URL (public)
const getBaseUrl = () => {
  // Client-side: use public API URL
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || window.location.origin;
  }
  // Server-side: use internal Docker URL if available, fall back to public URL
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
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
