// The Wasteland is an easter egg (SPEC 0.2 and Q9). Its new rules (armor, crew,
// on foot, raiders, loadouts, scrap) belong only to a player who has found the
// gate at the end of the Hidden Road. Until then Mad Max Duel plays exactly like
// the live game, and the Hidden Road exists only in Mad Max Duel races.

export function wastelandUnlocked(flags, profile) {
  return flags.enabled('wasteland2') === true && profile?.wasteland?.version === 1 &&
    profile.wasteland.discoveredGate === true;
}

// A venue choice uses the same eligibility in the yard and the public launcher.
export function arenaVenueAvailable(flags, profile, venueId) {
  if (!flags || !wastelandUnlocked(flags, profile) || flags.enabled('scrapdome') !== true) return false;
  if (venueId === 'scrapdome') return true;
  return venueId === 'salt-flats' && flags.enabled('salt-flats') === true &&
    profile.wasteland.rank >= 9;
}

// A race reads the switch through this view. The answer is fixed when the race
// starts (the Duel records `wastelandGateDiscovered`), so finding the gate part
// way through a run never changes that run's rules.
export function raceFeatureFlags(flags, raceState) {
  return Object.freeze({
    ...flags,
    base: flags,
    enabled(name) {
      if (!flags.enabled(name)) return false;
      return !['wasteland2', 'arsenal'].includes(name) ||
        raceState()?.wastelandGateDiscovered === true;
    },
  });
}

export function hiddenRoadInRace(flags, {mode, hiddenRoadVisit} = {}) {
  return flags.enabled('hidden-road') === true && (mode === 'wasteland' || !!hiddenRoadVisit);
}
