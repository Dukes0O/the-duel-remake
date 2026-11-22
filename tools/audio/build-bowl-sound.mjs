// BOWL-SOUND: every other Show Night cue, cut and layered from CC0 Freesound recordings kept in the library outside
// the repository (docs/board/cards/BOWL-SOUND.md). The crush set has its own script (build-bowl-crush.mjs), whose
// renderer this one shares.
//   node tools/audio/build-bowl-sound.mjs              rebuild every take and its catalog rows
//   node tools/audio/build-bowl-sound.mjs --sheet DIR  render a listening sheet beside the car-to-car crash
// Each take is one or more layers (a cut of one recording with its own pitch, filters, gain and start), mixed,
// faded and levelled to the take's loudness, then written as Vorbis to public/assets/audio/bowl/.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness} from './measurements.mjs';
import {libraryRoot, loadCatalog, sha256} from './sourcing.mjs';
import {renderTake} from './build-bowl-crush.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;
const SCRIPT = 'tools/audio/build-bowl-sound.mjs';
const cut = (source, start, duration, options = {}) => Object.freeze({source: String(source), start, duration,
  rate: 1, gain: 1, at: 0, highpass: 40, lowpass: 12000, ...options});
// One take per cue, named after the cue: bowl.saw.spin -> bowl/saw-spin.ogg.
const one = (id, loudness, layers) => [id, [Object.freeze({file: `bowl/${id.slice(5).replaceAll('.', '-')}.ogg`, loudness,
  layers: Object.freeze(layers)})]];

// Loudness by kind, against the car-to-car crash files (about -17.5 LUFS, played at 4.2): a weapon striking a truck,
// a knockout and the beast's biggest moments -15 to -16; the tells that warn of a hit (the hammer's rise, the saw
// spinning up, the launcher filling, the roar) -18 to -19, clear but under a crash; the crowd -19 to -21; Big Mo's
// chime, the school's tick and the screens' cues -22 to -25, so they never cover the driving.
export const BOWL_SOUND_RECIPES = Object.freeze(Object.fromEntries([
  // BOWL-WEAPONS (Kyle's try, 20 November: "proper weaponry sounds", never a buzz).
  one('bowl.hammer.rise', -19, [cut(83887, .2, 2.4, {rate: .75, lowpass: 5000})]),            // hydraulic rams lifting the head
  one('bowl.hammer.hit', -15, [cut(270588, .35, 1, {rate: .7}), cut(614062, .05, 2, {lowpass: 3000, gain: .9}),
    cut(397691, 0, 1, {lowpass: 150, gain: .4})]),                                                // a deep clang on a truck
  one('bowl.hammer.miss', -18, [cut(504626, .05, 1.5, {rate: .8}), cut(640204, .25, .5, {lowpass: 400, gain: .5})]), // a thud in the dirt
  one('bowl.saw.spin', -18, [cut(386230, 0, 2.6, {rate: .9})]),                                // a cutting disc spinning up
  one('bowl.saw.cut', -15.5, [cut(386094, .5, 2.8), cut(675466, .1, .8, {gain: .4})]),         // the disc biting steel
  one('bowl.saw.hot', -20, [cut(386092, .3, 2.4), cut(479296, .3, 1.5, {highpass: 2000, gain: .5, at: .6})]), // winding down, hissing hot
  one('bowl.launcher.tell', -19, [cut(520071, .3, 1.6, {fadein: .1}), cut(185515, 0, .5, {gain: .6, at: 1.4})]), // a rival's launcher charging
  one('bowl.launcher.fill', -20, [cut(416080, .2, 2, {fadein: .1})]),                          // air hissing into the tank
  one('bowl.launcher.fire', -15, [cut(521493, 0, 1.6), cut(870741, 0, 1.2, {lowpass: 600, gain: .7})]), // a hard air bang
  one('bowl.rhino.horn', -17, [cut(131930, .3, 1.6), cut(127981, 0, 1.6, {lowpass: 3000, gain: .6})]), // the charge: horn and engine
  one('bowl.dragon.fire', -17, [cut(381856, 0, 2.4)]),                                         // Dragon Wagon's fire
  one('bowl.weapon.pick', -22, [cut(389705, 0, .4), cut(741351, .2, .6, {gain: .5, at: .08})]), // a weapon bolted on
  one('bowl.knockout', -14.5, [cut(397691, 0, 2.5), cut(675901, .1, 2, {gain: .8})]),
  one('bowl.out.of.the.bowl', -19, [cut(764163, 1.5, 3, {fadein: .2})]),
  // BOWL-WALLS
  one('bowl.wall.bounce', -19, [cut(342535, .1, .7, {rate: .8}), cut(536769, .2, .6, {highpass: 500, gain: .4})]),
  one('bowl.wall.hard', -18, [cut(675466, .1, 1.4, {rate: .9})]),
  one('bowl.wall.big', -17, [cut(237375, .3, 2, {rate: .85}), cut(859154, 0, 1.2, {lowpass: 500, gain: .6})]),
  one('bowl.wall.scrape', -19, [cut(337830, 1.2, 2, {lowpass: 8000, fadein: .05})]),
  // BOWL-TRICKS and BOWL-TRICKS-ALL
  one('bowl.trick.land', -19, [cut(640204, .25, .5, {rate: .8}), cut(151624, 0, .5, {lowpass: 3000, gain: .5, at: .02})]),
  one('bowl.trick.new', -19, [cut(764165, .2, 2.2, {fadein: .05}), cut(333693, 0, 1.5, {gain: .5})]),
  one('bowl.trick.slam', -16, [cut(807437, 0, .96, {rate: .8}), cut(504626, .3, 1, {lowpass: 300, gain: .7})]),
  one('bowl.trick.wheelie', -19, [cut(127981, 0, 2, {rate: .9, lowpass: 6000})]),
  one('bowl.trick.cyclone', -19, [cut(267249, .6, 2.4, {fadein: .15}), cut(536769, .1, 1.4, {gain: .5})]),
  one('bowl.trick.go', -21, [cut(485242, 0, .9)]),
  one('bowl.trick.late', -21, [cut(547589, 0, 1.1)]),
  one('bowl.secret.start', -21, [cut(881280, 0, 1.6)]),
  one('bowl.secret.found', -18, [cut(611112, 0, 2), cut(764163, 4, 2.4, {gain: .7, at: .1, fadein: .1})]),
  one('bowl.secret.cheer', -20, [cut(728774, .5, 2.5, {fadein: .1})]),
  one('bowl.secret.armed', -19, [cut(131930, .4, .9)]),
  one('bowl.secret.hint', -23, [cut(333695, 0, 1.3)]),
  // BOWL-HUD
  one('bowl.health.hit', -19, [cut(741351, .15, 1)]),
  one('bowl.health.danger', -21, [cut(514980, 0, 1.8, {lowpass: 6000})]),
  one('bowl.card.open', -24, [cut(828802, 0, .6)]),
  // BOWL-TRICK-SCHOOL
  one('bowl.school.tick', -24, [cut(844616, 0, .14), cut(333694, 0, 1.2, {gain: .3, at: .03})]),
  one('bowl.school.next', -22, [cut(538422, 0, .54)]),
  one('bowl.school.why', -23, [cut(571511, 0, .68)]),
  one('bowl.school.done', -19, [cut(875590, 1, 3, {fadein: .1})]),
  // BOWL-CRUSH
  one('bowl.crush.chain', -22, [cut(333694, 0, 1.6)]),
  one('bowl.crush.hint', -24, [cut(611111, 0, 1, {rate: 1.3, lowpass: 6000})]),             // BOWL-SCREEN-FIX
  one('bowl.crush.fullhouse', -17, [cut(267246, 2.5, 3.5, {fadein: .1}), cut(131930, .3, 1.5, {gain: .6})]),
  // BOWL-OUT-SIM
  one('bowl.out.over', -19, [cut(764204, .9, 1.8, {fadein: .05})]),
  one('bowl.out.stands', -18, [cut(730129, 1, 3, {fadein: .1}), cut(703248, 0, 1.2, {gain: .6})]),
  one('bowl.out.leap', -19, [cut(485240, 0, .9), cut(764101, .4, 2, {gain: .8, at: .2})]),
  one('bowl.out.gate', -19, [cut(682775, .2, 2.6)]),
  one('bowl.out.back', -19, [cut(728773, .3, 3, {fadein: .1})]),
  one('bowl.gate.shut', -17, [cut(682775, .2, 2.0, {rate: .78, lowpass: 6500}), cut(406557, 0, 1.2, {rate: .8, at: 1.7, gain: .75})]), // heavy steel rolls down and strikes the floor
  one('bowl.gate.open', -19, [cut(83887, .27, 2.3, {rate: .87, lowpass: 6500}), cut(453961, .48, 1.5, {at: .19, gain: .38})]), // the lift motor winds up and pulls the shutter clear
  // BOWL-RIVALS-2
  one('bowl.race.lights', -19, [cut(813525, 0, 4)]),
  one('bowl.race.finish', -17, [cut(131930, .3, 1.8), cut(267248, .4, 2.6, {gain: .7, at: .2, fadein: .1})]),
  one('bowl.rival.jump', -18, [cut(813054, 0, 1.4, {rate: .9})]),
  one('bowl.rival.jump.fallback', -18, [cut(813055, 0, 1.4, {rate: .9})]),
  // BOWL-REX-FIGHT and BOWL-REX-2: the Scrapasaurus. Its tells (roar, rise, brace) are animal; its body is metal.
  one('bowl.rex.roar', -17, [cut(476083, 0, 3.2, {rate: .85, lowpass: 8000})]),
  one('bowl.rex.fire', -17, [cut(395039, 2.2, 2.8, {fadein: .02})]),
  one('bowl.rex.fire.end', -20, [cut(447941, .9, 1)]),
  one('bowl.rex.scorch', -17, [cut(381855, .4, 1.4), cut(479296, .2, 1.2, {highpass: 1500, gain: .5, at: .3}), cut(675466, .1, .6, {gain: .5})]),
  one('bowl.rex.box.open', -19, [cut(881275, 0, 2)]),
  one('bowl.rex.bump', -17, [cut(813056, .2, 1.6, {rate: .8})]),
  one('bowl.rex.lift', -19, [cut(556714, 3, 2.4, {rate: .9, fadein: .1})]),
  one('bowl.rex.throw', -19, [cut(485240, 0, .9, {rate: .7})]),
  one('bowl.rex.throw.land', -15.5, [cut(675910, 3.6, 2, {rate: .8}), cut(859154, 0, 1.5, {rate: .8, lowpass: 800, gain: .7})]),
  one('bowl.rex.burst', -16, [cut(466830, 0, 3), cut(682775, .3, 1.6, {gain: .6})]),
  one('bowl.rex.sag', -20, [cut(489901, .8, 1.8, {rate: .6, lowpass: 2000, gain: .7}), cut(479296, 0, 2.4, {gain: .8})]),
  one('bowl.rex.rise', -19, [cut(132874, 0, 1.3, {rate: .8}), cut(813054, 0, 1.4, {gain: .8, at: .2})]),
  one('bowl.rex.sweep', -18, [cut(260555, 0, 3)]),
  one('bowl.rex.brace', -18, [cut(813055, 0, 1.6), cut(556714, 1, 1.6, {gain: .6})]),
  one('bowl.hook.fire', -18, [cut(521490, 0, 1.4), cut(453961, 1.1, .8, {gain: .6, at: .1})]),
  one('bowl.hook.bite', -18, [cut(399247, 0, 1.6)]),
  one('bowl.hook.clang', -18, [cut(406557, 0, 1.8)]),
  one('bowl.hook.tight', -21, [cut(829013, .8, 1.2, {lowpass: 3000}), cut(556714, 1.5, 1.2, {gain: .5})]),
  one('bowl.hook.jerk', -17, [cut(151624, 0, .5), cut(453961, 2.2, 1.2, {gain: .8}), cut(813054, .3, 1, {lowpass: 600, gain: .6})]),
  one('bowl.hook.letgo', -21, [cut(829013, 0, 1.3, {rate: 1.3, highpass: 800})]),
  one('bowl.rex.box.out', -15.5, [cut(881279, 0, .9), cut(398274, 0, 2, {gain: .6}), cut(859154, 0, 1.2, {gain: .6})]),
  one('bowl.rex.box.drag', -21, [cut(337830, 2.2, 1.8, {rate: .6, lowpass: 2500})]),
  one('bowl.rex.fall', -14, [cut(397691, 0, 3, {rate: .7, lowpass: 3000}), cut(703247, 0, 3, {rate: .7}),
    cut(476083, 2.5, 2, {rate: .6, gain: .5})]),
  one('bowl.rex.gate', -19, [cut(815039, 0, 1.8), cut(815039, 0, 1.8, {at: 1}), cut(132866, .3, 2.4, {lowpass: 1500, gain: .5, at: .5})]),
  // BOWL-JUMP-EVENTS and BOWL-NIGHT-4
  one('bowl.go.ready', -21, [cut(548549, 0, .2), cut(548549, 0, .2, {at: .25}), cut(728774, .5, 1, {gain: .3, at: .3})]),
  one('bowl.long.clear', -19, [cut(267249, 1, 2.4, {fadein: .1})]),
  one('bowl.high.clear', -18, [cut(728773, 1.2, 2.6, {fadein: .1}), cut(611112, 0, 1.5, {gain: .5})]),
  one('bowl.high.fail', -20, [cut(124996, 0, 2)]),
  one('bowl.best.rival', -18, [cut(127981, .5, 1.5, {rate: .85}), cut(131930, .5, 1, {gain: .5, at: .6})]),
  one('bowl.best.rival.slam', -16, [cut(675910, 4, 1.6, {rate: .85})]),
  one('bowl.best.round.won', -19, [cut(875589, 0, 2.1)]),
  one('bowl.best.round.lost', -20, [cut(764253, 0, 3)]),
  // BOWL-FREESTYLE-NIGHTS: the rival's score ticks in from a distant crowd, so it never covers the player's own.
  one('bowl.free.rival', -24, [cut(728774, 2, .8, {fadein: .05})]),
  one('bowl.free.lead', -19, [cut(267248, 1, 2.2, {fadein: .1})]),
  one('bowl.free.behind', -21, [cut(764216, 7.7, 1.1, {fadein: .05})]),
  one('bowl.free.beaten', -17, [cut(267249, 1.5, 1.8, {fadein: .1}), cut(131930, .3, 1.2, {gain: .6})]),
  one('bowl.free.bar', -19, [cut(611113, 0, 1.2), cut(728773, 2, 1.5, {gain: .6, at: .1, fadein: .1})]),
  // BOWL-NIGHTS and the cues already in the game
  one('bowl.night.open', -18, [cut(728774, 0, 3.5), cut(131930, .3, 1.8, {gain: .7, at: .3})]),
  one('bowl.night.new', -20, [cut(611111, 0, 2.5), cut(764165, .5, 1.8, {gain: .5, at: .3, fadein: .1})]),
  one('bowl.mo', -23, [cut(747200, 0, 1.5)]),                                                     // Big Mo's PA chime
  one('bowl.crowd.rise', -20, [cut(764216, 1, 2.8, {fadein: .2})]),
  one('bowl.event.won', -17, [cut(267246, .5, 3.5, {fadein: .1}), cut(131930, .3, 1.4, {gain: .6})]),
  one('bowl.event.lost', -20, [cut(619007, 0, 2.8)]),
  one('bowl.purse', -21, [cut(485718, .4, 2), cut(202531, .9, 1.3, {gain: .6, at: .3})]),
  one('bowl.turn.up', -22, [cut(457922, 0, 2)]),
  one('bowl.turn.winner', -18, [cut(859009, .5, 3.5, {fadein: .1}), cut(611113, 0, 1.5, {gain: .6})]),
]));
export const BOWL_SOUND_FILES = Object.freeze(Object.fromEntries(Object.entries(BOWL_SOUND_RECIPES)
  .map(([cue, takes]) => [cue, takes.map(spec => spec.file)])));

export function buildBowlSound({root = ROOT, library = libraryRoot(), only = null} = {}) {
  const catalogPath = join(root, 'tools/audio/catalog.json');
  const catalog = loadCatalog(catalogPath);
  const sources = new Map();
  for (const row of catalog.sounds) if (row.source === 'freesound' && row.license === 'CC0 1.0' && !sources.has(row.key)) sources.set(row.key, row);
  const previous = new Map(catalog.sounds.filter(row => BOWL_SOUND_RECIPES[row.cue]).map(row => [`${row.cue}|${row.key}`, row]));
  const rows = new Map(), results = [];
  for (const [cue, takes] of Object.entries(BOWL_SOUND_RECIPES)) for (const spec of takes) {
    for (const layer of spec.layers) if (!sources.has(layer.source)) throw Error(`${cue}: missing CC0 source ${layer.source}`);
    let runtime;
    const kept = previous.get(`${cue}|${spec.layers[0].source}`)?.runtime?.find(item => item.file === `public/assets/audio/${spec.file}`);
    if (only && !only.includes(cue) && kept) runtime = kept;
    else {
      const {bytes, measured, duration} = renderTake(spec, sources, library);
      const file = `public/assets/audio/${spec.file}`;
      mkdirSync(dirname(join(root, file)), {recursive: true});
      writeFileSync(join(root, file), bytes);
      runtime = {file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1, duration: Number(duration.toFixed(3)),
        integratedLufs: measured.integratedLufs, truePeakDbtp: measured.truePeakDbtp};
    }
    results.push({cue, ...runtime});
    spec.layers.forEach((layer, index) => {
      const key = `${cue}|${layer.source}`;
      if (!rows.has(key)) {
        const {cue: _cue, processing: _processing, runtime: _runtime, ...credit} = sources.get(layer.source);
        rows.set(key, {...credit, cue, processing: {script: SCRIPT, normalization: 'mix, 150 ms fade out, gain to the loudness in two passes, limiter .79 (1 ms attack, 60 ms release)',
          codec: 'Vorbis q5', uses: []}, runtime: []});
      }
      const row = rows.get(key);
      row.processing.uses.push({take: spec.file, ...layer, loudness: spec.loudness});
      if (index === 0) row.runtime.push(runtime);
    });
  }
  // Replace this card's rows and the fetch-time candidate rows; every other row keeps its place.
  const ours = row => row.cue === 'bowl.sound.candidate' || Boolean(BOWL_SOUND_RECIPES[row.cue]);
  catalog.sounds = [...catalog.sounds.filter(row => !ours(row)), ...rows.values()];
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
  return results;
}

// The listening sheet: the car-to-car crash first, then each take at the gain the bank plays it, through the
// game's .42 master, with its loudness and peak as played. A comparison of levels, not a mix with the engine.
export async function buildBowlSoundSheet(out, root = ROOT) {
  const {SOUND_BANK} = await import(pathToFileURL(join(root, 'src/sound-bank.js')).href);
  const items = [...SOUND_BANK['vehicle.crash.recorded'].files.map(file => ({cue: 'vehicle.crash.recorded', file, volume: SOUND_BANK['vehicle.crash.recorded'].volume})),
    ...Object.entries(BOWL_SOUND_FILES).flatMap(([cue, files]) => files.map(file => ({cue, file, volume: SOUND_BANK[cue].volume})))];
  const parts = [], labels = [];
  let time = 0;
  mkdirSync(out, {recursive: true});
  for (const item of items) {
    const bytes = readFileSync(join(root, 'public/assets/audio', item.file));
    const gain = item.volume * .42;
    const played = ffmpeg(['-threads', '1', '-i', 'pipe:0', '-af', `volume=${gain}`, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
    const asPlayed = measureLoudness(ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-f', 'wav', 'pipe:1'], {input: played}));
    const duration = played.length / 4 / RATE;
    labels.push({cue: item.cue, start: Number(time.toFixed(2)), duration: Number(duration.toFixed(2)),
      fileLufs: measureLoudness(bytes).integratedLufs, playedLufs: asPlayed.integratedLufs, playedPeakDbtp: asPlayed.truePeakDbtp});
    parts.push(played, Buffer.alloc(RATE * 4 * .8));
    time += duration + .8;
  }
  const sheet = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1',
    '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], {input: Buffer.concat(parts)});
  writeFileSync(join(out, 'bowl-sound-sheet.mp3'), sheet);
  writeFileSync(join(out, 'bowl-sound-sheet.json'), JSON.stringify(labels, null, 2) + '\n');
  return labels;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const at = process.argv.indexOf('--sheet'), only = process.argv.indexOf('--only');
  if (at > 0) console.table(await buildBowlSoundSheet(resolve(process.argv[at + 1])));
  else console.table(buildBowlSound({only: only > 0 ? process.argv[only + 1].split(',') : null}).map(({cue, duration, integratedLufs, truePeakDbtp, bytes}) =>
    ({cue, duration, integratedLufs, truePeakDbtp, bytes})));
}
