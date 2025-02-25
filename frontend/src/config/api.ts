export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://node2.sear.host:5019',
  ENDPOINTS: {
    SCRIPTS: {
      LIST: '/api/scripts',
      DOWNLOAD: (scriptId: string) => `/api/scripts/${scriptId}/download`,
    },
  },
};