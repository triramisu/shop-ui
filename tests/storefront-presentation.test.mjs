import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, moduleUrl } from './loadTypeScript.mjs';
import { storefrontPreviewServer } from './fixtures/storefront-preview.mjs';

const { categoryLabel } = await import(
  moduleUrl(compile('../src/components/catalog/presentation.ts'))
);
test('navigation abbreviates category copy without erasing meaningful category names', () => {
  assert.equal(categoryLabel('DEMO — Tai nghe không dây'), 'Không dây');
  assert.equal(categoryLabel('DEMO – Tai nghe studio'), 'Studio');
  assert.equal(categoryLabel('Loa nghe nhạc'), 'Loa nghe nhạc');
  assert.equal(categoryLabel('Demo Studio'), 'Demo Studio');
  assert.equal(categoryLabel('DEMO'), 'DEMO');
});
test('opt-in fixture has real filter/detail contracts and rejects all writes', async () => {
  const server = storefrontPreviewServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${base}/api/catalog/products?size=8`);
    const { result: page } = await res.json();
    assert.equal(page.content.length, 8);
    assert.equal(page.totalElements, 12);
    assert.ok(page.content.every((product) => product.name.startsWith('DEMO')));
    const category = page.content[0].category.id;
    const { result: filtered } = await (
      await fetch(
        `${base}/api/catalog/products?categoryId=${category}&sortBy=NAME&direction=ASC`,
      )
    ).json();
    assert.equal(filtered.content.length, 4);
    assert.ok(
      filtered.content.every((product) => product.category.id === category),
    );
    const { result: detail } = await (
      await fetch(`${base}/api/catalog/products/${page.content[0].id}`)
    ).json();
    assert.equal(detail.variants.length, 2);
    assert.equal(
      (await fetch(`${base}/api/cart`, { method: 'POST', body: '{}' })).status,
      405,
    );
    assert.equal(
      (await fetch(`${base}/api/auth/token`, { method: 'POST', body: '{}' }))
        .status,
      405,
    );
    assert.equal((await fetch(`${base}/api/catalog/qa-images/0`)).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
