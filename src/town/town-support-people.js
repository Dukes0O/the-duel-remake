import {TOWN_HOME_TYPES} from './content/homes.js';

function homePlaces(town) {
  let places = Math.max(12,Number.isSafeInteger(town.campPlaces)?town.campPlaces:12);
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
      const reserve=Number.isFinite(well.waterLitres)?well.waterLitres:0;
      const yieldPerDay=Number.isFinite(well.yieldLitresPerDay)?well.yieldLitresPerDay:reserve;
      if (reserve>0&&yieldPerDay>0) wellWater += Math.min(reserve,yieldPerDay);
    }
  }
  return wellWater;
}

export function measureTownPeopleSupport(town) {
  const homes = homePlaces(town);
  const population = Math.max(1, town.people?.length || 0);
  const waterSources=Object.values(town.regions||{}).some(region=>Object.keys(region?.groundWater?.wells||{}).length>0);
  const hasNetworkWater=Number(town.utilities?.waterResult?.sources)>0||Number(town.utilities?.sources?.length)>0;
  const hasWaterMeasurement=hasNetworkWater||waterSources;
  return {
    shelterPlaces: homes.places,
    paintedHomePlaces: homes.painted,
    ...(hasWaterMeasurement?{waterLitresPerPerson:deliveredWater(town)/population}:{}),
    waterNeedLitresPerPerson: Number.isFinite(town.weather?.waterLitresPerPerson)
      ? town.weather.waterLitresPerPerson : 15,
  };
}

export function stepTownPeopleSupport({town}) {
  const measured = measureTownPeopleSupport(town);
  town.peopleConditions ||= {};
  Object.assign(town.peopleConditions, measured);
}
