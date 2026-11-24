'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan, categoryFor } = require('../src/advice');

const base = { city: 'Delhi', aqi: 320, commute: 'car', heating: 'wood_coal', cooking: 'biomass',
  children: true, elderly: false, respiratory: false, hasPurifier: false, notes: '' };

test('category boundaries', () => {
  assert.equal(categoryFor(50).id, 'good');
  assert.equal(categoryFor(51).id, 'moderate');
  assert.equal(categoryFor(150).id, 'sensitive');
  assert.equal(categoryFor(301).id, 'hazardous');
  assert.equal(categoryFor(500).id, 'hazardous');
});
test('every action explains why and its impact', () => {
  for (const a of buildPlan(base).actions) {
    assert.ok(a.title && a.why && a.impact.text);
    assert.ok(['high', 'medium', 'low'].includes(a.impact.level));
  }
});
test('high-impact actions come first', () => {
  const levels = buildPlan(base).actions.map((a) => a.impact.level);
  const order = { high: 0, medium: 1, low: 2 };
  assert.deepEqual(levels, [...levels].sort((x, y) => order[x] - order[y]));
});
test('tailors to heating, cooking and purifier', () => {
  const titles = buildPlan(base).actions.map((a) => a.title).join('|');
  assert.match(titles, /wood or coal/);
  assert.match(titles, /induction/);
  assert.match(titles, /Corsi-Rosenthal/);
  const clean = buildPlan({ ...base, heating: 'electric', cooking: 'induction_electric', hasPurifier: true })
    .actions.map((a) => a.title).join('|');
  assert.doesNotMatch(clean, /wood or coal|Corsi/);
  assert.match(clean, /purifier/);
});
test('sensitive household gets health actions only when air is poor', () => {
  assert.ok(buildPlan(base).actions.some((a) => a.area === 'health'));
  assert.ok(!buildPlan({ ...base, aqi: 40 }).actions.some((a) => a.area === 'health'));
});
test('school action only for children when AQI > 150', () => {
  assert.ok(buildPlan(base).actions.some((a) => /school/.test(a.title)));
  assert.ok(!buildPlan({ ...base, children: false }).actions.some((a) => /school/.test(a.title)));
});

test('every commute, heating and cooking option yields a sensible plan', () => {
  const titles = (o) => buildPlan({ ...base, children: false, ...o }).actions.map((a) => a.title).join('|');
  assert.match(titles({ commute: 'two_wheeler' }), /engine tuned/);
  assert.match(titles({ commute: 'walk_bike' }), /midday.*N95/);
  assert.match(titles({ commute: 'public' }), /public transport/);
  assert.match(titles({ commute: 'work_from_home' }), /one midday trip/);
  assert.match(titles({ heating: 'gas' }), /Vent gas heaters/);
  assert.match(titles({ cooking: 'lpg' }), /exhaust fan whenever/);
  assert.doesNotMatch(titles({ commute: 'walk_bike', aqi: 40 }), /N95/);
});
