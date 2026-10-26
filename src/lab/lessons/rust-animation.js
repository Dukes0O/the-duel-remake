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
  const objects = [box('part-dial', [-1.05, 1.43, .6], [.55, .25, .4], '#e4b35f', 'partDial'),
    box('jar-dial', [0, 1.55, .6], [.4, .5, .3], '#71c9ff', 'jarDial'),
    box('coat-dial', [1.05, 1.55, .6], [.4, .5, .3], '#c1c9c9', 'coatDial')];
  objects.forEach(o => { o.opacity = 0; });
  const props = [
    {id: 'tray', model: 'supplies-table', position: [0, 0, .65]},
    {id: 'part', model: `${load.part === 'underbody' ? 'underbody-panel' : load.part === 'exhaust' ? 'exhaust-pipe' : 'armour-plate'}`, position: [-1.05, 1.39, .6]},
    {id: 'water', model: load.jar === 'dry' ? 'dry-air-jar' : load.jar === 'salt' || load.jar === 'zinc' ? 'salt-bag' : 'water-jug', position: [0, 1.39, .6], scale: .85},
    {id: 'coat', model: load.protection === 'paint' ? 'paint-tin' : load.protection === 'zinc' ? 'zinc-can' : 'steel-bar', position: [1.05, 1.39, .6], scale: .85},
  ];
  if (mode === 'jars') {
    props.length = 0;
    for (const [i, jar] of JARS.entries()) props.push({id: `tag-${jar.id}`, model: `jar-${jar.id}-tag`, position: [-.9 + i * .6, 1.52, .39], scale: .9});
  }
  return {input: load, actual: rustState(rustTrial(load).rust), reading: rows.map(r => r.rust), rows, mode, days,
    objects, props,
    captions: mode === 'jars' ? rows.slice(1).map(r => `${Math.round(r.rust * 100)}% rust\n${days.toFixed(0)} days`) :
      [`${load.part} · ${load.protection}`, `${days.toFixed(1)} days\n${Math.round(rows[0].rust * 100)}% rust`, rows[0].zincLeft === null ? '' : `${Math.round(rows[0].zincLeft * 100)}% zinc left`],
    captionAnchors: mode === 'jars' ? [[-.3, 1.62, .02], [.3, 1.62, .02], [.9, 1.62, .02]] : [[-1.05, 1.5, .6], [0, 2.08, .02], [1.05, 1.5, .6]],
    captionOffsets: mode === 'jars' ? [[-50, 65], [-50, 65], [-50, 65]] : [[-100, 20], [-80, -70], [10, -20]],
    captionWidth: mode === 'jars' ? 105 : 210,
    camera: mode === 'jars' ? camera([.65, 2.0, 2.75], [0, 1.55, 0]) : camera([1.4, 2.0, 3.05], [0, 1.35, 0]),
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
      // The old shelf dot-tags become blank slabs when a jar is enlarged.
      // Remove only those forward tag triangles from this private clone;
      // the new stamped identities replace them without covering supplies.
      if (!part.userData.namedTags) {
        part.userData.namedTags = true;
        part.traverse(n => {
          const g = n.geometry, p = g?.attributes.position;
          if (!p) return;
          const old = g.index?.array ?? Array.from({length: p.count}, (_, k) => k), kept = [];
          for (let k = 0; k < old.length; k += 3) if ([old[k], old[k + 1], old[k + 2]].some(v => p.getZ(v) < .2)) kept.push(old[k], old[k + 1], old[k + 2]);
          if (kept.length === old.length) return;
          g.setIndex(kept); n.geometry = g.toNonIndexed(); g.dispose();
          n.geometry.computeBoundingSphere();
        });
      }
      part.visible = d.mode === 'jars' || jar.id === d.input.jar;
      if (d.mode !== 'jars') { part.position.x = 0; part.scale.setScalar(2.2); }
      else { part.position.x = [-.9, -.3, .3, .9][i]; part.scale.setScalar(1.9); }
      const row = d.mode === 'jars' ? d.rows[i] : d.rows[0];
      part.traverse(n => {
        const colours = n.geometry?.attributes.color;
        if (!colours || n.material?.transparent) return;
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
