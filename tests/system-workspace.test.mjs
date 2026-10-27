import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, moduleUrl, loadClient } from './loadTypeScript.mjs';
import { adminPreviewServer } from './fixtures/admin-preview.mjs';
import { QueryClient } from '@tanstack/react-query';

const accessUrl = moduleUrl(compile('../src/admin/access.ts'));
const access = await import(accessUrl);
const rules = await import(
  moduleUrl(
    compile('../src/admin/systemRules.ts').replace(
      /(['"])\.\/access\1/,
      JSON.stringify(accessUrl),
    ),
  )
);
const profile = (roles = ['ADMIN']) => ({
  id: 'actor',
  username: 'operator',
  status: 'ACTIVE',
  roles,
});
test('refund browser pattern accepts positive exact decimals and rejects zero or oversized amounts', () => {
  const pattern = new RegExp(`^(?:${rules.refundAmountPattern})$`, 'v');
  for (const value of ['0.01', '123.45', '12345678901234567.89'])
    assert.ok(pattern.test(value));
  for (const value of [
    '0',
    '0.00',
    '-1',
    '.50',
    '1.234',
    '123456789012345678.90',
  ])
    assert.ok(!pattern.test(value));
});
test('refund presentation avoids silently rounding unsafe numeric JSON amounts', async () => {
  const { formatRefundAmount } = await import(
    moduleUrl(compile('../src/admin/validation.ts'))
  );
  assert.equal(
    formatRefundAmount('12345678901234567.89', 'VND'),
    '12.345.678.901.234.567,89 ₫',
  );
  assert.match(formatRefundAmount(12345678901234567, 'VND'), /đối chiếu/);
  assert.equal(formatRefundAmount(123.45, 'VND'), '123,45 ₫');
});
const token = (scopes) =>
  `eyJhbGciOiJIUzUxMiJ9.${Buffer.from(JSON.stringify({ sub: 'operator', token_type: 'access', exp: Math.floor(Date.now() / 1000) + 3600, scope: scopes })).toString('base64url')}.signature`;
test('logout clears private mutation records for every actor and retains unrelated cache', async () => {
  const { clearCustomerQueries } = await import(
    moduleUrl(compile('../src/lib/customerCache.ts'))
  );
  const client = new QueryClient();
  const cache = client.getMutationCache();
  cache.build(client, { mutationKey: ['admin', 'a'] });
  cache.build(client, { mutationKey: ['admin', 'b'] });
  cache.build(client, { mutationKey: ['unrelated'] });
  clearCustomerQueries(client);
  assert.deepEqual(
    cache.getAll().map((m) => m.options.mutationKey),
    [['unrelated']],
  );
  client.clear();
});

test('system-only operators can enter admin; ordinary and mismatched profiles cannot', () => {
  const p = access.adminPermissions(
    profile(['STAFF']),
    token('ROLE_STAFF SYSTEM_USER_READ'),
  );
  assert.ok(access.canEnterAdmin(p));
  assert.ok(
    !access.canEnterAdmin(
      access.adminPermissions(
        profile(['USER']),
        token('ROLE_STAFF SYSTEM_USER_READ'),
      ),
    ),
  );
  assert.ok(!access.canEnterAdmin(new Set(['SYSTEM_USER_STATUS_UPDATE'])));
  assert.ok(
    access.canEnterAdmin(
      access.adminPermissions(
        profile(['USER', 'CATALOG_EDITOR']),
        token('ROLE_USER ROLE_CATALOG_EDITOR CATALOG_READ'),
      ),
    ),
  );
  assert.ok(
    !access.canEnterAdmin(
      access.adminPermissions(
        profile(['USER', 'CATALOG_EDITOR']),
        token('ROLE_USER ROLE_DIFFERENT CATALOG_READ'),
      ),
    ),
  );
});
test('login landing waits for verified actor and keeps admin deep links; customer return paths remain internal', () => {
  const t = token('ROLE_ADMIN SYSTEM_USER_READ');
  assert.equal(rules.loginDestination(profile(), t), '/admin');
  assert.equal(rules.loginDestination(profile(), t, '/checkout'), '/admin');
  assert.equal(
    rules.loginDestination(profile(), t, '/admin/users?page=2'),
    '/admin/users?page=2',
  );
  assert.equal(
    rules.loginDestination(profile(['USER']), token('ROLE_USER'), '/cart'),
    '/cart',
  );
  for (const bad of [
    'https://outside.invalid',
    '//outside.invalid',
    '/\\outside.invalid',
    '/login',
    '/register',
    '/bad\npath',
  ])
    assert.equal(rules.safeReturnPath(bad), '/');
});
test('UI never offers ADMIN assignment or STAFF escalation and preserves backend role protection', () => {
  const roles = [
    { code: 'ADMIN', permissions: [] },
    { code: 'STAFF', permissions: [] },
    { code: 'USER', permissions: [] },
    { code: 'VIEWER', permissions: ['CATALOG_READ'] },
    { code: 'REFUNDS', permissions: ['PAYMENT_REFUND'] },
  ];
  const actor = profile(['STAFF']),
    customer = { ...profile(['USER']), id: 'customer' };
  assert.deepEqual(
    rules
      .assignableRoles(actor, new Set(['CATALOG_READ']), roles, customer)
      .map((r) => r.code),
    ['USER', 'VIEWER'],
  );
  assert.deepEqual(
    rules.assignableRoles(actor, new Set(), roles, profile(['ADMIN'])),
    [],
  );
  assert.deepEqual(
    rules.assignableRoles(actor, new Set(), roles, profile(['STAFF'])),
    [],
  );
  assert.deepEqual(
    rules
      .assignableRoles(profile(), new Set(), roles, customer)
      .map((r) => r.code),
    ['STAFF', 'USER', 'VIEWER', 'REFUNDS'],
  );
  assert.equal(
    rules.canManageRoles(actor, new Set(['SYSTEM_ROLE_MANAGE'])),
    false,
  );
  assert.equal(
    rules.canManageRoles(profile(), new Set(['SYSTEM_ROLE_MANAGE'])),
    true,
  );
});
async function loadApi() {
  const { session, clientUrl } = await loadClient();
  session.setSession({
    accessToken: 'fixture-access',
    refreshToken: 'fixture-refresh',
    tokenType: 'Bearer',
    authenticated: true,
    accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString(),
  });
  return (
    await import(
      moduleUrl(
        compile('../src/admin/systemApi.ts').replace(
          /(['"])@\/lib\/apiClient\1/,
          JSON.stringify(clientUrl),
        ),
      )
    )
  ).systemApi;
}
const id = '11111111-1111-4111-8111-111111111111';
test('Identity writes send existing DTOs without invented versions and do not replay on 401', async () => {
  const api = await loadApi(),
    calls = [];
  const old = fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ code: 1006 }), { status: 401 });
  };
  try {
    await assert.rejects(api.status(id, 'LOCKED'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `/api/system-administration/users/${id}/status`);
    assert.equal(calls[0].init.method, 'PATCH');
    assert.deepEqual(JSON.parse(calls[0].init.body), { status: 'LOCKED' });
    assert.throws(() => api.user('../auth/logout'));
    assert.throws(() => api.deleteRole('ADMIN/../users'));
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = old;
  }
});
test('role, profile, password and refund contracts preserve fields, exact decimal and idempotency key', async () => {
  const api = await loadApi(),
    calls = [];
  const old = fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ code: 1000, result: {} }));
  };
  try {
    await api.userRoles(id, ['USER', 'VIEWER']);
    await api.createRole({
      code: 'VIEWER',
      description: 'Read',
      permissionCodes: ['CATALOG_READ'],
    });
    await api.updateRole('VIEWER', {
      description: 'Edit',
      permissionCodes: [],
    });
    await api.deleteRole('VIEWER');
    await api.profile({
      email: 'qa@example.invalid',
      firstName: 'QA',
      lastName: 'Only',
      dateOfBirth: null,
    });
    await api.password({
      currentPassword: 'fixture-only-old',
      newPassword: 'fixture-only-new',
    });
    const body = { amount: '12345678901234567.89', currency: 'VND' };
    await api.createRefund(id, 'qa-one-key', body);
    await api.createRefund(id, 'qa-one-key', body);
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      roleCodes: ['USER', 'VIEWER'],
    });
    assert.deepEqual(JSON.parse(calls[1].init.body).permissionCodes, [
      'CATALOG_READ',
    ]);
    assert.equal(calls[3].init.method, 'DELETE');
    assert.equal(calls[4].url, '/api/auth/my-info');
    assert.equal(calls[5].url, '/api/auth/my-info/password');
    assert.equal(calls[6].init.headers['Idempotency-Key'], 'qa-one-key');
    assert.equal(calls[6].init.body, calls[7].init.body);
    assert.equal(JSON.parse(calls[6].init.body).amount, body.amount);
    assert.throws(() => api.createRefund(id, 'invalid\nheader', body));
  } finally {
    globalThis.fetch = old;
  }
});
test('fixture exercises system permission denials, role/status protection, revocation and refund replay', async () => {
  const server = adminPreviewServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(path, token, method = 'GET', body, headers = {}) {
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, ...(await r.json()) };
  }
  const login = async (username) =>
    (
      await call('/api/auth/token', null, 'POST', {
        username,
        password: 'PreviewOnly123!',
      })
    ).result.accessToken;
  try {
    const admin = await login('qa-admin'),
      staff = await login('qa-staff'),
      reader = await login('qa-system-reader'),
      user = await login('qa-user');
    assert.equal(
      (await call('/api/system-administration/users', user)).status,
      403,
    );
    const list = await call(
      '/api/system-administration/users?size=3&page=1',
      reader,
    );
    assert.equal(list.result.content.length, 3);
    assert.equal(list.result.totalElements, 31);
    assert.equal(list.result.page, 1);
    const target = (await call('/api/auth/my-info', user)).result;
    assert.equal(
      (
        await call(
          `/api/system-administration/users/${target.id}/status`,
          reader,
          'PATCH',
          { status: 'LOCKED' },
        )
      ).status,
      403,
    );
    const adminUser = (await call('/api/auth/my-info', admin)).result;
    assert.equal(
      (
        await call(
          `/api/system-administration/users/${adminUser.id}/status`,
          admin,
          'PATCH',
          { status: 'LOCKED' },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          `/api/system-administration/users/${target.id}/roles`,
          staff,
          'PUT',
          { roleCodes: ['STAFF'] },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          `/api/system-administration/users/${target.id}/roles`,
          staff,
          'PUT',
          { roleCodes: ['REFUND_OPERATOR'] },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/api/system-administration/roles/STAFF', admin, 'PUT', {
          description: 'bad',
          permissionCodes: [],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/api/system-administration/roles', admin, 'POST', {
          code: 'QA_ROLE',
          permissionCodes: ['SYSTEM_ROLE_MANAGE'],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/api/system-administration/roles', admin, 'POST', {
          code: 'QA_ROLE',
          permissionCodes: ['CATALOG_READ'],
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await call(
          `/api/system-administration/users/${target.id}/roles`,
          admin,
          'PUT',
          { roleCodes: ['USER', 'QA_ROLE'] },
        )
      ).status,
      200,
    );
    assert.equal((await call('/api/auth/my-info', user)).status, 401);
    assert.equal(
      (await call('/api/system-administration/roles/QA_ROLE', admin, 'DELETE'))
        .status,
      409,
    );
    const path = `/api/admin/payments/${id}/refunds`,
      body = { amount: '250.50', currency: 'VND' },
      headers = { 'Idempotency-Key': 'qa-key' };
    const a = await call(path, admin, 'POST', body, headers),
      b = await call(path, admin, 'POST', body, headers);
    assert.equal(a.result.id, b.result.id);
    assert.equal(a.result.status, 'UNKNOWN');
    assert.equal(
      (
        await call(
          path,
          admin,
          'POST',
          { amount: '999', currency: 'VND' },
          headers,
        )
      ).status,
      409,
    );
    assert.equal(
      (await call(path + '/' + a.result.id, admin)).result.id,
      a.result.id,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
