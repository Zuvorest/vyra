'use strict';

const BASE = 'http://localhost:3000';
let pass = 0, fail = 0;

async function req(method, path, opts = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, json };
}

function check(name, cond, extra) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}`, extra ? `— ${extra}` : ''); }
}

(async () => {
  console.log(`\n🧪 VYRA smoke test → ${BASE}\n`);

  const h = await req('GET', '/api/health');
  check('Health 200', h.status === 200);
  check('Health db.ok', h.json?.data?.db?.ok === true);

  const protectedPaths = ['/api/user/me', '/api/credit', '/api/balance', '/api/keys', '/api/admin/users'];
  for (const p of protectedPaths) {
    const r = await req('GET', p);
    check(`GET ${p} tanpa auth → 401`, r.status === 401, `got ${r.status}`);
  }

  const bad = await req('POST', '/api/auth/register', { body: { email: 'x', password: '1' } });
  check('Register invalid → 400', bad.status === 400);

  const nf = await req('GET', '/api/tidak-ada');
  check('Route 404', nf.status === 404);

  const m = await req('GET', '/api/models');
  check('GET /api/models → 200', m.status === 200 && Array.isArray(m.json?.data?.models));

  const k = await req('POST', '/api/v1/jobs', {
    headers: { Authorization: 'Bearer zy_live_invalid_should_fail' },
    body: { model_id: 'gpt-4o', input: { prompt: 'test' } },
  });
  check('API key invalid → 401', k.status === 401, `got ${k.status}`);

  const wh = await req('POST', '/api/payment/webhook', {
    body: { provider_ref: 'xyz-nonexistent', status: 'success' },
  });
  check('Webhook ref tidak ada → 200/404 aman', wh.status === 200 || wh.status === 404, `got ${wh.status}`);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
