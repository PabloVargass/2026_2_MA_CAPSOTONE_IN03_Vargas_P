type CorsCallback = (error: Error | null, allow?: boolean) => void;

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// CORS_ORIGINS: lista separada por comas de orígenes web permitidos (por ejemplo, la web de administración).
// Sin lista, en desarrollo se aceptan solo orígenes locales y en producción ningún navegador.
export function corsOrigin(env: Record<string, string | undefined>) {
  const allowed = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const development = env.NODE_ENV !== 'production';
  return (origin: string | undefined, callback: CorsCallback) => {
    if (!origin) return callback(null, true);
    const ok =
      allowed.includes(origin) ||
      (allowed.length === 0 && development && LOCALHOST.test(origin));
    callback(null, ok);
  };
}
