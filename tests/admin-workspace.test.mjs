import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { compile, moduleUrl, loadClient } from './loadTypeScript.mjs';
import { adminPreviewServer } from './fixtures/admin-preview.mjs';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

test('actual AdminGate does not mount private page while profile loads or permission is denied', async () => {
  const mockedHook = moduleUrl(
    'export function useAdminAccess(){ return globalThis.__adminGateQa; }',
  );
  const compiled = ts
    .transpileModule(
      readFileSync(
        new URL('../src/admin/AdminGate.tsx', import.meta.url),
        'utf8',
      ),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    )
    .outputText.replace(
      /from ['"']([^'"']+)['"']/g,
      (_match, name) =>
        `from '${name === './useAdminAccess' ? mockedHook : import.meta.resolve(name)}'`,
    );
  const { AdminGate } = await import(moduleUrl(compiled));
  let mounts = 0;
  function PrivatePage() {
    mounts++;
    return createElement('p', null, 'private-sentinel');
  }
  const base = {
    isAuthenticated: true,
    user: { id: 'a' },
    canEnter: true,
    loadingUser: false,
    permissions: new Set(['CATALOG_READ']),
    refreshUser() {},
  };
  const render = () =>
    renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/admin/products' },
        createElement(
          AdminGate,
          { capability: 'CATALOG_WRITE' },
          createElement(PrivatePage),
        ),
      ),
    );
  try {
    for (const change of [
      { loadingUser: true },
      { user: null },
      { canEnter: false },
      {},
    ]) {
      globalThis.__adminGateQa = { ...base, ...change };
      assert.ok(!render().includes('private-sentinel'));
    }
    assert.equal(mounts, 0);
    globalThis.__adminGateQa = {
      ...base,
      permissions: new Set(['CATALOG_READ', 'CATALOG_WRITE']),
    };
    assert.ok(render().includes('private-sentinel'));
    assert.equal(mounts, 1);
  } finally {
    delete globalThis.__adminGateQa;
  }
});

const access = await import(moduleUrl(compile('../src/admin/access.ts')));
const validation = await import(
  moduleUrl(compile('../src/admin/validation.ts'))
);
test('native HTML patterns are valid with the browser Unicode-v flag and retain backend formats', () => {
  for (const [pattern, good, bad] of [
    [validation.skuPattern, 'QA-SKU_01.2', 'bad sku'],
    [validation.locationPattern, 'DEMO-LAB', '!bad'],
    [validation.codePattern, 'AUDIO_01', 'bad code'],
    [validation.slugPattern, 'tai-nghe-01', 'không dấu'],
    [validation.pricePattern, '12.34', '12.345'],
  ]) {
    const regex = new RegExp(`^(?:${pattern})$`, 'v');
    assert.ok(regex.test(good));
    assert.ok(!regex.test(bad));
  }
});
const user = (roles = ['STAFF']) => ({
  id: 'a',
  username: 'operator',
  status: 'ACTIVE',
  roles,
});
test('admin price displays decimal VND and large exact string amounts without Number rounding', () => {
  assert.match(
    validation.formatAdminPrice('2190000.50', 'VND'),
    /2\.190\.000,50/,
  );
  assert.match(
    validation.formatAdminPrice('99999999999999999.99', 'USD'),
    /99\.999\.999\.999\.999\.999,99/,
  );
  assert.equal(validation.formatAdminPrice('0.00', 'VND'), '0 ₫');
});
const jwt = (changes = {}) =>
  `header.${Buffer.from(JSON.stringify({ sub: 'operator', token_type: 'access', exp: 2000000000, scope: 'ROLE_STAFF CATALOG_READ INVENTORY_READ', ...changes })).toString('base64url')}.signature`;
test('admin entry requires verified profile role AND matching access scope, never role alone', () => {
  assert.equal(
    access.canEnterAdmin(access.adminPermissions(user(), jwt(), 0)),
    true,
  );
  assert.equal(
    access.canEnterAdmin(access.adminPermissions(user(['USER']), jwt(), 0)),
    false,
  );
  assert.equal(
    access.canEnterAdmin(
      access.adminPermissions(user(['ADMIN']), jwt({ scope: 'ROLE_ADMIN' }), 0),
    ),
    false,
  );
  assert.equal(
    access.canEnterAdmin(
      access.adminPermissions(
        user(),
        jwt({ scope: 'ROLE_ADMIN CATALOG_READ' }),
        0,
      ),
    ),
    false,
  );
  assert.equal(
    access.adminPermissions(
      user(),
      jwt({ scope: 'ROLE_STAFF CATALOG_READ MADE_UP_PERMISSION' }),
      0,
    ).size,
    1,
  );
});
test('admin hints fail closed for missing/disabled profile, foreign subject, expired and refresh tokens', () => {
  for (const [profile, token] of [
    [null, jwt()],
    [{ ...user(), status: 'DISABLED' }, jwt()],
    [user(), jwt({ sub: 'other' })],
    [user(), jwt({ token_type: 'refresh' })],
    [user(), jwt({ exp: 0 })],
    [user(), jwt({ scope: ['CATALOG_READ'] })],
    [user(), 'broken'],
    [user(), undefined],
    [{ ...user(), roles: null }, jwt()],
  ])
    assert.equal(access.adminPermissions(profile, token, 1000).size, 0);
});
test('stock input rejects fractional, zero-delta and unsafe quantities without coercion', () => {
  assert.equal(validation.integerInput('-3', true), -3);
  assert.equal(validation.integerInput('0'), 0);
  for (const value of ['1.5', '1e3', 'Infinity', '9007199254740992', ''])
    assert.throws(() => validation.integerInput(value));
  assert.throws(() => validation.integerInput('0', true));
  assert.throws(() => validation.integerInput('-1'));
});
test('upload guidance enforces allowed formats and bounded size/count before request', () => {
  const file = { type: 'image/png', size: 100 };
  assert.equal(validation.validateImages([file]), null);
  for (const files of [
    [],
    Array(6).fill(file),
    [{ type: 'image/svg+xml', size: 100 }],
    [{ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }],
    [{ type: 'image/png', size: 0 }],
  ])
    assert.ok(validation.validateImages(files));
});
test('logout cancels/removes all admin actors while keeping public catalog cached', async () => {
  const { clearCustomerQueries } = await import(
    moduleUrl(compile('../src/lib/customerCache.ts'))
  );
  const client = new QueryClient();
  client.setQueryData(['products'], ['public']);
  client.setQueryData(access.adminQueryKey('a', 'products'), ['private-a']);
  client.setQueryData(access.adminQueryKey('b', 'stock'), ['private-b']);
  clearCustomerQueries(client);
  assert.deepEqual(client.getQueriesData({ queryKey: ['admin'] }), []);
  assert.deepEqual(client.getQueryData(['products']), ['public']);
  client.clear();
});
async function clientApi() {
  const { session, clientUrl } = await loadClient();
  session.setSession({
    accessToken: 'qa-access',
    refreshToken: 'qa-refresh',
    accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString(),
  });
  const api = await import(
    moduleUrl(
      compile('../src/admin/api.ts').replace(
        "'@/lib/apiClient'",
        `'${clientUrl}'`,
      ),
    )
  );
  return api.adminApi;
}
const id = '11111111-1111-4111-8111-111111111111';
test('admin mutations preserve server version and are never replayed on 401', async () => {
  const api = await clientApi();
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ code: 1006 }), { status: 401 });
  };
  try {
    await assert.rejects(
      api.updateProduct(id, {
        name: 'Audio',
        slug: 'audio',
        categoryId: id,
        description: '',
        version: 7,
      }),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `/api/admin/catalog/products/${id}`);
    assert.equal(calls[0].init.method, 'PUT');
    assert.equal(JSON.parse(calls[0].init.body).version, 7);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer qa-access');
  } finally {
    globalThis.fetch = previous;
  }
});
test('admin routes reject injected identifiers before sending a request', async () => {
  const api = await clientApi();
  let requests = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = async () => {
    requests++;
  };
  try {
    for (const key of ['../auth/logout', 'a/b', '%2fadmin', 'not-a-uuid'])
      assert.throws(() => api.product(key));
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = previous;
  }
});
test('write contracts distinguish productVersion, variant version and signed stock delta', async () => {
  const api = await clientApi();
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({url, method: init.method, body: JSON.parse(init.body)});
    return new Response(JSON.stringify({code: 1000, result: {}}), {status: 200});
  };
  try {
    const variant = {sku: 'QA-SKU-01', name: 'Silver', price: '123.45', currency: 'VND'};
    await api.addVariant({id, version: 7}, variant);
    assert.equal(calls[0].body.productVersion, 7);
    assert.equal(calls[0].body.version, undefined);
    assert.equal(calls[0].body.price, '123.45');
    await api.updateVariant(id, id, {name: 'Cream', price: '125.50', currency: 'VND', version: 3});
    assert.equal(calls[1].method, 'PUT');
    assert.equal(calls[1].body.version, 3);
    assert.equal(calls[1].body.productVersion, undefined);
    await api.arrange(id, [id], id);
    assert.equal(calls[2].url, `/api/admin/catalog/products/${id}/images/arrangement`);
    assert.deepEqual(calls[2].body, {imageIds: [id], primaryImageId: id});
    await api.adjustStock(id, {quantityDelta: -5, reason: 'QA stock count', referenceId: 'QA-01', version: 9});
    assert.equal(calls[3].method, 'POST');
    assert.deepEqual(calls[3].body, {quantityDelta: -5, reason: 'QA stock count', referenceId: 'QA-01', version: 9});
  } finally {
    globalThis.fetch = previous;
  }
});
test('image upload uses multipart without a JSON Content-Type or automatic retry', async () => {
  const api = await clientApi();
  let captured;
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ code: 1000, result: [] }), {
      status: 201,
    });
  };
  try {
    await api.upload(id, [
      new File(['png'], 'image.png', { type: 'image/png' }),
    ]);
    assert.ok(captured.init.body instanceof FormData);
    assert.equal(captured.init.body.getAll('files').length, 1);
    assert.equal(captured.init.headers['Content-Type'], undefined);
    assert.equal(captured.url, `/api/admin/catalog/products/${id}/images`);
  } finally {
    globalThis.fetch = previous;
  }
});
test('local admin fixture checks capabilities, optimistic conflicts and reservation balance', async () => {
  const server = adminPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (username) =>
    (
      await (
        await fetch(`${base}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: 'PreviewOnly123!' }),
        })
      ).json()
    ).result;
  const request = async (path, token, body) =>
    fetch(`${base}/api/admin/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  try {
    const customer = await login('qa-user');
    assert.equal(
      (await request('catalog/products', customer.accessToken)).status,
      403,
    );
    const reader = await login('qa-reader');
    assert.equal(
      (await request('catalog/categories', reader.accessToken, {})).status,
      403,
    );
    const admin = await login('qa-admin');
    const stocks = (
      await (await request('inventory/stock-items', admin.accessToken)).json()
    ).result.content;
    const item = stocks[1];
    assert.equal(
      (
        await request(
          `inventory/stock-items/${item.id}/adjustments`,
          admin.accessToken,
          { quantityDelta: 3, reason: 'QA', version: 99 },
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          `inventory/stock-items/${item.id}/adjustments`,
          admin.accessToken,
          { quantityDelta: -item.onHand, reason: 'QA', version: 0 },
        )
      ).status,
      400,
    );
    const changed = (
      await (
        await request(
          `inventory/stock-items/${item.id}/adjustments`,
          admin.accessToken,
          { quantityDelta: 3, reason: 'QA', version: 0 },
        )
      ).json()
    ).result;
    assert.equal(changed.onHand, item.onHand + 3);
    assert.equal(changed.reserved, item.reserved);
    assert.equal(changed.available, changed.onHand - changed.reserved);
    assert.equal(changed.version, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
