'use strict';
(function () {
  const form = document.getElementById('plan-form');
  const status = document.getElementById('form-status');
  const submit = document.getElementById('submit');
  const results = document.getElementById('results');
  const AREA = { routine: 'Daily routine', indoor: 'Indoor air', alternative: 'Sustainable swap', health: 'Health', community: 'Community' };
  const LEVEL = { high: 'High impact', medium: 'Medium impact', low: 'Small impact' };

  function el(tag, text, cls) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text; // textContent only: no HTML injection
    if (cls) node.className = cls;
    return node;
  }

  function readForm() {
    const f = new FormData(form);
    const on = (k) => f.get(k) === 'on';
    const aqiRaw = String(f.get('aqi')).trim();
    return {
      city: String(f.get('city')).trim(),
      aqi: /^\d+$/.test(aqiRaw) ? Number(aqiRaw) : NaN,
      children: on('children'), elderly: on('elderly'), respiratory: on('respiratory'), hasPurifier: on('hasPurifier'),
      commute: f.get('commute'), heating: f.get('heating'), cooking: f.get('cooking'),
      notes: String(f.get('notes')).trim(),
    };
  }

  function showErrors(errors) {
    for (const key of ['city', 'aqi']) {
      const input = document.getElementById(key);
      const msg = document.getElementById(key + '-err');
      msg.textContent = errors[key] || '';
      input.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
    }
    const first = ['city', 'aqi'].find((k) => errors[k]);
    if (first) document.getElementById(first).focus();
  }

  function clientErrors(d) {
    const e = {};
    if (d.city.length < 2) e.city = 'Enter your city.';
    if (!Number.isInteger(d.aqi) || d.aqi < 0 || d.aqi > 500) e.aqi = 'Enter a whole number from 0 to 500.';
    return e;
  }

  function render(plan) {
    const band = document.getElementById('band');
    band.className = 'band ' + plan.category.id;
    band.textContent = plan.category.label + ': ' + plan.category.advice;
    const summary = document.getElementById('summary');
    summary.textContent = plan.summary || '';
    summary.hidden = !plan.summary;
    document.getElementById('summary-note').hidden = !plan.summary;
    const list = document.getElementById('actions');
    list.replaceChildren();
    for (const a of plan.actions) {
      const li = el('li');
      li.append(el('h3', a.title), el('p', 'Why: ' + a.why), el('p', 'What it changes: ' + a.impact.text),
        el('p', AREA[a.area] + ' | ' + LEVEL[a.impact.level] + ' | Effort: ' + a.effort, 'meta'));
      list.append(li);
    }
    document.getElementById('disclaimer').textContent = plan.disclaimer;
    results.hidden = false;
    document.getElementById('results-title').focus();
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = readForm();
    const errors = clientErrors(data);
    showErrors(errors);
    if (Object.keys(errors).length) return;
    submit.disabled = true;
    status.textContent = 'Building your plan...';
    try {
      const res = await fetch('/api/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) {
        showErrors(body.errors || {});
        status.textContent = res.status === 429 ? 'Too many requests. Wait a minute and try again.' : 'Check the highlighted fields.';
        return;
      }
      status.textContent = 'Plan ready.';
      render(body);
    } catch {
      status.textContent = 'Could not reach the server. Check your connection and try again.';
    } finally {
      submit.disabled = false;
    }
  });
})();
