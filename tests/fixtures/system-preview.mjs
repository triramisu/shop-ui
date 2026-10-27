// Disposable in-memory protocol fixture. Not a production auth implementation.
import { randomUUID } from 'node:crypto';
export const systemCapabilities = [
  'SYSTEM_USER_READ',
  'SYSTEM_USER_STATUS_UPDATE',
  'SYSTEM_USER_ROLE_ASSIGN',
  'SYSTEM_ROLE_READ',
  'SYSTEM_ROLE_MANAGE',
  'SYSTEM_PERMISSION_READ',
  'PAYMENT_REFUND',
];
export function systemPreview(catalogCapabilities, sessions, counts) {
  const all = [...catalogCapabilities, ...systemCapabilities];
  const now = () => new Date().toISOString();
  const roles = [
    {
      code: 'ADMIN',
      description: 'Quản trị toàn hệ thống',
      systemRole: true,
      permissions: all,
    },
    {
      code: 'STAFF',
      description: 'Nhân viên vận hành',
      systemRole: true,
      permissions: all.filter(
        (p) => !['SYSTEM_ROLE_MANAGE', 'PAYMENT_REFUND'].includes(p),
      ),
    },
    {
      code: 'USER',
      description: 'Khách hàng',
      systemRole: true,
      permissions: [],
    },
    {
      code: 'CATALOG_VIEWER',
      description: 'Xem nội dung sản phẩm',
      systemRole: false,
      permissions: ['CATALOG_READ'],
    },
    {
      code: 'REFUND_OPERATOR',
      description: 'Hoàn tiền',
      systemRole: false,
      permissions: ['PAYMENT_REFUND'],
    },
  ];
  const names = [
    'qa-admin',
    'qa-staff',
    'qa-reader',
    'qa-inventory',
    'qa-user',
    'qa-system-reader',
  ];
  const users = Array.from({ length: 31 }, (_, i) => ({
    id: `c0000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    username: names[i] ?? `qa-member-${i + 1}`,
    email: `member-${i + 1}@example.invalid`,
    firstName: i === 0 ? 'Minh QA' : `Thành viên ${i + 1}`,
    lastName: 'Nguyễn',
    status: i < 6 ? 'ACTIVE' : ['ACTIVE', 'LOCKED', 'DISABLED'][i % 3],
    emailVerified: i % 2 === 0,
    roles: [
      i === 0
        ? 'ADMIN'
        : i === 1 || i === 2 || i === 3 || i === 5
          ? 'STAFF'
          : 'USER',
    ],
    createdAt: now(),
    updatedAt: now(),
  }));
  const permissions = all.map((code) => ({
    code,
    description:
      {
        SYSTEM_USER_READ: 'Xem người dùng',
        SYSTEM_USER_STATUS_UPDATE: 'Đổi trạng thái tài khoản',
        SYSTEM_USER_ROLE_ASSIGN: 'Phân vai trò người dùng',
        SYSTEM_ROLE_READ: 'Xem vai trò',
        SYSTEM_ROLE_MANAGE: 'Quản lý vai trò tùy chỉnh',
        SYSTEM_PERMISSION_READ: 'Xem danh mục quyền',
        PAYMENT_REFUND: 'Yêu cầu và tra cứu hoàn tiền',
      }[code] ?? code,
  }));
  const passwords = new Map();
  const refunds = new Map();
  const keys = new Map();
  const revoke = (id) => {
    for (const [token, a] of sessions)
      if (a.user.id === id) sessions.delete(token);
  };
  function profile(username) {
    return users.find((u) => u.username === username);
  }
  function handle(req, url, body, actor, send) {
    const path = url.pathname,
      method = req.method;
    if (path === '/api/auth/my-info' && method === 'PUT') {
      if (!actor) return (send(401), true);
      if (!body.email || body.email.length > 320) return (send(400), true);
      Object.assign(actor.user, {
        email: body.email.toLowerCase(),
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: body.dateOfBirth,
        updatedAt: now(),
      });
      counts.mutations++;
      send(200, actor.user);
      return true;
    }
    if (path === '/api/auth/my-info/password' && method === 'PUT') {
      if (!actor) return (send(401), true);
      if (
        body.currentPassword !==
          (passwords.get(actor.user.username) ?? 'PreviewOnly123!') ||
        body.newPassword === body.currentPassword ||
        body.newPassword?.length < 8
      )
        return (send(400), true);
      passwords.set(actor.user.username, body.newPassword);
      revoke(actor.user.id);
      send(200);
      return true;
    }
    const refund = path.match(
      /^\/api\/admin\/payments\/([^/]+)\/refunds(?:\/([^/]+))?$/,
    );
    if (refund) {
      counts.admin++;
      if (!actor) return (send(401), true);
      if (!actor.permissions.includes('PAYMENT_REFUND'))
        return (send(403), true);
      const [, payment, id] = refund;
      if (method === 'GET') {
        const r = refunds.get(id);
        send(r?.paymentAttemptId === payment ? 200 : 404, r);
        return true;
      }
      const key = req.headers['idempotency-key'];
      if (!key) return (send(400), true);
      const saved = keys.get(payment + key);
      if (saved) {
        send(saved.payload === JSON.stringify(body) ? 200 : 409, saved.result);
        return true;
      }
      const r = {
        id: randomUUID(),
        paymentAttemptId: payment,
        orderId: randomUUID(),
        amount: body.amount ?? '500000',
        currency: body.currency,
        status: 'UNKNOWN',
        createdAt: now(),
        updatedAt: now(),
      };
      refunds.set(r.id, r);
      keys.set(payment + key, { payload: JSON.stringify(body), result: r });
      counts.mutations++;
      send(200, r);
      return true;
    }
    if (!path.startsWith('/api/system-administration/')) return false;
    counts.admin++;
    if (!actor) return (send(401), true);
    const sub = path.replace('/api/system-administration/', '');
    const required = sub.startsWith('users')
      ? method === 'GET'
        ? 'SYSTEM_USER_READ'
        : sub.endsWith('/status')
          ? 'SYSTEM_USER_STATUS_UPDATE'
          : 'SYSTEM_USER_ROLE_ASSIGN'
      : sub === 'permissions'
        ? 'SYSTEM_PERMISSION_READ'
        : method === 'GET'
          ? 'SYSTEM_ROLE_READ'
          : 'SYSTEM_ROLE_MANAGE';
    if (!actor.permissions.includes(required)) return (send(403), true);
    if (sub === 'permissions') {
      send(200, permissions);
      return true;
    }
    if (sub === 'users' && method === 'GET') {
      const q = (url.searchParams.get('keyword') ?? '').toLowerCase();
      if (q === '__qa_unavailable__') return (send(503), true);
      const status = url.searchParams.get('status');
      const filtered = users.filter(
        (u) =>
          `${u.username} ${u.email} ${u.firstName} ${u.lastName}`
            .toLowerCase()
            .includes(q) &&
          (!status || u.status === status),
      );
      const page = Math.max(0, Number(url.searchParams.get('page')) || 0),
        size = Math.min(
          100,
          Math.max(1, Number(url.searchParams.get('size')) || 20),
        );
      send(200, {
        content: filtered.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
        first: page === 0,
        last: (page + 1) * size >= filtered.length,
      });
      return true;
    }
    if (sub.startsWith('users/')) {
      const [, id, action] = sub.split('/');
      const target = users.find((u) => u.id === id);
      if (!target) return (send(404), true);
      if (method === 'GET') {
        send(200, target);
        return true;
      }
      const admin = actor.user.roles.includes('ADMIN');
      if (
        target.roles.includes('ADMIN') ||
        (target.roles.includes('STAFF') && !admin)
      )
        return (send(403), true);
      if (action === 'status') {
        if (
          !['ACTIVE', 'LOCKED', 'DISABLED'].includes(body.status) ||
          (target.id === actor.user.id && body.status !== 'ACTIVE')
        )
          return (send(400), true);
        target.status = body.status;
      } else if (action === 'roles') {
        const selected = roles.filter((r) => body.roleCodes?.includes(r.code));
        if (
          !body.roleCodes?.length ||
          selected.length !== body.roleCodes.length
        )
          return (send(400), true);
        if (
          body.roleCodes.includes('ADMIN') ||
          (!admin &&
            selected.some(
              (r) =>
                r.code === 'STAFF' ||
                r.permissions.some((p) => !actor.permissions.includes(p)),
            ))
        )
          return (send(403), true);
        target.roles = body.roleCodes;
      } else return (send(404), true);
      target.updatedAt = now();
      revoke(target.id);
      counts.mutations++;
      send(200, target);
      return true;
    }
    if (sub === 'roles' && method === 'GET') {
      send(200, roles);
      return true;
    }
    if (sub.startsWith('roles')) {
      if (!actor.user.roles.includes('ADMIN')) return (send(403), true);
      const code = sub.split('/')[1] ?? body.code;
      const role = roles.find((r) => r.code === code);
      if (role?.systemRole) return (send(403), true);
      if (method === 'DELETE') {
        if (users.some((u) => u.roles.includes(code))) return (send(409), true);
        if (!role) return (send(404), true);
        roles.splice(roles.indexOf(role), 1);
        counts.mutations++;
        send(200);
        return true;
      }
      if (
        !/^[A-Z][A-Z0-9_]{2,49}$/.test(code) ||
        !Array.isArray(body.permissionCodes) ||
        body.permissionCodes.length > 100
      )
        return (send(400), true);
      if (body.permissionCodes.includes('SYSTEM_ROLE_MANAGE'))
        return (send(403), true);
      if (body.permissionCodes.some((p) => !all.includes(p)))
        return (send(400), true);
      if (method === 'POST' && role) return (send(409), true);
      if (method === 'PUT' && !role) return (send(404), true);
      const updated = {
        code,
        description: body.description,
        systemRole: false,
        permissions: body.permissionCodes,
      };
      if (role) {
        Object.assign(role, updated);
        users
          .filter((u) => u.roles.includes(code))
          .forEach((u) => revoke(u.id));
      } else roles.push(updated);
      counts.mutations++;
      send(method === 'POST' ? 201 : 200, updated);
      return true;
    }
    send(404);
    return true;
  }
  const permissionsFor = (username) => [
    ...new Set(
      (profile(username)?.roles ?? []).flatMap(
        (code) => roles.find((r) => r.code === code)?.permissions ?? [],
      ),
    ),
  ];
  return { handle, profile, passwords, permissionsFor };
}
