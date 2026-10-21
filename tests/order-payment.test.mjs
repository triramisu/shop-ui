import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { compile, loadClient, moduleUrl } from './loadTypeScript.mjs';

const {
  paymentAllowedOrigins, safeVnpayHandoff, orderPaymentView, isMissingPayment,
  newPaymentPollBudget, hasPaymentPollBudget, takePaymentPollSlot, shouldPollPayment,
} = await import(moduleUrl(compile('../src/lib/orderPayment.ts')));
const id = '53f7506a-4bd6-4ebe-8f92-dbf5d3324101';
const origin = 'https://api.example.test';
const actionUrl = `${origin}/api/payments/checkout/vnpay/start?attempt=${id}&token=${'a'.repeat(128)}`;
const payment = { paymentAttemptId: id, providerCode: 'VNPAY', status: 'REQUIRES_ACTION', actionUrl };
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
});

test('payment origin config accepts only exact HTTPS/443 origins and deduplicates', () => {
  assert.deepEqual(paymentAllowedOrigins(undefined), []);
  assert.deepEqual(paymentAllowedOrigins(`${origin},${origin}/,https://second.example.test:443`),
    [origin, 'https://second.example.test']);
  assert.deepEqual(paymentAllowedOrigins(
    'http://api.example.test,https://api.example.test:444,https://u:p@api.example.test,*,https://*.example.test,https://api.example.test?x=1,https://api.example.test#'), []);
});

test('only a backend-issued matching VNPay handoff can be opened', () => {
  assert.equal(safeVnpayHandoff(payment, [origin]), actionUrl);
  assert.equal(safeVnpayHandoff({ ...payment, actionUrl: actionUrl.replace(origin, `${origin}:443`) }, [origin]), actionUrl);
  assert.equal(safeVnpayHandoff(payment, []), null);
  assert.equal(safeVnpayHandoff(undefined, [origin]), null);
});

const badUrls = {
  javascript: 'javascript:alert(1)',
  http: actionUrl.replace('https:', 'http:'),
  protocolRelative: actionUrl.replace('https:', ''),
  userinfo: actionUrl.replace('https://', 'https://user:password@'),
  suffixHost: actionUrl.replace('api.example.test', 'api.example.test.evil.test'),
  prefixHost: actionUrl.replace('api.example.test', 'evil-api.example.test'),
  port: actionUrl.replace(origin, `${origin}:444`),
  path: actionUrl.replace('/vnpay/start', '/vnpay/return'),
  fragment: `${actionUrl}#done`,
  emptyFragment: `${actionUrl}#`,
  duplicateAttempt: `${actionUrl}&attempt=${id}`,
  duplicateToken: `${actionUrl}&token=${'b'.repeat(128)}`,
  extraRedirect: `${actionUrl}&redirect=https://evil.test`,
  mismatchedAttempt: actionUrl.replace(id, '63f7506a-4bd6-4ebe-8f92-dbf5d3324101'),
  missingAttempt: actionUrl.replace(`attempt=${id}&`, ''),
  invalidToken: actionUrl.replace('a'.repeat(128), 'g'.repeat(128)),
  shortToken: actionUrl.replace('a'.repeat(128), 'a'.repeat(127)),
  missingToken: actionUrl.split('&token=')[0],
  leadingWhitespace: ` ${actionUrl}`,
  oversized: `${actionUrl}&${'x'.repeat(2048)}`,
};
for (const [name, url] of Object.entries(badUrls)) {
  test(`handoff rejects ${name}`, () => {
    assert.equal(safeVnpayHandoff({ ...payment, actionUrl: url }, [origin]), null);
  });
}

test('invalid attempt, null URL, unknown provider/status never enable handoff', () => {
  for (const change of [
    { paymentAttemptId: 'not-a-uuid' }, { actionUrl: null },
    { providerCode: 'STRIPE' }, { status: 'SUCCEEDED' }, { status: 'FUTURE_STATUS' },
  ]) assert.equal(safeVnpayHandoff({ ...payment, ...change }, [origin]), null);
});

test('only Order API determines paid; provider success and browser flags do not', () => {
  for (const status of ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
    assert.equal(orderPaymentView(status, undefined, { status: 500 }).kind, 'paid');
  }
  assert.equal(orderPaymentView('PENDING', { ...payment, status: 'SUCCEEDED' }).kind, 'confirming');
  assert.equal(orderPaymentView('PENDING', { ...payment, responseCode: '00', paymentConfirmedByBrowser: true }, null, actionUrl).kind, 'action');
  assert.equal(orderPaymentView('CANCELLED', payment, null, actionUrl).kind, 'cancelled');
  assert.equal(orderPaymentView('FUTURE_STATUS', payment, null, actionUrl).kind, 'unavailable');
});

test('all payment projections and safe recovery states are distinguished', () => {
  const states = { CREATED: 'waiting', PENDING: 'waiting', UNKNOWN: 'waiting',
    REQUIRES_ACTION: 'action', SUCCEEDED: 'confirming', FAILED: 'failed',
    CANCELLED: 'cancelled', EXPIRED: 'expired', FUTURE_STATUS: 'unavailable' };
  for (const [status, kind] of Object.entries(states)) {
    assert.equal(orderPaymentView('PENDING', { ...payment, status }, null, actionUrl).kind, kind);
  }
  assert.equal(orderPaymentView('PENDING', payment, null, null).kind, 'unavailable');
  assert.equal(orderPaymentView('PENDING', { ...payment, providerCode: 'FAKE' }).kind, 'unavailable');
  assert.equal(orderPaymentView('PENDING').kind, 'waiting');
  assert.equal(orderPaymentView('PENDING', payment, { status: 404, code: 1407 }).kind, 'waiting');
  for (const error of [{ status: 404, code: 1310 }, { status: 401 }, { status: 403 },
    { status: 429 }, { status: 500 }, { status: 0 }]) {
    assert.equal(orderPaymentView('PENDING', payment, error, actionUrl).kind, 'error');
  }
});

test('polling reserves at most 12 slots and stops at 60 seconds or clock rollback', () => {
  const budget = newPaymentPollBudget(10_000);
  for (let index = 0; index < 12; index += 1) {
    assert.equal(takePaymentPollSlot(budget, 10_000 + index * 5_000), true);
  }
  assert.equal(budget.requests, 12);
  assert.equal(takePaymentPollSlot(budget, 65_001), false);
  assert.equal(hasPaymentPollBudget(newPaymentPollBudget(10_000), 70_000), false);
  assert.equal(takePaymentPollSlot(newPaymentPollBudget(10_000), 9_999), false);
  const manualCycle = newPaymentPollBudget(90_000);
  assert.equal(takePaymentPollSlot(manualCycle, 90_000), true);
  assert.equal(manualCycle.requests, 1);
});

test('only missing-attempt 404/1407 may keep polling errors; final states stop', () => {
  const budget = newPaymentPollBudget(0);
  assert.equal(isMissingPayment({ status: 404, code: 1407 }), true);
  assert.equal(shouldPollPayment('PENDING', undefined, { status: 404, code: 1407 }, budget, 1), true);
  for (const error of [{ status: 0 }, { status: 401 }, { status: 403 },
    { status: 429 }, { status: 500 }, { status: 404, code: 1310 }]) {
    assert.equal(shouldPollPayment('PENDING', payment, error, budget, 1), false);
  }
  for (const status of ['FAILED', 'CANCELLED', 'EXPIRED', 'FUTURE_STATUS']) {
    assert.equal(shouldPollPayment('PENDING', { ...payment, status }, null, budget, 1), false);
  }
  for (const status of ['CREATED', 'PENDING', 'REQUIRES_ACTION', 'UNKNOWN', 'SUCCEEDED']) {
    assert.equal(shouldPollPayment('PENDING', { ...payment, status }, null, budget, 1), true);
  }
  assert.equal(shouldPollPayment('PAID', payment, null, budget, 1), false);
  assert.equal(shouldPollPayment('CANCELLED', payment, null, budget, 1), false);
  assert.equal(shouldPollPayment('PENDING', { ...payment, providerCode: 'FAKE' }, null, budget, 1), false);
  assert.equal(shouldPollPayment('PENDING', payment, null, budget, 60_000), false);
});

const auth = (name) => ({ authenticated: true, accessToken: `${name}-access`,
  refreshToken: `${name}-refresh`, accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString() });
const response = (result, status = 200, code = 1000) =>
  new Response(JSON.stringify({ code, result }), { status });
async function loadOrders() {
  const loaded = await loadClient();
  const orders = await import(moduleUrl(compile('../src/api/orders.ts')
    .replace(/from ['"]@\/lib\/apiClient['"]/, `from '${loaded.clientUrl}'`)));
  return { ...loaded, ordersApi: orders.ordersApi };
}

test('payment API encodes ID, sends only authenticated GET and uses AbortSignal', async () => {
  const { session, ordersApi } = await loadOrders();
  session.setSession(auth('A'));
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/orders/a%2Fb/payment');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer A-access');
    assert.equal(options.signal, controller.signal);
    assert.equal(options.body, undefined);
    return response(payment);
  };
  assert.deepEqual(await ordersApi.payment('a/b', controller.signal), payment);
});

test('payment polling does not replay a 401 or refresh reactively', async () => {
  const { session, ordersApi } = await loadOrders();
  session.setSession(auth('A'));
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    assert.equal(url, `/api/orders/${id}/payment`);
    return response(null, 401, 1006);
  };
  await assert.rejects(ordersApi.payment(id), { status: 401 });
  assert.equal(calls, 1);
});

test('the default client still refreshes and replays non-payment requests once', async () => {
  const { session, ordersApi } = await loadOrders();
  session.setSession(auth('A'));
  let orderCalls = 0;
  let refreshCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url === '/api/auth/refresh') {
      refreshCalls += 1;
      return response(auth('A-rotated'));
    }
    assert.equal(url, `/api/orders/${id}`);
    orderCalls += 1;
    if (orderCalls === 1) return response(null, 401, 1006);
    assert.equal(options.headers.Authorization, 'Bearer A-rotated-access');
    return response({ id, status: 'PENDING' });
  };
  assert.deepEqual(await ordersApi.detail(id), { id, status: 'PENDING' });
  assert.equal(orderCalls, 2);
  assert.equal(refreshCalls, 1);
});

test('payment network failure and pre-aborted requests never trigger a retry', async () => {
  const { session, ordersApi } = await loadOrders();
  session.setSession(auth('A'));
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new TypeError('QA offline'); };
  await assert.rejects(ordersApi.payment(id), { status: 0 });
  assert.equal(calls, 1);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(ordersApi.payment(id, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('late payment response from A is discarded after logout or switching to B', async () => {
  for (const next of [null, auth('B')]) {
    const { session, ordersApi } = await loadOrders();
    session.setSession(auth('A'));
    let finish;
    globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
    const request = ordersApi.payment(id);
    session.setSession(next);
    finish(response(payment));
    await assert.rejects(request, { name: 'AbortError' });
    assert.equal(session.getSession()?.accessToken ?? null, next?.accessToken ?? null);
  }
});

test('logout cancels payment request, removes its private URL and keeps catalog', async () => {
  const { clearCustomerQueries } = await import(moduleUrl(compile('../src/lib/customerCache.ts')));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ['orders', 'A', 'payment', id];
  client.setQueryData(key, payment);
  client.setQueryData(['products'], ['public']);
  let aborted = false;
  let finish;
  const pending = client.fetchQuery({ queryKey: key, queryFn: ({ signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Promise((resolve) => { finish = resolve; });
  } }).catch((error) => error);
  clearCustomerQueries(client);
  finish(payment);
  await pending;
  assert.equal(aborted, true);
  assert.equal(client.getQueryData(key), undefined);
  assert.deepEqual(client.getQueryData(['products']), ['public']);
  client.clear();
});
