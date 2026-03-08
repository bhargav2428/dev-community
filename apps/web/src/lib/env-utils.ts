const sanitizeEnvValue = (value?: string) => {
  if (!value) return '';

  return value
    .replace(/[\r\n]/g, '')
    .trim()
    .replace(/^[\s"'`\\]+/, '')
    .replace(/[\s"'`\\]+$/, '');
};

export const getPublicApiUrl = () =>
  sanitizeEnvValue(process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000/api/v1';

export const getPublicWsUrl = () => {
  const wsUrl = sanitizeEnvValue(process.env.NEXT_PUBLIC_WS_URL);
  if (wsUrl) return wsUrl;

  return getPublicApiUrl().replace(/\/api\/v1\/?$/, '');
};

