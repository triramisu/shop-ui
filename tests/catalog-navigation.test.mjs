import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import ts from 'typescript';
import { compile, moduleUrl } from './loadTypeScript.mjs';

const listingModule = moduleUrl(compile('../src/lib/catalogListing.ts'));
const source = ts.transpileModule(
  readFileSync(new URL('../src/components/CatalogNavLink.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } },
).outputText
  .replace(/from ["']react\/jsx-runtime["']/, `from '${import.meta.resolve('react/jsx-runtime')}'`)
  .replace(/from ["']react-router-dom["']/, `from '${import.meta.resolve('react-router-dom')}'`)
  .replace(/from ["']@\/lib\/catalogListing["']/, `from '${listingModule}'`);
const { CatalogNavLink } = await import(moduleUrl(source));
const wireless = '291ce50a-ca25-4db1-9de6-c9db2d2781aa';
const studio = '335ddde5-d426-4d73-90d0-316ad9743da8';

function navigation(location) {
  return renderToStaticMarkup(createElement(StaticRouter, { location },
    createElement('nav', null,
      createElement(CatalogNavLink, null, 'All'),
      createElement(CatalogNavLink, { categoryId: wireless }, 'Wireless'),
      createElement(CatalogNavLink, { categoryId: studio }, 'Studio'),
    ),
  ));
}

function activeLabels(html) {
  return [...html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)]
    .filter(([, attributes]) => attributes.includes('class="active"'))
    .map(([, attributes, label]) => {
      assert.ok(attributes.includes('aria-current="page"'));
      return label;
    });
}

test('all products is the only active link on the unfiltered listing', () => {
  for (const location of ['/products', '/products/', '/products?q=headphones&sort=NAME:ASC&page=2&view=list']) {
    assert.deepEqual(activeLabels(navigation(location)), ['All']);
  }
});

test('selected category replaces all-products active styling and aria-current', () => {
  const html = navigation(`/products?category=${wireless}`);
  assert.deepEqual(activeLabels(html), ['Wireless']);
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(html, /<a href="\/products"[^>]*>All<\/a>/);
  assert.ok(!html.includes('<a class="active" aria-current="page" href="/products"'));
});

test('query-only category transitions and return to all derive from the new URL', () => {
  for (const [location, expected] of [
    [`/products?category=${wireless}`, 'Wireless'],
    [`/products?category=${studio}`, 'Studio'],
    ['/products', 'All'],
    [`/products?category=${wireless}`, 'Wireless'],
  ]) {
    assert.deepEqual(activeLabels(navigation(location)), [expected]);
  }
});

test('category parsing stays consistent with PLP for case, encoding and query order', () => {
  for (const location of [
    `/products/?category=${wireless.toUpperCase()}`,
    `/products?q=wireless&view=list&category=${wireless}&sort=NAME:DESC&page=2#listing-results`,
    `/products?category=${wireless.replaceAll('-', '%2D')}`,
  ]) {
    assert.deepEqual(activeLabels(navigation(location)), ['Wireless']);
  }
});

test('empty and invalid category fall back to all as the actual listing parser does', () => {
  for (const value of ['', 'bad', 'null', 'undefined', 'not-a-uuid']) {
    assert.deepEqual(activeLabels(navigation(`/products?category=${value}`)), ['All']);
  }
});

test('an unknown valid category never falsely highlights all or another category', () => {
  assert.deepEqual(activeLabels(navigation('/products?category=12345678-abcd-1234-abcd-123456789012')), []);
});

test('non-listing routes and product details have no active catalog link', () => {
  for (const path of ['/', '/saved', '/login', `/products/${wireless}`, '/products-other']) {
    const html = navigation(`${path}?category=${wireless}`);
    assert.deepEqual(activeLabels(html), []);
    assert.ok(!html.includes('aria-current='));
  }
});

test('links keep actual navigation targets and do not depend on click-only state', () => {
  const html = navigation('/products');
  assert.ok(html.includes(`href="/products?category=${wireless}"`));
  assert.ok(html.includes(`href="/products?category=${studio}"`));
  assert.ok(html.includes('href="/products"'));
  const navbar = readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');
  assert.equal((navbar.match(/<CatalogNavLink/g) ?? []).length, 4, 'desktop and mobile both use the shared link');
  assert.ok(!navbar.includes('<NavLink to="/products"'));
});
