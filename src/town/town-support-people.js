import {TOWN_HOME_TYPES} from './content/homes.js';

function homePlaces(town) {
  let places = 12;
  let painted = 0;
  for (const plot of town.homePlots || []) {
    const home = TOWN_HOME_TYPES[plot.tier];
    if (!home || !plot.household || plot.burning) continue;
    places += home.places;
    painted += home.places;
  }
  return {places, painted};
}

function deliveredWater(town) {
  const network = Number(town.utilities?.waterResult?.delivered);
  if (Number.isFinite(network) && network > 0) return network;
  let wellWater = 0;
  for (const region of Object.values(town.regions || {})) {
    for (const well of Object.values(region?.groundWater?.wells || {})) {
      if (Number.isFinite(well.waterLitres) && well.waterLitres > 0) wellWater += well.waterLitres;
    }
  }
  return wellWater;
}

export function measureTownPeopleSupport(town) {
  const homes = homePlaces(town);
  const population = Math.max(1, town.people?.length || 0);
  const waterLitresPerPerson = deliveredWater(town) / population;
  return {
    shelterPlaces: homes.places,
    paintedHomePlaces: homes.painted,
    waterLitresPerPerson,
    waterNeedLitresPerPerson: Number.isFinite(town.weather?.waterLitresPerPerson)
      ? town.weather.waterLitresPerPerson : 15,
  };
}

export function stepTownPeopleSupport({town}) {
  const measured = measureTownPeopleSupport(town);
  town.peopleConditions ||= {};
  Object.assign(town.peopleConditions, measured);
}
