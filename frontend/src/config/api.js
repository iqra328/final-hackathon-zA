const configuredApiUrl = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5001');

export const API_URL = /\/api\/?$/i.test(configuredApiUrl)
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`;

export const SOCKET_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/\/api\/?$/i, '');