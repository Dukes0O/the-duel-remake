import {JARS, jarAfter} from '../benches/rust.js';
import {RUST_WEEK, RUST_PARTS, rustOf} from '../lab-workshop.js';
import {createSirenaVehicle} from '../../sirena-vehicle.js';
import {box, camera, mountMachine, pictureBase} from './workshop-display.js';

export const rustState = share => share <= .1 ? 'clean' : share <= .3 ? 'spots' : 'rusty';
const coatings = ['bare', 'paint', 'zinc'];
export const readRust = input => ({part: RUST_PARTS[Math.round(input.partDial ?? 0)].id,
  jar: JARS[Math.round(input.jarDial ?? 2)].id, protection: coatings[Math.round(input.coatDial ?? 0)]});
export function rustTrial(load, days = RUST_WEEK) {
  const jar = JARS.find(j => j.id === load.jar);
  const paintLasts = load.protection === 'paint' && load.part !== 'exhaust';
  return jarAfter({...jar, water: paintLasts ? false : jar.water, zinc: load.protection === 'zinc'}, days);
}
export const rustSamples = {
  clean: {part: 'armour', jar: 'salt', protection: 'zinc'},
  spots: {part: 'armour', jar: 'fresh', protection: 'bare'},
  rusty: {part: 'underbody', jar: 'salt', protection: 'bare'},
};
export function rustDrawing(load, time, mode = 'try') {
  const days = Math.min(RUST_WEEK, time / 10 * RUST_WEEK);
  const rows = mode === 'jars' ? JARS.map(j => jarAfter(j, days)) : [rustTrial(load, days)];
  return {input: load, actual: rustState(rustTrial(load).rust), reading: rows.map(r => r.rust), rows, mode, days,
    objects: [box('part-dial', [-1.3, 1.65, .7], [.25, .25, .25], '#e4b35f', 'partDial'),
      box('jar-dial', [0, 1.65, .7], [.25, .25, .25], '#71c9ff', 'jarDial'),
      box('coat-dial', [1.3, 1.65, .7], [.25, .25, .25], '#c1c9c9', 'coatDial')],
    captions: mode === 'jars' ? [`${days.toFixed(1)} days`, 'Dry / Fresh / Salt / Zinc', `${Math.round(rows[2].rust * 100)}% rust in salt water`] :
      [`${load.part} · ${load.protection}`, `${days.toFixed(1)} days\n${Math.round(rows[0].rust * 100)}% rust`, rows[0].zincLeft === null ? '' : `${Math.round(rows[0].zincLeft * 100)}% zinc left`],
    camera: camera([.1, 2.25, 3.2], [0, 1.55, 0]),
    streams: load.jar === 'dry' ? [] : [{medium: 'water', origin: [-.3, 2.1, .1], direction: [0, -1, 0], speed: .2, length: .35, radius: .65}],
  };
}
export function mountRust(options) {
  let sirena;
  return mountMachine(options, 'nail-jars', (machine, d, clock, own, {group}) => {
    if (!sirena) { sirena = createSirenaVehicle({color: 0x99502a, accent: 0x9d653a}); sirena.scale.setScalar(.4); sirena.rotation.y = Math.PI / 2; sirena.position.set(0, .9, .3); group.add(sirena); own.push(sirena); }
    sirena.visible = d.mode === 'wonder'; machine.visible = d.mode !== 'wonder';
    for (const [i, jar] of JARS.entries()) {
      const part = machine.getObjectByName(`jar-${jar.id}`);
      if (!part) continue;
      part.visible = d.mode === 'jars' || i === 1;
      if (d.mode !== 'jars') { part.position.x = 0; part.scale.setScalar(2.2); }
      else { part.position.x = [-.9, -.3, .3, .9][i]; part.scale.setScalar(1); }
      const row = d.mode === 'jars' ? d.rows[i] : d.rows[0];
      part.traverse(n => {
        const colours = n.geometry?.attributes.color;
        if (!colours || n.name === 'glass') return;
        for (let k = 0; k < colours.count; k++) {
          const rust = row.rust * (.5 + .5 * (Math.sin(k * 7.13) ** 2));
          colours.setXYZ(k, .65 * (1 - rust) + .48 * rust, .7 * (1 - rust) + .17 * rust, .7 * (1 - rust) + .035 * rust);
        }
        colours.needsUpdate = true;
      });
    }
  });
}
export function rustPicture(load, protectionCheck = false) {
  const share = protectionCheck ? rustOf(load.part, load.protection) : rustTrial(load).rust;
  return (ctx, w, h) => {
    pictureBase(ctx, w, h);
    ctx.fillStyle = '#447487'; ctx.globalAlpha = .55; ctx.fillRect(72, 47, 115, 68); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#bdd7de'; ctx.lineWidth = 3; ctx.strokeRect(68, 27, 123, 88);
    ctx.fillStyle = '#c6d2d3'; ctx.fillRect(122, 27, 12, 70); ctx.fillRect(110, 25, 36, 8);
    for (let i = 0; i < Math.round(share * 30); i++) {
      ctx.fillStyle = '#ce672a'; ctx.fillRect(121 + (i % 3) * 4, 38 + ((i * 17) % 57), 6, 8);
    }
    if (load.protection !== 'bare') { ctx.strokeStyle = load.protection === 'zinc' ? '#edf3f3' : '#619dff'; ctx.lineWidth = 5; ctx.strokeRect(119, 24, 18, 76); }
    ctx.fillStyle = '#f5f0dc'; ctx.fillText(`${Math.round(share * 100)}%`, 223, 75);
  };
}
