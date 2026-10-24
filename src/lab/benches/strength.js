// Strength against weight (docs/LAB.md 4.2): three bars of the same weight are loaded until they bend or
// snap, then the hook-arm puzzle. The game has no material rules of its own (armour does not wear, Carbon
// plates only cut kit weight), so the numbers are standard engineering values for the three materials and
// the maths is the textbook cantilever: tip drop = F L^3 / (3 E I), outer-fibre stress = 6 F L / (w t^2).
import {GRAVITY} from '../../heli/heli-flight.js';
import {control, choice, makeBench} from './bench-core.js';

// density kg/m3, stiffness E (Pa), strength (Pa) where it bends for good (ductile) or snaps (brittle).
export const MATERIALS = Object.freeze({
  aluminium: Object.freeze({name: 'Aluminium', density: 2700, stiffness: 69e9, strength: 275e6, brittle: false}),
  steel: Object.freeze({name: 'Steel', density: 7850, stiffness: 200e9, strength: 250e6, brittle: false}),
  'carbon fibre': Object.freeze({name: 'Carbon fibre', density: 1600, stiffness: 135e9, strength: 1500e6, brittle: true}),
});
const NAMES = Object.keys(MATERIALS);

// The test rig: bars half a metre long, 40 mm wide, 1 kg each, so the thicker bar is the lighter material.
export const RIG = Object.freeze({lengthM: 0.5, widthM: 0.04, massKg: 1});
// The hook arm: half a metre long, 60 mm wide, holding 2,000 kg; stress kept 1.5 times (bending metals) or
// 3 times (carbon, which snaps) under its limit, and the tip allowed to drop 10 mm.
export const ARM = Object.freeze({lengthM: 0.5, widthM: 0.06, loadKg: 2000, ductileMargin: 1.5, brittleMargin: 3, maxDropM: 0.01});

const tipDrop = (forceN, lengthM, widthM, thicknessM, stiffness) => forceN * lengthM ** 3 / (3 * stiffness * (widthM * thicknessM ** 3 / 12));
const stress = (forceN, lengthM, widthM, thicknessM) => 6 * forceN * lengthM / (widthM * thicknessM ** 2);

// One bar on the rig under this load.
export function loadBar(material, loadKg) {
  const m = MATERIALS[material], thicknessM = RIG.massKg / (m.density * RIG.lengthM) / RIG.widthM, forceN = loadKg * GRAVITY;
  const s = stress(forceN, RIG.lengthM, RIG.widthM, thicknessM), drop = tipDrop(forceN, RIG.lengthM, RIG.widthM, thicknessM, m.stiffness);
  const state = s < m.strength ? 'springs back' : m.brittle ? 'snapped' : 'bent for good';
  return {material, thicknessMm: thicknessM * 1000, stressMPa: s / 1e6, tipDropMm: drop * 1000, state,
    loadAtFailureKg: m.strength * RIG.widthM * thicknessM ** 2 / (6 * RIG.lengthM) / GRAVITY};
}

// One hook arm: does it hold, and how heavy is it.
export function hookArm(material, thicknessMm) {
  const m = MATERIALS[material], t = thicknessMm / 1000, forceN = ARM.loadKg * GRAVITY;
  const limit = m.strength / (m.brittle ? ARM.brittleMargin : ARM.ductileMargin);
  const s = stress(forceN, ARM.lengthM, ARM.widthM, t), drop = tipDrop(forceN, ARM.lengthM, ARM.widthM, t, m.stiffness);
  return {material, thicknessMm, massKg: m.density * ARM.widthM * t * ARM.lengthM, stressMPa: s / 1e6, tipDropMm: drop * 1000,
    holds: s <= limit && drop <= ARM.maxDropM};
}
// The lightest arm that holds, over every material in whole millimetres.
export function lightestArm() {
  let best = null;
  for (const material of NAMES) for (let mm = 1; mm <= 150; mm++) {
    const arm = hookArm(material, mm);
    if (arm.holds && (!best || arm.massKg < best.massKg)) best = arm;
  }
  return best;
}

const controls = [
  choice('part', 'Test', ['bars', 'hook arm'], 'bars'),
  choice('material', 'Material', NAMES, 'steel'),
  control('loadKg', 'Load on the bar', 'kg', 0, 2500, 10, 0),
  control('thicknessMm', 'Arm thickness', 'mm', 5, 120, 1, 30),
];

export const strengthBench = makeBench({
  id: 'strength', controls, cues: ['lab.creak', 'lab.snap'],
  run({part, material, loadKg, thicknessMm}) {
    if (part === 'hook arm') return {part, arm: hookArm(material, thicknessMm), lightestMassKg: lightestArm().massKg};
    const bars = NAMES.map(name => loadBar(name, loadKg));
    return {part, bars, cue: bars.some(bar => bar.state === 'snapped') ? 'lab.snap' : bars.some(bar => bar.state === 'bent for good') ? 'lab.creak' : null};
  },
  // The goal: a hook arm that holds 2,000 kg and weighs no more than 15% over the lightest that can.
  goalMet: history => history.some(({result}) => result.arm?.holds && result.arm.massKg <= result.lightestMassKg * 1.15),
  facts: () => ({aluminiumOverSteelDensity: MATERIALS.aluminium.density / MATERIALS.steel.density,
    snapped: NAMES.filter(name => MATERIALS[name].brittle), lightest: lightestArm()}),
});
