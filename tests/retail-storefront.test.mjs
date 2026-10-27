import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import ts from 'typescript';
import { compile, moduleUrl } from './loadTypeScript.mjs';

const icon = moduleUrl("export const Icon = () => null;");
const image = moduleUrl("export const ProductImage = () => null;");
const saved = moduleUrl("export const useSaved = () => ({saved: [], toggle() {}});");
const price = moduleUrl(compile('../src/lib/catalogListing.ts'));
const format = moduleUrl(compile('../src/lib/format.ts'));
async function component(path) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX},
  }).outputText.replace(/from ['"]([^'"]+)['"]/g, (match, name) => {
    const modules = {'./Icon': icon, './ProductImage': image, '@/lib/saved': saved,
      '@/lib/catalogListing': price, '@/lib/format': format};
    return `from '${modules[name] ?? import.meta.resolve(name)}'`;
  });
  return import(moduleUrl(compiled));
}
const { RetailHero } = await component('../src/components/RetailHero.tsx');
const { ProductCard } = await component('../src/components/ProductCard.tsx');
const render = (view) => renderToStaticMarkup(createElement(StaticRouter, null, view));
const product = (variants) => ({id: 'catalog-id', name: 'DEMO — Audio', category: {name: 'DEMO'}, variants});

test('campaign has one heading, an actual catalog CTA and an identified editorial image', () => {
  const html = render(createElement(RetailHero));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /href="\/products"/);
  assert.match(html, /không phải ảnh sản phẩm đang bán/);
  assert.match(html, /fetchPriority="high"/);
  assert.ok(!html.includes('coolmate'));
});
test('home card uses real minimum of same-currency SKUs and retains DEMO disclosure', () => {
  const html = render(createElement(ProductCard, {product: product([
    {price: '250000', currency: 'VND'}, {price: '100000', currency: 'VND'},
  ])}));
  assert.match(html, /DEMO — Audio/);
  assert.match(html, /100.000/);
  assert.match(html, /Từ/);
  assert.match(html, /2.*phiên bản/);
  assert.match(html, /href="\/products\/catalog-id"/);
  assert.ok(!html.includes('250.000'));
});
test('home card does not compare mixed currencies or fabricate availability', () => {
  const mixed = render(createElement(ProductCard, {product: product([
    {price: '10', currency: 'USD'}, {price: '100000', currency: 'VND'},
  ])}));
  assert.match(mixed, /Xem giá từng phiên bản/);
  assert.ok(!mixed.includes('100.000'));
  const empty = render(createElement(ProductCard, {product: product([])}));
  assert.match(empty, /Chưa mở bán/);
  assert.ok(!empty.includes('Từ '));
});
