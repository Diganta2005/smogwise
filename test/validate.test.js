'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../src/validate');

const ok = { city: 'Delhi', aqi: 320, commute: 'car', heating: 'none', cooking: 'lpg' };

test('accepts a valid body and defaults flags to false', () => {
  const { value, errors } = validate(ok);
  assert.equal(errors, undefined);
  assert.equal(value.children, false);
  assert.equal(value.notes, '');
});
test('rejects non-objects', () => {
  for (const bad of [null, 'x', [], 5]) assert.ok(validate(bad).errors.body);
});
test('rejects bad city, aqi and enums', () => {
  const { errors } = validate({ ...ok, city: '<script>', aqi: 12.5, commute: 'jetpack' });
  assert.ok(errors.city && errors.aqi && errors.commute);
});
test('aqi bounds', () => {
  assert.equal(validate({ ...ok, aqi: 0 }).errors, undefined);
  assert.equal(validate({ ...ok, aqi: 500 }).errors, undefined);
  assert.ok(validate({ ...ok, aqi: 501 }).errors.aqi);
  assert.ok(validate({ ...ok, aqi: '300' }).errors.aqi);
});
test('accepts non-ASCII city names', () => {
  assert.equal(validate({ ...ok, city: 'Zürich' }).errors, undefined);
  assert.equal(validate({ ...ok, city: 'दिल्ली' }).errors, undefined);
});
test('flags must be boolean; notes are length-limited and cleaned', () => {
  assert.ok(validate({ ...ok, children: 'yes' }).errors.children);
  assert.ok(validate({ ...ok, notes: 'x'.repeat(301) }).errors.notes);
  assert.equal(validate({ ...ok, notes: 'a\u0000b' }).value.notes, 'a b');
});
