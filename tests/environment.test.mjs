import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadEnv, resolveConfig } from 'vite';
import { compile, moduleUrl } from './loadTypeScript.mjs';

const { resolveBuildEnvironment } = await import(moduleUrl(compile('../build/environment.ts')));

test('production env loads /api and the explicit public viewer origin, never the dev target', () => {
  const env = loadEnv('production', process.cwd(), 'VITE_');
  const config = resolveBuildEnvironment('build', 'production', env);
  assert.equal(config.apiBaseUrl, '/api');
  assert.equal(config.devApiTarget, undefined);
  // QA may explicitly override the origin, but the checked-in public defaults stay reviewable.
  assert.match(readFileSync(new URL('../.env.production', import.meta.url), 'utf8'), /^VITE_PAYMENT_ALLOWED_ORIGINS=https:\/\/aydibro\.click$/m);
  assert.ok(!readFileSync(new URL('../.env.production', import.meta.url), 'utf8').includes('VITE_DEV_API_TARGET='));
});

test('dev retains its local proxy without leaking it into production or preview', () => {
  const env = { VITE_API_BASE_URL: '/api', VITE_DEV_API_TARGET: 'http://127.0.0.1:4192' };
  assert.equal(resolveBuildEnvironment('serve', 'development', env).devApiTarget, env.VITE_DEV_API_TARGET);
  assert.equal(resolveBuildEnvironment('build', 'production', env).devApiTarget, undefined);
  assert.equal(resolveBuildEnvironment('serve', 'production', env).devApiTarget, undefined);
});

test('release build rejects localhost, private origin, empty and malformed API overrides', () => {
  for (const base of ['http://localhost:8080/api', 'http://127.0.0.1:8080', 'https://shop.aydibro.click/api', '//evil.test/api', '', '/api/', '/api?token=secret']) {
    assert.throws(() => resolveBuildEnvironment('build', 'production', { VITE_API_BASE_URL: base }), /must be \/api/);
  }
});

test('release build refuses non-production mode instead of silently bundling dev configuration', () => {
  for (const mode of ['development', 'test', 'staging'])
    assert.throws(() => resolveBuildEnvironment('build', mode, {}), /require --mode production/);
});

test('production payment configuration accepts an empty allowlist or exact HTTPS origins only', () => {
  for (const origins of ['', 'https://aydibro.click', 'https://aydibro.click,https://api.example.test:443'])
    assert.equal(resolveBuildEnvironment('build', 'production', { VITE_PAYMENT_ALLOWED_ORIGINS: origins }).paymentAllowedOrigins, origins);
  for (const origins of ['http://aydibro.click', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', '*', 'https://*.example.test', 'https://user:password@example.test', 'https://aydibro.click:444', 'https://aydibro.click/api', 'https://aydibro.click?', 'https://aydibro.click#', 'https://aydibro.click,'])
    assert.throws(() => resolveBuildEnvironment('build', 'production', { VITE_PAYMENT_ALLOWED_ORIGINS: origins }), /explicit HTTPS domain origins/);
});

test('invalid env errors do not disclose credential-bearing values', () => {
  for (const key of ['VITE_API_BASE_URL', 'VITE_PAYMENT_ALLOWED_ORIGINS']) {
    assert.throws(() => resolveBuildEnvironment('build', 'production', { [key]: 'https://user:super-secret@example.test/api' }), (error) => !error.message.includes('super-secret'));
  }
});

test('real Vite production config has no proxy and uses the same-origin API', async () => {
  const config = await resolveConfig({ configFile: 'vite.config.ts' }, 'build', 'production');
  assert.equal(config.env.VITE_API_BASE_URL, '/api');
  assert.equal(config.server.proxy, undefined);
  assert.equal(config.build.sourcemap, false);
});

test('real Vite build fails before writing dist when process env overrides API with localhost', () => {
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.ts'], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, VITE_API_BASE_URL: 'http://localhost:8080/api' },
    timeout: 15000,
  });
  assert.ok(result.status !== 0 && result.status !== null);
  assert.match(result.stderr, /Production VITE_API_BASE_URL must be \/api/);
});
