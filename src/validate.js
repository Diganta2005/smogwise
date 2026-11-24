'use strict';

const COMMUTE = ['walk_bike', 'public', 'car', 'two_wheeler', 'work_from_home'];
const HEATING = ['electric', 'gas', 'wood_coal', 'none'];
const COOKING = ['induction_electric', 'lpg', 'biomass'];
const FLAGS = ['children', 'elderly', 'respiratory', 'hasPurifier'];

/** Validates and normalises a request body. Returns { value } or { errors }. */
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Send a JSON object.' } };
  }
  const errors = {};
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  if (city.length < 2 || city.length > 80 || !/^[\p{L}\p{M}\s.,'-]+$/u.test(city)) {
    errors.city = 'Enter a city name using 2 to 80 letters.';
  }
  if (!Number.isInteger(body.aqi) || body.aqi < 0 || body.aqi > 500) {
    errors.aqi = 'AQI must be a whole number from 0 to 500.';
  }
  const pick = (key, allowed) => {
    if (!allowed.includes(body[key])) errors[key] = `Choose one of: ${allowed.join(', ')}.`;
    return body[key];
  };
  const commute = pick('commute', COMMUTE);
  const heating = pick('heating', HEATING);
  const cooking = pick('cooking', COOKING);

  const flags = {};
  for (const key of FLAGS) {
    if (body[key] === undefined) flags[key] = false;
    else if (typeof body[key] === 'boolean') flags[key] = body[key];
    else errors[key] = 'Must be true or false.';
  }
  let notes = '';
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 300) {
      errors.notes = 'Notes must be text of at most 300 characters.';
    } else {
      // Strip control characters on purpose so notes cannot smuggle odd bytes into the AI prompt.
      // eslint-disable-next-line no-control-regex
      notes = body.notes.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    }
  }
  if (Object.keys(errors).length) return { errors };
  return { value: { city, aqi: body.aqi, commute, heating, cooking, ...flags, notes } };
}

module.exports = { validate, COMMUTE, HEATING, COOKING };
