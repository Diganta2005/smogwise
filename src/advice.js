'use strict';

const BANDS = [
  { max: 50, id: 'good', label: 'Good', advice: 'Air is clean enough for normal activity.' },
  { max: 100, id: 'moderate', label: 'Moderate', advice: 'Fine for most people; unusually sensitive people should ease off long outdoor exertion.' },
  { max: 150, id: 'sensitive', label: 'Unhealthy for sensitive groups', advice: 'Children, older adults and people with lung or heart conditions should limit time outdoors.' },
  { max: 200, id: 'unhealthy', label: 'Unhealthy', advice: 'Everyone should cut back on outdoor exertion; sensitive groups should stay indoors.' },
  { max: 300, id: 'very_unhealthy', label: 'Very unhealthy', advice: 'Stay indoors with cleaner air and avoid outdoor exercise.' },
  { max: 500, id: 'hazardous', label: 'Hazardous', advice: 'Emergency conditions: stay indoors and wear a respirator for any essential trip.' },
];

const LEVEL_ORDER = { high: 0, medium: 1, low: 2 };

function categoryFor(aqi) {
  return BANDS.find((b) => aqi <= b.max);
}

/** Deterministic, explainable plan. Every action says why it helps and how much. */
function buildPlan(input) {
  const category = categoryFor(input.aqi);
  const sensitive = input.children || input.elderly || input.respiratory;
  const poor = input.aqi > 100;
  const bad = input.aqi > 150;
  const actions = [];
  const add = (area, level, title, why, impact, effort) =>
    actions.push({ area, title, why, impact: { level, text: impact }, effort });

  // Daily routines
  if (input.commute === 'car') {
    add('routine', 'high', 'Swap one car trip a day for transit, carpooling or walking',
      'Vehicle exhaust, brake and tyre dust add fine particles right where people breathe.',
      'A 10 km petrol-car trip emits about 1.8 kg CO2 plus particles; sharing the ride halves your share.', 'medium');
  } else if (input.commute === 'two_wheeler') {
    add('routine', 'medium', 'Keep your engine tuned and combine errands into one trip',
      'Poorly tuned engines and cold starts emit far more particles.',
      'Fewer cold starts and a valid emissions check cut your tailpipe output noticeably.', 'low');
  } else if (input.commute === 'walk_bike' && poor) {
    add('routine', 'high', 'Walk or cycle at midday on quieter streets, and wear an N95/FFP2 mask when AQI is above 150',
      'Winter smog often peaks in early morning and late evening when cold air traps pollution; heavy breathing pulls more in.',
      'A well-fitted N95/FFP2 filters most fine particles; a cloth mask does little.', 'low');
  } else if (input.commute === 'public') {
    add('routine', 'low', 'Keep using public transport and walk the last stretch away from main roads',
      'Each person on a bus or metro replaces a car trip.', 'You already avoid most of the commute emissions a car would add.', 'low');
  } else if (input.commute === 'work_from_home') {
    add('routine', 'low', 'Run errands in one midday trip on days when AQI is above 150',
      'Fewer trips means less exposure and fewer cold-start emissions.', 'Small, but it adds up across a street or society.', 'low');
  }
  if (input.heating === 'wood_coal') {
    add('alternative', 'high', 'Replace wood or coal heating with electric heating, and insulate doors and windows',
      'Burning wood, coal or waste is a major winter source of fine particles, indoors and out.',
      'Ending indoor burning removes one of the largest sources of household particle pollution.', 'high');
  } else if (input.heating === 'gas') {
    add('alternative', 'medium', 'Vent gas heaters outdoors and service them each winter',
      'Unvented gas heaters release nitrogen dioxide and carbon monoxide indoors.',
      'A serviced, vented heater lowers indoor combustion gases.', 'medium');
  }
  if (input.cooking === 'biomass') {
    add('alternative', 'high', 'Move to LPG or an induction cooktop, and cook with the exhaust fan or a window open',
      'Cooking on wood, dung or charcoal produces large amounts of smoke inside the home.',
      "Clean cooking is one of the biggest cuts to a family's indoor particle exposure.", 'high');
  } else if (input.cooking === 'lpg') {
    add('indoor', 'medium', 'Run the kitchen exhaust fan whenever you cook',
      'Gas flames and frying release particles and nitrogen dioxide.',
      'Venting at the source clears pollutants before they spread through the home.', 'low');
  }

  // Indoor air
  if (poor) {
    add('indoor', 'high', 'Keep windows closed at pollution peaks; air the home briefly when outdoor AQI is lowest',
      'Outdoor smog leaks in through open windows.', 'Closing up at peaks can keep indoor particle levels well below outdoor ones.', 'low');
  }
  if (input.hasPurifier) {
    add('indoor', 'medium', 'Run your purifier in the room where you spend most time, with doors closed',
      'A HEPA filter removes fine particles from the air it circulates.', 'Works best sized to the room, with filters changed on schedule.', 'low');
  } else if (poor) {
    add('indoor', 'high', 'Build a Corsi-Rosenthal box: a box fan with four MERV-13 filters taped on',
      'Studies of the design show it can clean air much like a small HEPA purifier at a fraction of the cost.',
      'Low-cost way to cut indoor fine particles in one room.', 'medium');
  }
  add('indoor', 'low', 'Mop or damp-dust instead of dry sweeping, and avoid incense, candles and smoking indoors',
    'Dry sweeping lifts settled dust and burning adds particles.', 'Removes avoidable indoor sources.', 'low');

  // Health
  if (sensitive && poor) {
    add('health', 'high', 'Keep reliever medicines handy, plan indoor play, and call a doctor for wheeze or chest tightness',
      'Children, older adults and people with lung or heart conditions react at lower pollution levels.',
      'Early action can prevent an emergency.', 'low');
  }
  if (input.children && bad) {
    add('health', 'medium', 'Ask the school to move sports and recess indoors on high-AQI days',
      'Children breathe faster relative to body size, so exercise outdoors raises their dose.', 'Shields the whole class, not just your child.', 'low');
  }

  // Community
  add('community', 'medium', 'Organise a street or building pledge: no open burning of leaves or waste, and carpool on bad-air days',
    'Open burning and traffic are shared sources, so shared action works faster than individual action.',
    'Cutting a few sources on one street lowers exposure for every household on it.', 'medium');

  actions.sort((a, b) => LEVEL_ORDER[a.impact.level] - LEVEL_ORDER[b.impact.level]);
  return {
    category: { id: category.id, label: category.label, advice: category.advice },
    sensitive,
    actions,
    disclaimer: 'General guidance, not medical advice. Impact notes are approximate. Ask a doctor about health concerns.',
  };
}

module.exports = { buildPlan, categoryFor, BANDS };
