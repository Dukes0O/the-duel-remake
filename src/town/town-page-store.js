// The town store a helicopter visit saves to (HELI-RUSTWALL): IndexedDB in the game and, in a QA build, memory only. The
// town screen (town-entry.js) hands over its QA memory when it loads, so in a QA page the screen and the visit read and
// write the same towns. Imports no page drawing.
import {createTownStore, saveTown} from './town-store.js';

let qaMemory = {towns: new Map(), copies: new Map()};
export function usePageTownMemory(memory) { if (memory?.towns instanceof Map && memory?.copies instanceof Map) qaMemory = memory; }
export function pageTownStore() {
  const qa = typeof __DUEL_QA__ !== 'undefined' && __DUEL_QA__ === true;
  return createTownStore({memoryOnly: qa, memory: qa ? qaMemory : undefined});
}
// The app saves the town a helicopter visit changed (the Ridge fire, Old Tam's loads, the map) when the visit ends.
export function saveTownAfterFlight(town) { return saveTown(town, {store: pageTownStore(), reason: 'helicopter visit'}); }
