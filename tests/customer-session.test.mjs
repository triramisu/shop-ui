import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { compile, loadClient, moduleUrl } from './loadTypeScript.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
});
const response = (result, status = 200) =>
  new Response(JSON.stringify({ code: status === 200 ? 1000 : 1006, result }), {
    status,
  });
const auth = (name, expired = false) => ({
  authenticated: true,
  accessToken: `${name}-access`,
  refreshToken: `${name}-refresh`,
  accessTokenExpiresAt: new Date(
    expired ? 0 : Date.now() + 3_600_000,
  ).toISOString(),
  refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
});
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('late refresh cannot resurrect a logged-out session', async () => {
  const { session, client } = await loadClient();
  session.setSession(auth('A', true));
  const gate = deferred();
  globalThis.fetch = () => gate.promise;
  const request = client.api.get('/orders');
  session.clearSession();
  gate.resolve(response(auth('A-rotated')));
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(session.getSession(), null);
});

test('failed refresh from A cannot clear the new B session', async () => {
  const { session, client } = await loadClient();
  session.setSession(auth('A', true));
  const gate = deferred();
  globalThis.fetch = () => gate.promise;
  const request = client.api.get('/orders');
  session.setSession(auth('B'));
  gate.resolve(response(null, 401));
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(session.getSession().refreshToken, 'B-refresh');
});

test('a successful response for A is discarded after signing in as B', async () => {
  const { session, client } = await loadClient();
  session.setSession(auth('A'));
  const gate = deferred();
  globalThis.fetch = () => gate.promise;
  const request = client.api.get('/orders');
  session.setSession(auth('B'));
  gate.resolve(response([{ id: 'private-A-order' }]));
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(session.getSession().accessToken, 'B-access');
});

test('same-account refresh remains single-flight and does not cancel valid requests', async () => {
  const { session, client } = await loadClient();
  session.setSession(auth('A', true));
  const revision = session.getSessionRevision();
  let refreshCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url === '/api/auth/refresh') {
      refreshCalls += 1;
      return response(auth('A-rotated'));
    }
    assert.equal(options.headers.Authorization, 'Bearer A-rotated-access');
    return response({ id: 'A-order' });
  };
  const result = await Promise.all([
    client.api.get('/orders'),
    client.api.get('/orders/id'),
  ]);
  assert.deepEqual(result, [{ id: 'A-order' }, { id: 'A-order' }]);
  assert.equal(refreshCalls, 1);
  assert.equal(session.getSessionRevision(), revision);
});

test('aborted order query never starts an authenticated request', async () => {
  const { session, client } = await loadClient();
  session.setSession(auth('A'));
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = () => assert.fail('aborted request reached network');
  await assert.rejects(
    client.api.get('/orders', { signal: controller.signal }),
    { name: 'AbortError' },
  );
});

test('private cache is canceled and removed while public catalog remains', async () => {
  const { clearCustomerQueries } = await import(
    moduleUrl(compile('../src/lib/customerCache.ts'))
  );
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(['products'], ['public-product']);
  for (const key of ['orders', 'cart', 'quote'])
    cache.setQueryData([key, 'A'], { owner: 'A' });
  let aborted = false;
  const gate = deferred();
  const pending = cache
    .fetchQuery({
      queryKey: ['orders', 'A', 'pending'],
      queryFn: ({ signal }) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        return gate.promise;
      },
    })
    .catch((error) => error);
  clearCustomerQueries(cache);
  gate.resolve({ owner: 'A' });
  await pending;
  assert.equal(aborted, true);
  for (const key of ['orders', 'cart', 'quote'])
    assert.equal(cache.getQueriesData({ queryKey: [key] }).length, 0);
  assert.deepEqual(cache.getQueryData(['products']), ['public-product']);
  cache.clear();
});
