// Air and altitude (docs/LAB.md 4.1): a rotor on a test stand at sea level, Panorama Ridge and Summit Run.
// The lift is the helicopter's own availableThrust with the base altitude of each place (heli-jobs.js); the
// game's air share (airFactor) and the true air density from the standard atmosphere are both shown.
import {GRAVITY, createHeliState, airFactor, availableThrust, heliReadout} from '../../heli/heli-flight.js';
import {HELI_DESTINATIONS, SUMMIT_RUN} from '../../heli/heli-jobs.js';
import {LAB_HELI} from '../lab-heli.js';
import {choice, makeBench} from './bench-core.js';

export const SITES = Object.freeze({
  sea: Object.freeze({name: 'Sea level', altitudeM: 0}),
  'panorama-ridge': Object.freeze({name: HELI_DESTINATIONS['panorama-ridge'].name, altitudeM: HELI_DESTINATIONS['panorama-ridge'].baseAltitude}),
  'summit-run': Object.freeze({name: SUMMIT_RUN.name, altitudeM: SUMMIT_RUN.baseAltitude}),
});

// The standard atmosphere's air density against sea level, up to 11 km (temperature falls 6.5 degrees a km).
export const trueAirShare = altitudeM => Math.pow(1 - 0.0065 * Math.max(0, altitudeM) / 288.15, 4.25588);

const controls = [choice('site', 'Where', Object.keys(SITES), 'sea')];
const liftKgAt = altitudeM => availableThrust(createHeliState({altitudeOffset: altitudeM}), 0) / GRAVITY;

export const altitudeBench = makeBench({
  id: 'altitude', controls, cues: [],
  run({site}) {
    const {altitudeM} = SITES[site], seaLiftKg = liftKgAt(0), liftKg = liftKgAt(altitudeM);
    const aloftLiftKg = heliReadout(createHeliState({altitudeOffset: altitudeM})).maxLiftKg;
    return {site, altitudeM, aloftLiftKg, gameShare: airFactor(altitudeM), trueShare: trueAirShare(altitudeM),
      tunedShare: Math.exp(-altitudeM / LAB_HELI.altitudeScaleM), liftKg, liftShare: liftKg / seaLiftKg};
  },
  goalMet: history => Object.keys(SITES).every(site => history.some(({result}) => result.site === site)),
  facts: () => ({summitAltitudeM: SUMMIT_RUN.baseAltitude, summitTrueShare: trueAirShare(SUMMIT_RUN.baseAltitude), summitGameShare: airFactor(SUMMIT_RUN.baseAltitude)}),
});
