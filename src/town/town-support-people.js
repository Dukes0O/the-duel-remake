import {buildingById} from './content/registry.js';

const FOUNDERS_CAMP_PLACES = 12;
function isFinishedHome(building, row) {
  return (building.state === 'finished' || building.state === 'complete')
    && !building.fireStage && !building.fireOut
    && !String(building.state).startsWith('burnt-')
    && Number.isFinite(row?.beds) && row.beds > 0;
}

function homePlaces(town) {
  let places = FOUNDERS_CAMP_PLACES;
  let painted = 0;
  for (const building of town.buildings || []) {
    const row = buildingById.get(building.buildingId);
    if (!isFinishedHome(building, row)) continue;
    places += row.beds;
    if (building.paintedHomeGround === true || building.groundPainted === true) painted += row.beds;
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
