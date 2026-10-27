// Loopback-only, in-memory QA. No AWS/SQL/merchant calls or persisted credentials.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  storefrontPreviewServer,
  previewProducts,
  previewCategories,
} from './storefront-preview.mjs';

const all = [
  'CATALOG_READ',
  'CATALOG_WRITE',
  'CATALOG_PUBLISH',
  'CATALOG_IMAGE_MANAGE',
  'INVENTORY_READ',
  'INVENTORY_WRITE',
];
export function adminPreviewServer() {
  const publicCatalog = storefrontPreviewServer();
  const now = () => new Date().toISOString();
  const categories = previewCategories.map((item, index) => ({
    ...item,
    code: ['WIRELESS', 'STUDIO', 'TRAVEL'][index],
    status: 'ACTIVE',
    version: 0,
    createdAt: now(),
    updatedAt: now(),
  }));
  const products = previewProducts.map((item, index) => ({
    ...item,
    category: categories[index % 3],
    status:
      index % 5 === 0 ? 'DRAFT' : index % 5 === 1 ? 'HIDDEN' : 'PUBLISHED',
    version: 0,
    createdAt: now(),
    updatedAt: now(),
    variants: item.variants.map((v) => ({
      ...v,
      status: 'ACTIVE',
      version: 0,
    })),
  }));
  const stocks = products.map((item, index) => ({
    id: `b0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    productVariantId: item.variants[0].id,
    sku: item.variants[0].sku,
    locationCode: 'DEMO-LAB',
    onHand: 50 + index * 3,
    reserved: index % 3,
    available: 50 + index * 3 - (index % 3),
    version: 0,
    createdAt: now(),
    updatedAt: now(),
  }));
  const movements = new Map(
    stocks.map((item) => [
      item.id,
      [
        {
          id: randomUUID(),
          movementType: 'INITIAL',
          onHandDelta: item.onHand,
          reservedDelta: 0,
          onHandAfter: item.onHand,
          reservedAfter: 0,
          reason: 'Khởi tạo fixture local',
          referenceId: 'QA-ONLY',
          occurredAt: now(),
        },
      ],
    ]),
  );
  const images = new Map(
    products.map((p, index) => [
      p.id,
      [
        {
          id: randomUUID(),
          url: `/api/catalog/qa-images/${index}`,
          originalFilename: `qa-audio-${index}.png`,
          contentType: 'image/png',
          sizeBytes: 241399,
          primary: true,
          displayOrder: 0,
          version: 0,
        },
      ],
    ]),
  );
  const sessions = new Map();
  const counts = { admin: 0, mutations: 0 };
  function session(role, permissions, username) {
    const payload = {
      sub: username,
      token_type: 'access',
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: [`ROLE_${role}`, ...permissions].join(' '),
    };
    const accessToken = `${Buffer.from('{"alg":"HS512","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.LOCAL_FIXTURE_SIGNATURE`;
    const user = {
      id: `qa-${username}`,
      username,
      email: `${username}@example.invalid`,
      firstName: role === 'ADMIN' ? 'Minh QA' : 'Nhân sự QA',
      status: 'ACTIVE',
      emailVerified: true,
      roles: [role],
      createdAt: now(),
    };
    sessions.set(accessToken, { user, permissions });
    return {
      accessToken,
      refreshToken: 'LOCAL-ONLY-NO-REFRESH',
      tokenType: 'Bearer',
      authenticated: true,
      accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 7200000).toISOString(),
    };
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const send = (
      status,
      result,
      code = status === 200 || status === 201 ? 1000 : status,
      message,
    ) => {
      res.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'access-control-allow-origin': 'http://127.0.0.1',
      });
      res.end(JSON.stringify({ code, result, message }));
    };
    let body = {};
    if (req.method !== 'GET') {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 6 * 1024 * 1024) return send(413);
        chunks.push(chunk);
      }
      if (req.headers['content-type']?.includes('application/json')) {
        try {
          body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        } catch {
          return send(400);
        }
      }
    }
    if (url.pathname === '/__qa/status') return send(200, counts);
    if (url.pathname === '/api/auth/token' && req.method === 'POST') {
      const permissions =
        body.username === 'qa-admin' || body.username === 'qa-staff'
          ? all
          : body.username === 'qa-reader'
            ? ['CATALOG_READ', 'INVENTORY_READ']
            : body.username === 'qa-inventory'
              ? ['INVENTORY_READ']
              : [];
      if (
        ![
          'qa-admin',
          'qa-staff',
          'qa-reader',
          'qa-inventory',
          'qa-user',
        ].includes(body.username) ||
        body.password !== 'PreviewOnly123!'
      )
        return send(401, undefined, 1006);
      return send(
        200,
        session(
          body.username === 'qa-admin'
            ? 'ADMIN'
            : body.username === 'qa-user'
              ? 'USER'
              : 'STAFF',
          permissions,
          body.username,
        ),
      );
    }
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const actor = sessions.get(token);
    if (url.pathname === '/api/cart' && req.method === 'GET')
      return actor
        ? send(200, {
            id: 'qa-cart',
            items: [],
            distinctItemCount: 0,
            totalQuantity: 0,
            version: 0,
            updatedAt: now(),
          })
        : send(401, undefined, 1006);
    if (url.pathname === '/api/auth/my-info')
      return actor ? send(200, actor.user) : send(401, undefined, 1006);
    if (url.pathname === '/api/auth/logout') {
      sessions.delete(token);
      return send(200);
    }
    if (!url.pathname.startsWith('/api/admin/'))
      return publicCatalog.emit('request', req, res);
    counts.admin++;
    if (!actor) return send(401, undefined, 1006);
    const isInventory = url.pathname.startsWith('/api/admin/inventory/');
    const needed =
      req.method === 'GET'
        ? isInventory
          ? 'INVENTORY_READ'
          : 'CATALOG_READ'
        : isInventory
          ? 'INVENTORY_WRITE'
          : url.pathname.includes('/images')
            ? 'CATALOG_IMAGE_MANAGE'
            : /\/(publish|hide)$/.test(url.pathname)
              ? 'CATALOG_PUBLISH'
              : 'CATALOG_WRITE';
    if (!actor.permissions.includes(needed))
      return send(403, undefined, 1007, 'Không có quyền');
    if (url.searchParams.get('keyword') === '__qa_unavailable__')
      return send(503);
    const pageOf = (items) => {
      const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
      const size = Math.min(
        100,
        Math.max(1, Number(url.searchParams.get('size')) || 20),
      );
      return {
        content: items.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: items.length,
        totalPages: Math.ceil(items.length / size),
        first: page === 0,
        last: (page + 1) * size >= items.length,
      };
    };
    const mutate = (result, status = 200) => {
      counts.mutations++;
      send(status, result);
    };
    const conflict = () => send(409, undefined, 409, 'Version đã thay đổi');
    if (url.pathname === '/api/admin/catalog/categories') {
      if (req.method === 'GET') return send(200, categories);
      if (categories.some((c) => c.code === body.code || c.slug === body.slug))
        return conflict();
      const item = {
        ...body,
        id: randomUUID(),
        status: 'ACTIVE',
        version: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      categories.push(item);
      return mutate(item, 201);
    }
    const category = url.pathname.match(
      /^\/api\/admin\/catalog\/categories\/([^/]+)(\/status)?$/,
    );
    if (category) {
      const item = categories.find((c) => c.id === category[1]);
      if (!item) return send(404);
      if (item.version !== body.version) return conflict();
      Object.assign(item, body, {
        version: item.version + 1,
        updatedAt: now(),
      });
      return mutate(item);
    }
    if (url.pathname === '/api/admin/catalog/products') {
      if (req.method === 'GET') {
        const q = (url.searchParams.get('keyword') || '').toLowerCase();
        return send(
          200,
          pageOf(
            products.filter(
              (p) =>
                p.name.toLowerCase().includes(q) &&
                (!url.searchParams.get('status') ||
                  p.status === url.searchParams.get('status')),
            ),
          ),
        );
      }
      const cat = categories.find((c) => c.id === body.categoryId);
      if (!cat) return send(400);
      const item = {
        ...body,
        category: cat,
        id: randomUUID(),
        status: 'DRAFT',
        version: 0,
        variants: [],
        createdAt: now(),
        updatedAt: now(),
      };
      products.unshift(item);
      images.set(item.id, []);
      return mutate(item, 201);
    }
    const productMatch = url.pathname.match(
      /^\/api\/admin\/catalog\/products\/([^/]+)(.*)$/,
    );
    if (productMatch) {
      const item = products.find((p) => p.id === productMatch[1]);
      if (!item) return send(404);
      const suffix = productMatch[2];
      if (!suffix) {
        if (req.method === 'GET') return send(200, item);
        if (item.version !== body.version) return conflict();
        Object.assign(item, body, {
          category: categories.find((c) => c.id === body.categoryId),
          version: item.version + 1,
          updatedAt: now(),
        });
        return mutate(item);
      }
      if (suffix === '/publish' || suffix === '/hide') {
        if (body.version !== item.version) return conflict();
        if (
          suffix === '/publish' &&
          (!item.variants.some((v) => v.status === 'ACTIVE') ||
            item.category.status !== 'ACTIVE')
        )
          return send(
            400,
            undefined,
            400,
            'Chưa có SKU hoạt động hoặc danh mục đang tắt',
          );
        item.status = suffix === '/publish' ? 'PUBLISHED' : 'HIDDEN';
        item.version++;
        return mutate(item);
      }
      if (suffix === '/variants') {
        if (body.productVersion !== item.version) return conflict();
        item.variants.push({
          ...body,
          id: randomUUID(),
          status: 'ACTIVE',
          version: 0,
        });
        item.version++;
        return mutate(item, 201);
      }
      const variant = suffix.match(/^\/variants\/([^/]+)(\/status)?$/);
      if (variant) {
        const v = item.variants.find((v) => v.id === variant[1]);
        if (!v) return send(404);
        if (body.version !== v.version) return conflict();
        Object.assign(v, body, { version: v.version + 1 });
        item.version++;
        return mutate(item);
      }
      const media = images.get(item.id) ?? [];
      if (suffix === '/images') {
        if (req.method === 'GET') return send(200, media);
        media.push({
          id: randomUUID(),
          url: '/api/catalog/qa-images/0',
          originalFilename: 'local-upload.png',
          contentType: 'image/png',
          sizeBytes: 100,
          primary: !media.length,
          displayOrder: media.length,
          version: 0,
        });
        images.set(item.id, media);
        return mutate(media, 201);
      }
      if (suffix === '/images/arrangement') {
        const arranged = body.imageIds?.map((id) =>
          media.find((i) => i.id === id),
        );
        if (
          !arranged ||
          arranged.length !== media.length ||
          arranged.some((i) => !i) ||
          !media.some((i) => i.id === body.primaryImageId)
        )
          return conflict();
        arranged.forEach((i, index) => {
          i.primary = i.id === body.primaryImageId;
          i.displayOrder = index;
        });
        images.set(item.id, arranged);
        return mutate(arranged);
      }
      const image = suffix.match(/^\/images\/([^/]+)$/);
      if (image && req.method === 'DELETE') {
        const result = media.filter((i) => i.id !== image[1]);
        result.forEach((i, index) => {
          i.displayOrder = index;
          if (!result.some((i) => i.primary)) i.primary = index === 0;
        });
        images.set(item.id, result);
        return mutate(result);
      }
    }
    if (url.pathname === '/api/admin/inventory/stock-items') {
      if (req.method === 'GET') {
        const q = (url.searchParams.get('keyword') || '').toLowerCase();
        return send(
          200,
          pageOf(
            stocks.filter(
              (i) =>
                i.sku.toLowerCase().includes(q) &&
                (!url.searchParams.get('locationCode') ||
                  i.locationCode === url.searchParams.get('locationCode')),
            ),
          ),
        );
      }
      const v = products
        .flatMap((p) => p.variants)
        .find((v) => v.sku === body.sku);
      if (!v || body.initialQuantity < 0) return send(400);
      if (
        stocks.some(
          (i) => i.sku === body.sku && i.locationCode === body.locationCode,
        )
      )
        return conflict();
      const result = {
        id: randomUUID(),
        productVariantId: v.id,
        sku: body.sku,
        locationCode: body.locationCode,
        onHand: body.initialQuantity,
        reserved: 0,
        available: body.initialQuantity,
        version: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      stocks.unshift(result);
      movements.set(result.id, []);
      return mutate(result, 201);
    }
    const stockMatch = url.pathname.match(
      /^\/api\/admin\/inventory\/stock-items\/([^/]+)(.*)$/,
    );
    if (stockMatch) {
      const item = stocks.find((i) => i.id === stockMatch[1]);
      if (!item) return send(404);
      if (stockMatch[2] === '/movements')
        return send(200, pageOf(movements.get(item.id) ?? []));
      if (!stockMatch[2] && req.method === 'GET') return send(200, item);
      if (stockMatch[2] === '/adjustments') {
        if (body.version !== item.version) return conflict();
        if (
          !Number.isSafeInteger(body.quantityDelta) ||
          !body.quantityDelta ||
          !body.reason?.trim() ||
          item.onHand + body.quantityDelta < item.reserved
        )
          return send(400);
        item.onHand += body.quantityDelta;
        item.available = item.onHand - item.reserved;
        item.version++;
        movements.get(item.id).unshift({
          id: randomUUID(),
          movementType: 'ADJUSTMENT',
          onHandDelta: body.quantityDelta,
          reservedDelta: 0,
          onHandAfter: item.onHand,
          reservedAfter: item.reserved,
          reason: body.reason,
          referenceId: body.referenceId,
          occurredAt: now(),
        });
        return mutate(item);
      }
    }
    return send(404);
  });
  return server;
}
if (
  !process.env.NODE_TEST_CONTEXT &&
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  adminPreviewServer().listen(5192, '127.0.0.1', () =>
    console.log(
      'LOCAL ADMIN QA :5192 — qa-admin/qa-staff/qa-reader/qa-inventory/qa-user; password PreviewOnly123!; memory only, no production writes',
    ),
  );
}
