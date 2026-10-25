// What the Lab changes in the helicopter (docs/LAB.md section 4.1), through one function so that
// src/heli/ imports only this. Pass the saved Lab (`labOf(profile)`), or nothing while the `lab`
// switch is off: an empty Lab, no Lab and a Lab from a newer version all give today's numbers.
import {KESTREL} from '../heli/heli-flight.js';
import {BUCKET} from '../heli/heli-bucket.js';
import {CABLE} from '../heli/heli-cable.js';
import {labOf, setCable, passLesson} from './lab-save.js';
import {lessonOpenState} from './lab-lessons.js';

export const LAB_HELI = Object.freeze({engine1: 1.05, engine2: 1.10, lightFrameKg: 80, heavyHookKg: 2000, bigBucketLitres: 800,
  longCableM: 25, altitudeScaleM: 10_000});

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function heliUpgrades(lab) {
  const usable = isObject(lab) && lab.version === 1;
  const has = id => usable && isObject(lab.owned) && lab.owned[id] === true;
  const ring = usable && Number.isSafeInteger(lab.ring) ? Math.max(0, Math.min(3, lab.ring)) : 0;
  const best = usable && Number.isSafeInteger(lab.ringBest) ? Math.max(0, Math.min(3, lab.ringBest)) : 0;
  return {
    thrustFactor: has('engine-2') ? LAB_HELI.engine2 : has('engine-1') ? LAB_HELI.engine1 : 1,
    emptyMassKg: KESTREL.emptyKg - (has('light-frame') ? LAB_HELI.lightFrameKg : 0),
    hookLimitKg: has('heavy-hook') ? LAB_HELI.heavyHookKg : KESTREL.hookLimitKg,
    lineLengthM: has('long-cable') && lab.cable === LAB_HELI.longCableM ? LAB_HELI.longCableM : CABLE.length,
    bucketLitres: has('big-bucket') ? LAB_HELI.bigBucketLitres : BUCKET.litres,
    ringIndex: Math.min(ring, best),
    retardant: has('retardant'),
    altitudeScaleM: has('altitude-tune') ? LAB_HELI.altitudeScaleM : KESTREL.airScaleHeight,
  };
}

// What the helicopter session asks of the Lab, so src/heli/ imports this one file: the upgrades a profile has bought,
// the upgrades it owns by id (for the pad menu), and the line choice (15 or 25 m, saved like any other Lab step).
export const heliUpgradesOf = profile => heliUpgrades(labOf(profile));
export const ownedLabUpgrades = profile => labOf(profile).owned;
export const chooseLabLine = (profile, metres, flags) => setCable(profile, metres, {flags});

// The Lab's helicopter challenges (docs/LAB.md 4.1 and 4.2): the session starts, steps and ends them through this file.
export {CHALLENGE_IDS, CHALLENGE_RULES, challengeSpots, createChallenge, stepChallenge, challengeProps, challengeBriefing} from './lab-challenges.js';
const challengeFlags = Object.freeze({enabled: name => name === 'lab' || name === 'helicopter'});
// Passing a challenge passes its Lab lesson (and, for Projectile motion, moves the drop ring on); false when it is not open.
export const passLabChallenge = (profile, id, ring) => passLesson(profile, id, {flags: challengeFlags, ring});
export const labChallengesDone = profile => labOf(profile).done;
export const labChallengeOpen = (profile, id) => lessonOpenState(profile, id, challengeFlags);
