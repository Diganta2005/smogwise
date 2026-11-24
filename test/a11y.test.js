'use strict';
// Automated WCAG 2.1 A/AA checks with axe-core. Colour contrast is verified separately
// (jsdom cannot compute rendered colours); see README for the measured ratios.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script[^>]*><\/script>/, '');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

async function audit(window) {
  window.eval(axeSource);
  const result = await window.axe.run(window.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: true } },
  });
  return Array.from(result.violations, (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`);
}

test('form page has no axe violations', async () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const found = await audit(dom.window);
  assert.equal(found.length, 0, found.join('; '));
});

test('results view has no axe violations', async () => {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const w = dom.window;
  const plan = {
    category: { id: 'unhealthy', label: 'Unhealthy', advice: 'Cut back.' }, sensitive: true, summary: 'Hello.',
    actions: [{ area: 'indoor', title: 'T', why: 'W', impact: { level: 'high', text: 'I' }, effort: 'low' }], disclaimer: 'D',
  };
  w.fetch = async () => ({ ok: true, status: 200, json: async () => plan });
  w.eval(appJs);
  w.document.getElementById('city').value = 'Delhi';
  w.document.getElementById('aqi').value = '180';
  w.document.getElementById('plan-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(w.document.getElementById('results').hidden, false);
  const found = await audit(w);
  assert.equal(found.length, 0, found.join('; '));
});
