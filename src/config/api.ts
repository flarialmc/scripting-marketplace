export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
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
