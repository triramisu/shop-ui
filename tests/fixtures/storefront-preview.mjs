// Opt-in, loopback-only visual QA fixture. Not a production data fallback.
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const previewCategories = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'DEMO — Tai nghe không dây',
    slug: 'demo-wireless',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'DEMO — Tai nghe studio',
    slug: 'demo-studio',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'DEMO — Tai nghe du lịch',
    slug: 'demo-travel',
  },
];
const names = [
  'Air One',
  'Studio No.01',
  'Daily Sound',
  'Quiet Hours',
  'Air Mini',
  'Studio No.02',
  'Soft Sound',
  'Weekend',
  'Air Pocket',
  'Studio No.03',
  'Open Space',
  'After Hours',
];
export const previewProducts = names.map((name, index) => ({
  id: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name: `DEMO — ${name}`,
  slug: `preview-${index + 1}`,
  category: previewCategories[index % 3],
  description:
    'Dữ liệu minh họa local để kiểm tra giao diện. Không đại diện thông số hoặc sản phẩm đang bán.',
  variants: ['Đen', 'Kem'].map((color, variant) => ({
    id: `b0000000-0000-4000-8000-${String(index * 2 + variant + 1).padStart(12, '0')}`,
    sku: `QA-ONLY-${index + 1}-${variant + 1}`,
    name: color,
    price: String(790000 + index * 150000 + variant * 50000),
    currency: 'VND',
  })),
}));

export function storefrontPreviewServer({
  port = 5191,
  imageRoot = process.env.SHOP_QA_IMAGE_ROOT,
} = {}) {
  const fallback = fileURLToPath(
    new URL('../../public/images/audio-editorial.png', import.meta.url),
  );
  const imageNames = [
    'headphones 1.png',
    'earbuds 1.png',
    'headphones 2.png',
    'headphones 3.png',
    'earbuds 2.png',
    'earbuds 3.png',
  ];
  return createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const send = (status, result, code = 1000) => {
      response.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-shop-preview': 'local-fixture-only',
      });
      response.end(JSON.stringify({ code, result }));
    };
    if (request.method !== 'GET') return send(405, undefined, 1007);
    if (url.pathname === '/api/catalog/categories')
      return send(200, previewCategories);
    if (url.pathname === '/api/catalog/products') {
      const keyword = (url.searchParams.get('keyword') ?? '').toLocaleLowerCase(
        'vi',
      );
      if (keyword === '__qa_unavailable__') return send(503, undefined, 1500);
      const category = url.searchParams.get('categoryId');
      const page = Math.max(0, Number(url.searchParams.get('page') ?? 0));
      const size = Math.max(
        1,
        Math.min(100, Number(url.searchParams.get('size') ?? 12)),
      );
      let rows = previewProducts.filter(
        (product) =>
          (!category || product.category.id === category) &&
          product.name.toLocaleLowerCase('vi').includes(keyword),
      );
      if (url.searchParams.get('sortBy') === 'NAME')
        rows.sort((a, b) => a.name.localeCompare(b.name));
      if (url.searchParams.get('direction') === 'DESC') rows.reverse();
      return send(200, {
        content: rows.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: rows.length,
        totalPages: Math.ceil(rows.length / size),
        first: page === 0,
        last: (page + 1) * size >= rows.length,
      });
    }
    const imageMatch = /^\/api\/catalog\/qa-images\/(\d+)$/.exec(url.pathname);
    if (imageMatch) {
      const image = imageRoot
        ? join(imageRoot, imageNames[Number(imageMatch[1]) % imageNames.length])
        : fallback;
      response.writeHead(200, {
        'content-type': 'image/png',
        'cache-control': 'no-store',
      });
      return createReadStream(existsSync(image) ? image : fallback).pipe(
        response,
      );
    }
    const match = /^\/api\/catalog\/products\/([^/]+)(\/images)?$/.exec(
      url.pathname,
    );
    if (match) {
      const index = previewProducts.findIndex(
        (product) => product.id === match[1],
      );
      if (index === -1) return send(404, undefined, 1007);
      if (match[2])
        return send(200, [
          {
            id: `qa-image-${index}`,
            url: `/api/catalog/qa-images/${index}`,
            contentType: 'image/png',
            primary: true,
            displayOrder: 0,
          },
        ]);
      return send(200, previewProducts[index]);
    }
    return send(401, undefined, 1006);
  });
}

if (
  !process.env.NODE_TEST_CONTEXT &&
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  storefrontPreviewServer().listen(5191, '127.0.0.1', () =>
    console.log(
      'LOCAL FIXTURE ONLY: http://127.0.0.1:5191 — GET catalog, no login/payment/writes',
    ),
  );
}
