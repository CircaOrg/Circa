export const SOCKET_SERVER_URL = 'http://localhost:3001';

export const IS_STATIC_DEPLOYMENT =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
