import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { compile, loadClient, moduleUrl } from './loadTypeScript.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
});

test('login identifies a WAF Challenge without replaying the POST', async () => {
  const { clientUrl } = await loadClient();
  const { authApi } = await import(moduleUrl(compile('../src/api/auth.ts')
    .replace('@/lib/apiClient', clientUrl)));
  const calls = [];
  globalThis.fetch = async (url, request) => {
    calls.push([url, request.method]);
    return new Response('', { status: 202, headers: { 'x-amzn-waf-action': 'challenge' } });
  };
  await assert.rejects(authApi.login({ username: 'fixture', password: 'fixture' }),
    { status: 202, wafChallenge: true });
  assert.deepEqual(calls, [['/api/auth/token', 'POST']]);
});
