'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[^>]*><\/script>/, '');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 10));

function boot(fetchImpl) {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  dom.window.fetch = fetchImpl;
  dom.window.eval(appJs);
  return dom.window;
}
const submit = (w) => w.document.getElementById('plan-form')
  .dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
const fill = (w, city, aqi) => {
  w.document.getElementById('city').value = city;
  w.document.getElementById('aqi').value = aqi;
};

test('shows inline errors and does not call the API on invalid input', async () => {
  let called = false;
  const w = boot(async () => { called = true; });
  fill(w, '', '999');
  submit(w); await tick();
  assert.equal(called, false);
  assert.match(w.document.getElementById('city-err').textContent, /city/i);
  assert.equal(w.document.getElementById('aqi').getAttribute('aria-invalid'), 'true');
  assert.equal(w.document.activeElement.id, 'city');
});

test('renders the plan as text, never as HTML', async () => {
  const plan = {
    category: { id: 'unhealthy', label: 'Unhealthy', advice: 'Cut back.' }, sensitive: false, summary: 'AI text',
    actions: [{ area: 'indoor', title: '<img src=x onerror=alert(1)>', why: 'w', impact: { level: 'high', text: 't' }, effort: 'low' }],
    disclaimer: 'd',
  };
  const w = boot(async () => ({ ok: true, status: 200, json: async () => plan }));
  fill(w, 'Delhi', '180');
  submit(w); await tick();
  const d = w.document;
  assert.equal(d.getElementById('results').hidden, false);
  assert.equal(d.querySelectorAll('#actions li').length, 1);
  assert.equal(d.querySelector('#actions img'), null);
  assert.match(d.querySelector('#actions h3').textContent, /<img/);
  assert.equal(d.getElementById('summary-note').hidden, false);
  assert.equal(d.getElementById('band').className, 'band unhealthy');
  assert.equal(d.activeElement.id, 'results-title');
});

test('reports network failure and re-enables the button', async () => {
  const w = boot(async () => { throw new Error('offline'); });
  fill(w, 'Delhi', '180');
  submit(w); await tick();
  assert.match(w.document.getElementById('form-status').textContent, /Could not reach/);
  assert.equal(w.document.getElementById('submit').disabled, false);
});

test('rate-limit response gives a clear message', async () => {
  const w = boot(async () => ({ ok: false, status: 429, json: async () => ({ errors: {} }) }));
  fill(w, 'Delhi', '180');
  submit(w); await tick();
  assert.match(w.document.getElementById('form-status').textContent, /Too many requests/);
});
