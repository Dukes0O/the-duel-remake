import {WEAPONS} from './combat.js';
import {WEAPON_IDS, getProfileWeapons, implementedArsenalWeapons, arsenalCareerAvailable} from './weapon-upgrades.js';

export const CAR_SLOT_DIRECTIONS = Object.freeze(['↑', '→', '↓', '←']);
export const CAR_SLOT_PAD = Object.freeze(['Up', 'Right', 'Down', 'Left']);

// Reads expose only implemented, owned weapons admitted by the caller's view.
// Saved future slot identities remain intact even while this build cannot use them.
export function availableCarWeapons(profile, options = {}) {
  const owned = getProfileWeapons(profile).unlocked;
  const implemented = [...Object.keys(WEAPONS),
    ...(arsenalCareerAvailable(profile, options) ? implementedArsenalWeapons(options) : [])];
  return [...new Set(implemented)].filter(id => owned.includes(id));
}

export function normalizeCarLoadout(value, available = WEAPON_IDS) {
  const allowed = new Set(available);
  const chosen = [];
  for (const id of [...(Array.isArray(value) ? value : []), ...WEAPON_IDS]) {
    if (allowed.has(id) && !chosen.includes(id)) chosen.push(id);
    if (chosen.length === 4) break;
  }
  return chosen;
}

export function getCarLoadout(profile, options = {}) {
  return normalizeCarLoadout(profile?.wasteland?.loadout, availableCarWeapons(profile, options));
}

export function equipCarWeapon(profile, slot, id, options = {}) {
  // An Armory action cannot skip verified migration or rewrite a future schema.
  if (profile?.wasteland?.version !== 1)
    return {ok: false, profile, reason: 'This career is not ready for Wasteland loadout changes.'};
  if (!Number.isInteger(slot) || slot < 0 || slot >= 4 ||
      !availableCarWeapons(profile, options).includes(id))
    return {ok: false, profile, reason: 'That weapon is not available.'};
  // Editing a known slot must not erase an earned future weapon in another slot.
  const loadout = normalizeCarLoadout(profile.wasteland.loadout, getProfileWeapons(profile).unlocked);
  const from = loadout.indexOf(id);
  if (from === slot) return {ok: true, profile, loadout, changed: false};
  if (from >= 0) loadout[from] = loadout[slot];
  loadout[slot] = id;
  return {ok: true, changed: true, loadout,
    profile: {...profile, wasteland: {...profile.wasteland, loadout}}};
}
