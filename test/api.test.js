'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { enrich, cache } = require('../src/llm');

const body = { city: 'Delhi', aqi: 280, commute: 'car', heating: 'wood_coal', cooking: 'lpg', children: true };

async function withServer(opts, fn) {
  const server = createApp(opts).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}
const post = (base, payload, raw) => fetch(base + '/api/plan', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: raw ?? JSON.stringify(payload),
});

test('POST /api/plan returns a plan with the AI summary when available', () =>
  withServer({ summarize: async () => 'Short summary.' }, async (base) => {
    const res = await post(base, body);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.summary, 'Short summary.');
    assert.equal(json.summarySource, 'ai');
    assert.ok(json.actions.length > 3);
  }));

test('falls back to rule-based plan when AI is unavailable', () =>
  withServer({ summarize: async () => null }, async (base) => {
    const json = await (await post(base, body)).json();
    assert.equal(json.summary, null);
    assert.equal(json.summarySource, 'none');
    assert.ok(json.actions.length > 0);
  }));

test('rejects invalid input, bad JSON and oversized bodies', () =>
  withServer({ summarize: async () => null }, async (base) => {
    assert.equal((await post(base, { ...body, aqi: -1 })).status, 400);
    assert.equal((await post(base, null, '{bad')).status, 400);
    assert.equal((await post(base, { ...body, notes: 'x'.repeat(9000) })).status, 413);
  }));

test('unexpected errors return a safe 500 without leaking details', () =>
  withServer({ summarize: async () => { throw new Error('secret db password'); } }, async (base) => {
    const orig = console.error; console.error = () => {};
    try {
      const res = await post(base, body);
      const text = await res.text();
      assert.equal(res.status, 500);
      assert.doesNotMatch(text, /secret/);
    } finally { console.error = orig; }
  }));

test('sets security headers and hides framework', () =>
  withServer({}, async (base) => {
    const res = await fetch(base + '/api/health');
    assert.ok(res.headers.get('content-security-policy'));
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.doesNotMatch(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  }));

test('compresses static assets', () =>
  withServer({}, async (base) => {
    const res = await fetch(base + '/style.css', { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(res.headers.get('content-encoding'), 'gzip');
    assert.ok(res.headers.get('cache-control').includes('max-age'));
  }));

test('serves the accessible front page', () =>
  withServer({}, async (base) => {
    const html = await (await fetch(base + '/')).text();
    assert.match(html, /<html lang="en">/);
    assert.match(html, /class="skip"/);
  }));

test('llm: no key returns null; failures return null; success is cached', async () => {
  assert.equal(await enrich(body, { category: { label: 'x' }, actions: [] }, { env: {} }), null);
  const env = { ANTHROPIC_API_KEY: 'k' };
  const plan = { category: { label: 'Unhealthy' }, actions: [{ title: 'a' }] };
  assert.equal(await enrich(body, plan, { env, fetchImpl: async () => { throw new Error('net'); } }), null);
  assert.equal(await enrich(body, plan, { env, fetchImpl: async () => ({ ok: false }) }), null);
  cache.clear();
  let calls = 0;
  const fetchImpl = async () => { calls++; return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Hi' }] }) }; };
  assert.equal(await enrich(body, plan, { env, fetchImpl }), 'Hi');
  assert.equal(await enrich(body, plan, { env, fetchImpl }), 'Hi');
  assert.equal(calls, 1);
});
