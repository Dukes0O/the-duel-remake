// Road surfaces and tyres (docs/CIRCUITS.md section 3.4). Pure data and small
// functions: the driving code reads them, the renderer and HUD only draw them.
//
// Effective grip is the surface times the tyre. Braking and steering scale with
// it, never below 40% of normal, so a car on the wrong tyres slides wide but can
// still be driven. Asphalt on summer tyres is exactly 1, so every course that
// has no other surface drives as it always has.

export const SURFACE_KINDS = Object.freeze(['asphalt', 'gravel', 'snow', 'ice', 'deep-snow', 'warm-tarmac']);
export const TYRE_KINDS = Object.freeze(['summer', 'winter']);
export const GRIP_FLOOR = .4;
export const HINT_BELOW = .8;      // the HUD names the surface when grip falls under this
export const ICE_MAX_LENGTH = 60;  // metres
export const ICE_BOARD_DISTANCE = 100;
export const HAIRPIN_RADIUS = 25;  // ice never lies on the apex of a corner tighter than this

// Cars with their own gravel grip: the rally car and the Titan lose nothing on graded gravel.
const GRAVEL_FRIENDLY = Object.freeze(['rally', 'monster']);

export const SURFACES = Object.freeze({
  asphalt: Object.freeze({ id: 'asphalt', name: 'Asphalt', grip: 1, column: 'asphalt', hint: '', cue: null, look: 'Dry road' }),
  gravel: Object.freeze({ id: 'gravel', name: 'Graded gravel', grip: .85, column: 'asphalt', hint: 'GRAVEL', cue: 'surface.gravel',
    look: 'Packed brown gravel with loose stones' }),
  snow: Object.freeze({ id: 'snow', name: 'Packed snow', grip: .7, column: 'snow', hint: 'SNOW', cue: 'surface.snow',
    look: 'White, tyre-tracked, plough marks at the edges' }),
  ice: Object.freeze({ id: 'ice', name: 'Ice', grip: .5, column: 'ice', hint: 'ICE', cue: 'surface.ice',
    look: 'Glossy blue-grey patches with a faint sparkle' }),
  'deep-snow': Object.freeze({ id: 'deep-snow', name: 'Deep snow', grip: .55, column: 'snow', hint: 'DEEP SNOW', cue: 'surface.snow',
    topSpeedMph: 45, look: 'Heaped soft snow' }),
  'warm-tarmac': Object.freeze({id:'warm-tarmac',name:'Warm tarmac',grip:1,column:'warm',hint:'WARM TARMAC',cue:null,look:'Dry road'}),
  // Zone-only handling; circuit authors still use SURFACE_KINDS.
  'sea-floor': Object.freeze({ id: 'sea-floor', name: 'Sea floor', grip: .75, column: 'asphalt',
    hint: 'SEA FLOOR', cue: null, topSpeedShare: .7, accelerationShare: .6, turningDragShare: 1.4,
    gravityShare: 1 / 3, landingCue: 'deep.sand-land', look: 'Submerged sand and rock' }),
});

// Tyre multipliers by the surface's column. Gravel counts as hard ground (the
// asphalt column) and deep snow as snow (the packed snow column).
export const TYRES = Object.freeze({
  summer: Object.freeze({ id: 'summer', name: 'Summer', icon: 'sun', asphalt: 1, snow: .75, ice: .55, warm: 1, warmTopSpeedShare: 1, topSpeedShare: 1 }),
  winter: Object.freeze({ id: 'winter', name: 'Winter', icon: 'snowflake', asphalt: .94, snow: 1, ice: .85, warm: .82, warmTopSpeedShare: .97, topSpeedShare: .97 }),
});

export const isSurface = kind => Object.hasOwn(SURFACES, kind);
export const normalizeTyre = value => (value === 'winter' ? 'winter' : 'summer');

export function surfaceGrip(kind, car = null) {
  const surface = SURFACES[kind] ?? SURFACES.asphalt;
  if (kind === 'gravel' && GRAVEL_FRIENDLY.includes(car?.kind)) return 1;
  if (kind === 'gravel' && car?.awd === true) return .93;
  return surface.grip;
}

// Surface grip times tyre, held at 40% or more.
export function effectiveGrip(kind, tyre = 'summer', car = null) {
  const surface = SURFACES[kind] ?? SURFACES.asphalt, set = TYRES[tyre] ?? TYRES.summer;
  const awd = car?.awd === true && (kind === 'snow' || kind === 'deep-snow') ? 1.06 : 1;
  return Math.max(GRIP_FLOOR, surfaceGrip(kind, car) * set[surface.column] * awd);
}

// Top speed share of the tyre applies on asphalt only (winter rubber gives
// 3% away on dry road); on snow and ice other limits already govern.
export function tyreTopSpeedShare(kind, tyre = 'summer') {
  if(kind==='warm-tarmac')return (TYRES[tyre] ?? TYRES.summer).warmTopSpeedShare;
  return kind === 'asphalt' || kind === 'gravel' ? (TYRES[tyre] ?? TYRES.summer).topSpeedShare : 1;
}

const NEUTRAL = Object.freeze({ kind: 'asphalt', grip: 1, topSpeedMph: null, topShare: 1, hint: '', cue: null, active: false });

// Everything the driving code needs for one place and tyre. Neutral (frozen,
// shared) for asphalt on summer tyres.
export function gripFor(kind, tyre = 'summer', car = null) {
  if (kind === 'asphalt' && tyre === 'summer') return NEUTRAL;
  const surface = SURFACES[kind] ?? SURFACES.asphalt, grip = effectiveGrip(kind, tyre, car);
  if (kind === 'sea-floor') return { kind, grip, topSpeedMph: null, topShare: surface.topSpeedShare,
    accelerationShare: surface.accelerationShare, turningDragShare: surface.turningDragShare,
    gravityShare: surface.gravityShare, landingCue: surface.landingCue,
    hint: surface.hint, cue: surface.cue, active: true };
  return { kind: surface.id, grip, topSpeedMph: surface.topSpeedMph ?? null, topShare: tyreTopSpeedShare(kind, tyre),
    hint: grip < HINT_BELOW ? surface.hint : '', cue: surface.cue, active: true };
}

// What the HUD shows: the tyre icon on a course that has snow or ice, and the
// surface name when grip is low. Reads state; never writes it.
export function gripReadout(duel) {
  const course = duel.course, state = duel.state;
  if (!course || state.status === 'menu') return { tyre: null, hint: '', grip: 1 };
  const tyre = normalizeTyre(state.tyre), readKind = course.gripKindAt?.(state.s, state.lateral) ?? 'asphalt';
  const kind = readKind === 'sea-floor' && duel.featureFlags?.enabled('the-deep') !== true ? 'asphalt' : readKind;
  const grip = gripFor(kind, tyre, duel.car);
  return { tyre: courseHasWinterSurfaces(course) ? TYRES[tyre] : null, hint: grip.hint, grip: grip.grip, kind };
}

// A course needs the tyre choice when any stretch or patch is snow or ice.
export function courseHasWinterSurfaces(courseOrDef) {
  const stretches = (courseOrDef.script?.pieces ?? courseOrDef.script ?? []).map(piece => (Array.isArray(piece) ? (piece.at(-1)?.surface ?? null) : piece.surface));
  const patches = courseOrDef.features?.surfacePatches ?? courseOrDef.surfacePatches ?? [];
  const winter = kind => kind === 'snow' || kind === 'ice' || kind === 'deep-snow';
  return stretches.some(winter) || patches.some(patch => winter(patch.kind));
}

// ---- rules for where the loose surfaces may lie ----

// Ice is always fair: at most 60 m long, never on a hairpin apex, announced by
// an ICE board 100 m before it, and only where the author says it is shaded
// (forest, under a ridge). Returns a list of problems; empty means fine.
export function checkSurfaceRules(script, patches = []) {
  const problems = [];
  const stretches = [];
  let open = null;
  for (const piece of script.pieces) {
    if (!SURFACE_KINDS.includes(piece.surface)) problems.push(`Piece ${piece.index + 1} (${piece.name || piece.kind}) names the unknown surface "${piece.surface}".`);
    if (piece.surface === 'ice') {
      if (open && Math.abs(open.s1 - piece.s0) < 1e-6) open.s1 = piece.s1; else { open = { s0: piece.s0, s1: piece.s1, name: piece.name || `piece ${piece.index + 1}`, shaded: true }; stretches.push(open); }
    } else open = null;
  }
  for (const patch of patches) {
    if (!SURFACE_KINDS.includes(patch.kind)) problems.push(`Surface patch "${patch.id ?? '?'}" names the unknown surface "${patch.kind}".`);
    if (!(patch.s1 > patch.s0)) problems.push(`Surface patch "${patch.id ?? '?'}" must end after it starts.`);
    if (patch.kind === 'ice') stretches.push({ s0: patch.s0, s1: patch.s1, name: `patch "${patch.id ?? '?'}"`, shaded: patch.shaded === true });
  }
  for (const ice of stretches) {
    if (ice.s1 - ice.s0 > ICE_MAX_LENGTH + 1e-9) problems.push(`Ice on ${ice.name} is ${(ice.s1 - ice.s0).toFixed(0)} m long; ice is at most ${ICE_MAX_LENGTH} m.`);
    if (!ice.shaded) problems.push(`Ice on ${ice.name} must be marked shaded: true (forest or under a ridge only).`);
    for (const piece of script.pieces) {
      if (piece.kind === 'turn' && piece.radius < HAIRPIN_RADIUS && ice.s0 < piece.arcEnd && ice.s1 > piece.arcStart) {
        problems.push(`Ice on ${ice.name} lies on the apex of ${piece.name || `piece ${piece.index + 1}`} (radius ${piece.radius} m); ice never goes on a hairpin apex.`);
      }
    }
    if (!script.closed && ice.s0 - ICE_BOARD_DISTANCE < 0) problems.push(`Ice on ${ice.name} starts less than ${ICE_BOARD_DISTANCE} m from the start, so its ICE board has no room.`);
  }
  return problems;
}

// The ICE board stands 100 m before each ice stretch, on the right edge.
export function iceBoards(script, patches = []) {
  const found = [];
  let open = null;
  for (const piece of script.pieces) {
    if (piece.surface === 'ice') {
      if (open && Math.abs(open.s1 - piece.s0) < 1e-6) open.s1 = piece.s1; else { open = { s0: piece.s0, s1: piece.s1 }; found.push(open); }
    } else open = null;
  }
  for (const patch of patches) if (patch.kind === 'ice') found.push({ s0: patch.s0, s1: patch.s1 });
  return found.map(ice => {
    let s = ice.s0 - ICE_BOARD_DISTANCE;
    if (script.closed) s = ((s % script.length) + script.length) % script.length;
    return { kind: 'ice', s, side: -1, distance: ICE_BOARD_DISTANCE, text: 'ICE', ahead: ice.s0 };
  });
}

// Sound cue named for a surface; audio plays it (P4-AUDIO).
export const surfaceCue = kind => SURFACES[kind]?.cue ?? null;


// Explicit winter ranges are shared by headless bank physics and scenery.
// The visual feature switch never decides where a car can drive.
export function winterRanges(script, config) {
  if (!config) return [];
  if (!script || !Array.isArray(config.ranges) || !config.ranges.length || config.ranges.length > 16) {
    throw new Error('snowWorld needs 1 to 16 distance ranges on a track script.');
  }
  const ranges = config.ranges.map(({from, to}) => {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from || to > script.length) {
      throw new Error('A winter range must lie inside the track.');
    }
    return {from, to};
  }).sort((a, b) => a.from - b.from);
  for (let i = 1; i < ranges.length; i++) if (ranges[i].from < ranges[i - 1].to) {
    throw new Error('Winter ranges must not overlap.');
  }
  return ranges;
}

export function winterBankPatches(script, config) {
  const ranges = winterRanges(script, config), patches = [];
  if (config?.banks === false) return patches;
  for (const [rangeIndex, range] of ranges.entries()) for (const piece of script.pieces) {
    const s0 = Math.max(range.from, piece.s0), s1 = Math.min(range.to, piece.s1);
    if (s1 <= s0) continue;
    // A constant band stays clear of the widest road in this piece. Sampling
    // includes both ends and all short transitions; no renderer creates it.
    let edge = 0;
    for (let s = s0; s < s1; s += 4) edge = Math.max(edge, script.halfWidthAt(s));
    edge = Math.max(edge, script.halfWidthAt(s1)) + .25;
    for (const side of [-1, 1]) patches.push({
      id: 'snow-bank-' + rangeIndex + '-' + piece.index + '-' + side,
      kind: 'deep-snow', snowBank: true, s0, s1,
      from: side > 0 ? edge : -edge - 1.6,
      to: side > 0 ? edge + 1.6 : -edge,
    });
  }
  return patches;
}
