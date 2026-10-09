import {WARLORDS, WARLORD_LADDER} from './warlords.js';

const stories = Object.freeze({
  sal: ['Sal ruled the yard with steel teeth.', 'You broke her hold on the road.', 'The Side Saws now answer to you.'],
  dustmonger: ['Dust hid his tracks and his rivals.', 'You found the driver inside the cloud.', 'His smoke no longer owns the horizon.'],
  mirage: ['Mother Mirage made every shadow a threat.', 'You picked the real car from her doubles.', 'The wastes remember who stayed standing.'],
  gunn: ['Gunn watched the Pit through his turret.', 'You crossed the fire and broke his aim.', 'His rocket racks are yours to command.'],
  kettle: ['The Kingpin shook the ground beneath the Dome.', 'Even his Titan could not hold you back.', 'Tusk chose the crew that drove on.'],
  vultures: ['Two hunters circled the same prey.', 'You split the pair and claimed the Pit.', 'Their reach belongs to your crew now.'],
  tollkeeper: ['The tanker carried a price on every road.', 'You broke its valves and planted the charge.', 'The Salt Flats are open again.'],
  blackiron: ['The Baron wore the wastes like a crown.', 'You brought his black iron reign down.', 'Vesper left his gang to ride with you.'],
});

export function storyCardFor(id) {
  const warlord = WARLORDS[id];
  return warlord && stories[id] ? {id, name: warlord.name,
    carId: id === 'tollkeeper' ? 'convoy-tanker' : warlord.car,
    lines: [...stories[id]]} : null;
}

// Saved wins are entitlements even when they predate the wall. This projection
// never migrates or writes a career, and never discards unrelated stored cards.
export function ownedStoryCards(profile) {
  const career = profile?.wasteland;
  if (career?.version !== 1) return [];
  const owned = new Set((Array.isArray(career.cards) ? career.cards : []).filter(card => card?.kind === 'warlord-story').map(card => card.id));
  for (const id of WARLORD_LADDER) if (career.warlords?.[id]?.defeated === true ||
      Array.isArray(career.warlords?.defeated) && career.warlords.defeated.includes(id)) owned.add(id);
  return WARLORD_LADDER.filter(id => owned.has(id)).map(storyCardFor);
}

export function wantedPosterFor(state, {warlordCardsEnabled = false} = {}) {
  const arena = state?.arena;
  if (!warlordCardsEnabled || state.wastelandGateDiscovered !== true ||
      arena?.mode !== 'warlord' || arena.phase !== 'over' ||
      arena.result?.winnerId !== 'player' || !WARLORDS[arena.warlordId]) return null;
  const player = arena.participants?.find(item => item.id === 'player' && item.kind === 'player');
  if (!player) return null;
  return {warlordId: arena.warlordId, carId: state.car, crewId: state.crewId || 'rook',
    wrecks: player.wrecks || 0, hits: state.combat?.scoring?.hitsLanded || 0,
    timeSec: (arena.clockSec || 0) + (arena.suddenDeathSec || 0)};
}
