export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://1klcjc8um5aq.flarial.xyz',
  ENDPOINTS: {
    SCRIPTS: {
      LIST: '/api/scripts',
      DOWNLOAD: (scriptId: string) => `/api/scripts/${scriptId}/download`,
    },
    CONFIGS: {  // Added Configs patch (im a dumb fuck fr)
      LIST: '/api/configs',
      DOWNLOAD: (configId: string) => `/api/configs/${configId}/download`,
    },
  },
};
