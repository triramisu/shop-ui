type PublicEnvironment = Record<string, string | undefined>;

/** Build-time validation only; never import this module into the storefront. */
export function resolveBuildEnvironment(command: string, mode: string, env: PublicEnvironment) {
  if (command === 'build' && mode !== 'production') {
    throw new Error('Release builds require --mode production. Use npm run dev for local development.');
  }
  const apiBaseUrl = env.VITE_API_BASE_URL ?? '/api';
  const paymentAllowedOrigins = env.VITE_PAYMENT_ALLOWED_ORIGINS ?? '';
  if (mode === 'production') {
    if (apiBaseUrl !== '/api') {
      // Do not echo an invalid value: a misconfigured URL could contain credentials.
      throw new Error('Production VITE_API_BASE_URL must be /api (same-origin CloudFront), not localhost or an absolute URL.');
    }
    for (const entry of paymentAllowedOrigins ? paymentAllowedOrigins.split(',') : []) {
      let valid = false;
      try {
        const url = new URL(entry.trim());
        valid = url.protocol === 'https:' && !url.port && !url.username && !url.password &&
          url.pathname === '/' && !/[?#*]/.test(entry) &&
          !url.hostname.includes(':') && !/^[\d.]+$/.test(url.hostname) &&
          url.hostname !== 'localhost' && !url.hostname.endsWith('.localhost') && url.hostname.includes('.');
      } catch { /* Report only the variable name, never the supplied URL. */ }
      if (!valid) throw new Error('Production VITE_PAYMENT_ALLOWED_ORIGINS must contain only explicit HTTPS domain origins (or be empty).');
    }
  }
  return {
    apiBaseUrl,
    paymentAllowedOrigins,
    devApiTarget: command === 'serve' && mode === 'development'
      ? env.VITE_DEV_API_TARGET ?? 'http://localhost:8080'
      : undefined,
  };
}
