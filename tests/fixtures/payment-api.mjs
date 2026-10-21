// Manual browser QA ONLY. No database, real users, gateway calls or external bind.
// Start separately from Vite; never import this fixture into src/ or the bundle.
import http from 'node:http';

const port = 4192;
const uiOrigin = 'http://127.0.0.1:5176';
const id = '53f7506a-4bd6-4ebe-8f92-dbf5d3324101';
const attemptId = '62f7506a-4bd6-4ebe-8f92-dbf5d3324101';
const scenarios = ['ready', 'confirming', 'paid', 'missing', 'invalid', 'failed',
  'expired', 'order-cancelled', 'network-error', 'unauthorized', 'unknown', 'unsupported'];
let scenario = 'ready';
let calls = 0;
let firstCall = null;
let lastCall = null;
const user = { id: 'web-pay-qa', username: 'webpayqa', email: 'qa@example.test',
  firstName: 'Khách', lastName: 'QA', status: 'ACTIVE', emailVerified: true,
  roles: ['USER'], createdAt: '2026-10-19T00:00:00Z' };
const auth = () => ({ authenticated: true, tokenType: 'Bearer',
  accessToken: 'local-fixture-access', refreshToken: 'local-fixture-refresh',
  accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString() });
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const json = (result, status = 200, code = 1000) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ code, message: status === 200 ? 'Success' : 'QA simulated error', result }));
  };
  if (url.pathname === '/__qa/mobile' || url.pathname === '/__qa/landscape') {
    const landscape = url.pathname.endsWith('/landscape');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(`<!doctype html><html lang="en"><title>QA responsive frame</title>
      <h1>FAKE API — ${landscape ? '812 × 375 landscape' : '375 × 812 mobile'} CSS viewport</h1>
      <p>Responsive frame only, not physical-device or gateway certification.</p>
      <iframe title="Shop UI responsive QA" width="${landscape ? 812 : 375}" height="${landscape ? 375 : 812}"
        style="border:1px solid #ccc" src="${uiOrigin}/orders/${id}"></iframe></html>`);
  }
  if (url.pathname === '/__qa') {
    const next = url.searchParams.get('scenario');
    if (scenarios.includes(next)) { scenario = next; calls = 0; firstCall = null; lastCall = null; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(`<!doctype html><html lang="en"><title>WEB-PAY-01 — local API fixture</title>
      <meta name="viewport" content="width=device-width,initial-scale=1"><body>
      <h1>WEB-PAY-01: FAKE API — NOT A PAYMENT</h1>
      <p>Loopback only. No MySQL, no VNPay, no real merchant. Login: webpayqa / local-fixture-only.</p>
      <p>Scenario: <strong>${scenario}</strong>; payment GET count: <strong>${calls}</strong></p>
      <p>First GET: ${firstCall ?? 'none'}; last GET: ${lastCall ?? 'none'}</p>
      <form><label>Scenario <select name="scenario">${scenarios.map((s) => `<option ${s === scenario ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      <button>Apply scenario and reset count</button></form>
      <p><a href="/__qa">Refresh counts only</a></p>
      <p><a href="${uiOrigin}/orders/${id}?vnp_ResponseCode=00&status=PAID">Open order with spoofed success flags</a></p>
      <p><a href="/__qa/mobile">Mobile 375 × 812</a> · <a href="/__qa/landscape">Landscape 812 × 375</a></p>
      </body></html>`);
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/token') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 4096) return json(null, 400, 1006); }
    try {
      const login = JSON.parse(body);
      if (login.username === 'webpayqa' && login.password === 'local-fixture-only') return json(auth());
    } catch { /* invalid QA login */ }
    return json(null, 401, 1006);
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') return json(null);
  // Keep the paged catalog contract even though this fixture has no products.
  // Returning [] for a Page response would crash the PLP and conceal routing QA.
  if (url.pathname === '/api/catalog/products') return json({
    content: [], page: Number(url.searchParams.get('page') || 0),
    size: Number(url.searchParams.get('size') || 12), totalElements: 0,
    totalPages: 0, first: Number(url.searchParams.get('page') || 0) === 0, last: true,
  });
  if (url.pathname === '/api/catalog/categories') return json([]);
  if (req.headers.authorization !== 'Bearer local-fixture-access') return json(null, 401, 1006);
  if (url.pathname === '/api/auth/my-info') return json(user);
  if (url.pathname === '/api/cart') return json({ id: 'qa-cart', items: [], distinctItemCount: 0, totalQuantity: 0, version: 0 });
  if (url.pathname === `/api/orders/${id}/payment` && req.method === 'GET') {
    calls += 1;
    lastCall = new Date().toISOString();
    firstCall ??= lastCall;
    if (scenario === 'missing') return json(null, 404, 1407);
    if (scenario === 'network-error') return json(null, 503, 1500);
    if (scenario === 'unauthorized') return json(null, 401, 1006);
    const status = { confirming: 'SUCCEEDED', paid: 'SUCCEEDED', failed: 'FAILED',
      expired: 'EXPIRED', unknown: 'FUTURE_STATUS' }[scenario] ?? 'REQUIRES_ACTION';
    return json({ paymentAttemptId: attemptId,
      providerCode: scenario === 'unsupported' ? 'FAKE' : 'VNPAY', status,
      actionUrl: `https://${scenario === 'invalid' ? 'api.example.test.evil.test' : 'api.example.test'}/api/payments/checkout/vnpay/start?attempt=${attemptId}&token=${'a'.repeat(128)}` });
  }
  if (url.pathname === `/api/orders/${id}` && req.method === 'GET') {
    return json({ id, status: scenario === 'paid' ? 'PAID' : scenario === 'order-cancelled' ? 'CANCELLED' : 'PENDING',
      version: 1, createdAt: '2026-10-19T03:00:00Z', currency: 'VND', subtotal: '1690000',
      discount: '0', tax: '0', grandTotal: '1690000', items: [{ id: 'qa-line',
        productVariantId: 'qa-variant', lineNumber: 1, sku: 'QA-HEADPHONE',
        productName: 'Tai nghe QA — dữ liệu kiểm thử', quantity: 1, unitPrice: '1690000',
        subtotal: '1690000', discount: '0', tax: '0', total: '1690000', currency: 'VND' }] });
  }
  return json(null, 404, 1310);
});
server.listen(port, '127.0.0.1', () => console.log(`QA fixture: http://127.0.0.1:${port}/__qa (FAKE API ONLY)`));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
