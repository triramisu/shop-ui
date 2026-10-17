import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, moduleUrl } from './loadTypeScript.mjs';

const { readListingState, patchListingParams, listingPageItems, listingPrice } =
  await import(moduleUrl(compile('../src/lib/catalogListing.ts')));
const categoryId = '12345678-abcd-1234-abcd-123456789012';
const defaults = {
  keyword: '',
  categoryId: '',
  sort: 'CREATED_AT:DESC',
  page: 0,
  view: 'grid',
};

test('listing defaults reject unsupported sort, malformed category and view', () => {
  assert.deepEqual(readListingState(new URLSearchParams()), defaults);
  assert.deepEqual(
    readListingState(
      new URLSearchParams('sort=PRICE:ASC&category=bad&view=table'),
    ),
    defaults,
  );
});
test('listing accepts API-supported criteria and canonicalizes category IDs', () => {
  const params = new URLSearchParams({
    q: '  tai nghe  ',
    category: categoryId.toUpperCase(),
    sort: 'NAME:ASC',
    page: '2',
    view: 'list',
  });
  assert.deepEqual(readListingState(params), {
    keyword: 'tai nghe',
    categoryId,
    sort: 'NAME:ASC',
    page: 2,
    view: 'list',
  });
});
test('listing bounds pagination to safe nonnegative integers', () => {
  for (const page of [
    '-1',
    '1.5',
    '1e3',
    'Infinity',
    'NaN',
    '9007199254740992',
    '10001',
  ]) {
    assert.equal(readListingState(new URLSearchParams({ page })).page, 0, page);
  }
  assert.equal(readListingState(new URLSearchParams('page=10000')).page, 10000);
  assert.equal(readListingState(new URLSearchParams('page=0002')).page, 2);
});
test('listing caps keywords at the API length limit', () => {
  assert.equal(
    readListingState(new URLSearchParams({ q: ` ${'a'.repeat(110)} ` })).keyword
      .length,
    100,
  );
});
test('changing each filter or sort resets the page without mutating the URL object', () => {
  const current = new URLSearchParams('page=4&view=list&campaign=retained');
  for (const patch of [
    { keyword: 'loa' },
    { categoryId },
    { sort: 'NAME:DESC' },
  ]) {
    const next = patchListingParams(current, patch);
    assert.equal(next.has('page'), false);
    assert.equal(next.get('view'), 'list');
    assert.equal(next.get('campaign'), 'retained');
  }
  assert.equal(current.get('page'), '4');
});
test('presentation changes retain page; pagination retains filters', () => {
  const current = new URLSearchParams({
    q: 'loa',
    category: categoryId,
    page: '4',
  });
  assert.equal(patchListingParams(current, { view: 'list' }).get('page'), '4');
  const next = patchListingParams(current, { page: 5 });
  assert.equal(next.get('page'), '5');
  assert.equal(next.get('q'), 'loa');
  assert.equal(next.get('category'), categoryId);
});
test('mobile filter draft commits atomically; reset preserves sort and view', () => {
  const current = new URLSearchParams({
    q: 'cũ',
    category: categoryId,
    page: '3',
    sort: 'NAME:ASC',
    view: 'list',
  });
  const applied = patchListingParams(current, {
    keyword: 'mới',
    categoryId: '',
  });
  assert.equal(applied.get('q'), 'mới');
  assert.equal(applied.has('category'), false);
  assert.equal(applied.has('page'), false);
  const reset = patchListingParams(applied, { keyword: '', categoryId: '' });
  assert.equal(reset.get('sort'), 'NAME:ASC');
  assert.equal(reset.get('view'), 'list');
  assert.equal(reset.has('q'), false);
});
test('default values serialize without noisy query parameters', () => {
  const current = new URLSearchParams('page=3&sort=NAME:ASC&view=list&q=loa');
  assert.equal(
    patchListingParams(current, {
      keyword: '',
      page: 0,
      sort: 'CREATED_AT:DESC',
      view: 'grid',
    }).toString(),
    '',
  );
});
test('pagination includes first/current neighbors/last with stable gaps', () => {
  assert.deepEqual(listingPageItems(0, 0), []);
  assert.deepEqual(listingPageItems(0, 1), [0]);
  assert.deepEqual(listingPageItems(0, 4), [0, 1, 'gap', 3]);
  assert.deepEqual(listingPageItems(4, 10), [0, 'gap', 3, 4, 5, 'gap', 9]);
  assert.deepEqual(listingPageItems(9, 10), [0, 'gap', 8, 9]);
  assert.deepEqual(listingPageItems(99, 3), [0, 1, 2]);
});
test('pagination handles invalid totals and never produces an unsupported page', () => {
  assert.deepEqual(listingPageItems(0, NaN), []);
  assert.deepEqual(listingPageItems(0, -1), []);
  assert.deepEqual(listingPageItems(NaN, 2), [0, 1]);
  assert.equal(
    Math.max(
      ...listingPageItems(10000, 50000).filter(
        (item) => typeof item === 'number',
      ),
    ),
    10000,
  );
});
const variant = (price, currency = 'VND') => ({
  id: 'sku-1',
  sku: 'SKU',
  name: 'Phiên bản',
  price,
  currency,
});
test('price displays actual minimum and distinguishes uniform variant pricing', () => {
  assert.deepEqual(listingPrice([variant('199000'), variant('299000')]), {
    amount: '199000',
    currency: 'VND',
    from: true,
  });
  assert.deepEqual(listingPrice([variant('199000'), variant('199000')]), {
    amount: '199000',
    currency: 'VND',
    from: false,
  });
  assert.deepEqual(listingPrice([variant('0')]), {
    amount: '0',
    currency: 'VND',
    from: false,
  });
});
test('price never invents an amount for missing, invalid or mixed-currency data', () => {
  assert.equal(listingPrice([]), null);
  assert.equal(
    listingPrice([variant('100', 'USD'), variant('100000', 'VND')]),
    null,
  );
  for (const price of ['', ' ', '-1', 'NaN', 'Infinity', null, undefined]) {
    assert.equal(listingPrice([variant(price)]), null, String(price));
  }
  assert.equal(listingPrice([variant('100', '')]), null);
});
