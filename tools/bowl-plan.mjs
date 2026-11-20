// The Bowl's floor seen from above, drawn from the course's own data (BOWL-EXPAND).
//   node tools/bowl-plan.mjs .evidence/bowl-plan.svg
// Open the picture in a browser, or turn it into the look sheet with a headless
// Chrome screenshot. Nothing here is read by the game.
import {writeFileSync} from 'node:fs';
import {Course} from '../src/course.js';
import {BOWL_COURSE, BOWL_FLOOR, BOWL_BANK, BOWL_RING, bowlCentre} from '../src/bowl/bowl-course.js';
import {spawnSlots} from '../src/arena/venues.js';

const out = process.argv[2] ?? '.evidence/bowl-plan.svg';
const course = new Course(BOWL_COURSE, 1989), bowl = course.features.bowl, centre = bowlCentre(course);
const SCALE = 6.2, LEFT = 90, TOP = 170, WIDTH = 1300, HEIGHT = 1430;
// World z runs left to right on the page, world x runs down it.
const px = p => [LEFT + (p.z - (centre.z - 82)) * SCALE, TOP + (p.x - (centre.x - 47)) * SCALE];
const at = (s, off) => px(course.worldAt(s, off));
const path = points => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z';
const ring = (off, step = 1) => { const points = []; for (let s = 0; s < course.length; s += step) points.push(at(s, off)); return points; };
const band = (start, end, from, to, step = .5) => {
  const points = [];
  for (let s = start; s <= end; s += step) points.push(at(s, from));
  for (let s = end; s >= start; s -= step) points.push(at(s, to));
  return points;
};
const text = (x, y, words, size = 15, colour = '#2b2118', anchor = 'middle', weight = 400) =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${colour}" text-anchor="${anchor}" font-weight="${weight}">${words}</text>`;
const dim = (a, b, label, offset = 0, colour = '#1d3d5c') => {
  const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="1.6" marker-start="url(#tick)" marker-end="url(#tick)"/>` +
    text(mx, my - 6 + offset, label, 15, colour, 'middle', 600);
};

const parts = [];
const floor = BOWL_FLOOR, face = floor.outerWallOffset - .5, spineFace = floor.wallOffset - .5;
const across = 2 * (BOWL_RING.radius + face), along = BOWL_RING.straight + across;
// The stands' foot, the wall and the floor.
parts.push(`<path d="${path(ring(face + 6))}" fill="#9c9a92"/>`);
parts.push(`<path d="${path(ring(face + .9))}" fill="#5d5a55"/>`);
parts.push(`<path d="${path(ring(face))}" fill="#b98c5c"/>`);
// The banked ends, shaded by height.
for (const [start, end] of [bowl.zones.end1, bowl.zones.end2]) for (let k = 0; k < 6; k++) {
  const from = BOWL_BANK.from + (BOWL_BANK.to - BOWL_BANK.from) * k / 6, to = BOWL_BANK.from + (BOWL_BANK.to - BOWL_BANK.from) * (k + 1) / 6;
  parts.push(`<path d="${path(band(start + 4, end - 4, from, to))}" fill="#8a5a33" opacity="${(.12 + k * .1).toFixed(2)}"/>`);
}
// A football field (110 m by 49 m) and the old Bowl's floor, both to scale, for comparison.
const field = [[-55, -24.5], [55, -24.5], [55, 24.5], [-55, 24.5]].map(([z, x]) => px({x: centre.x + x, z: centre.z + z}));
parts.push(`<path d="${path(field)}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="10 7" opacity=".9"/>`);
const old = (a, b, off) => { const points = []; for (let i = 0; i < 256; i++) { const t = i / 256 * Math.PI * 2;
  points.push(px({x: centre.x + Math.sin(t) * (b + off), z: centre.z + Math.cos(t) * (a + off)})); } return points; };
parts.push(`<path d="${path(old(27.2, 16.7, 9)) + path(old(27.2, 16.7, -8.5))}" fill="#f2e3b3" fill-rule="evenodd" opacity=".45" stroke="#6b4f1d" stroke-width="1.2" stroke-dasharray="4 3"/>`);
// The Spine.
parts.push(`<path d="${path(ring(-spineFace, .5))}" fill="none"/>`);
const half = bowl.spine.halfWidth, spine = [[-35, -half], [35, -half], [35, half], [-35, half]].map(([z, x]) => px({x: centre.x + x, z: centre.z + z}));
parts.push(`<path d="${path(spine)}" fill="#3e4a52" stroke="#1d2328" stroke-width="1.2"/>`);
// The jumps, with their heights.
for (const ramp of course.features.ramps) {
  const across = ramp.halfWidth + ramp.flank;
  parts.push(`<path d="${path(band(ramp.start, ramp.end, ramp.off - across, ramp.off + across))}" fill="#6e4424" opacity=".55"/>`);
  parts.push(`<path d="${path(band(ramp.start + (ramp.profile === 'table' ? 0 : ramp.length * .3), ramp.end - (ramp.profile === 'table' ? 0 : ramp.length * .3),
    ramp.off - ramp.halfWidth, ramp.off + ramp.halfWidth))}" fill="#4f2e16"/>`);
  const [x, y] = at((ramp.start + ramp.end) / 2, ramp.off);
  const title = ramp.id === 'big-jump' ? 'Big Jump' : ramp.id === 'table' ? 'Table' : 'kicker';
  parts.push(text(x, y - 3, title, 13, '#ffffff', 'middle', 700) + text(x, y + 13, `${ramp.height} m, ${ramp.length} m`, 12, '#ffffff', 'middle', 600));
}
// The crush line and the launch cars.
const box = (feature, colour) => {
  const c = course.worldAt(feature.s, feature.off), h = c.heading, sn = Math.sin(h), cs = Math.cos(h);
  const corner = (u, v) => px({x: c.x + cs * u + sn * v, z: c.z - sn * u + cs * v});
  return `<path d="${path([corner(-feature.halfX, -feature.halfZ), corner(feature.halfX, -feature.halfZ), corner(feature.halfX, feature.halfZ), corner(-feature.halfX, feature.halfZ)])}" fill="${colour}" stroke="#1a1410" stroke-width=".8"/>`;
};
for (const prop of course.features.crushables)
  parts.push(box(prop, prop.sourceKind === 'bowlBurningHeap' ? '#d4541c' : prop.sourceKind === 'junkCar' ? '#61746a' : '#c9b37a'));
for (const car of bowl.launchCars) parts.push(box({...car, off: car.lateral, halfX: .95, halfZ: 2.3}, '#2f6f9e'));
// The Scrapasaurus's rails, and the lanes.
const rails = ring(bowl.rails.lateral, .5);
parts.push(`<path d="${path(rails)}" fill="none" stroke="#8c1d18" stroke-width="2.4" stroke-dasharray="3 5"/>`);
parts.push(`<path d="${path(ring(0, .5))}" fill="none" stroke="#f6f1e4" stroke-width="2" stroke-dasharray="14 9"/>`);
// Flame jets.
for (const jet of course.features.flameJets) { const [x, y] = at(jet.s, jet.off); parts.push(`<circle cx="${x}" cy="${y}" r="5" fill="#ff8a1e" stroke="#5b2200"/>`); }
// Start slots for Last Truck Rolling.
for (const slot of spawnSlots(course)) { const [x, y] = at(slot.s, slot.lateral);
  parts.push(`<circle cx="${x}" cy="${y}" r="8" fill="#ffffff" stroke="#333" stroke-width="1.2"/>` + text(x, y + 4.5, slot.index + 1, 11, '#333')); }
// Arrows: the two Side by Side starts and the Car Crush start.
const arrow = (s, off, colour, label, labelOff = 0) => {
  const [x1, y1] = at(s, off), [x2, y2] = at(s + 9, off), [lx, ly] = at(s + 4, off + labelOff);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="5" marker-end="url(#head)"/>` + text(lx, ly, label, 14, colour, 'middle', 700);
};
parts.push(arrow(bowl.lanes[0].s, 0, '#0d5c2e', 'Side by Side start', -4));
parts.push(arrow(bowl.lanes[1].s, 0, '#0d5c2e', 'Side by Side start', -4));
parts.push(arrow(bowl.crush.startS, bowl.crush.lateral, '#7a2a00', 'Car Crush start', 4));
// A Titan to scale beside the Jump Straight's start.
parts.push(box({s: 12, off: 9, halfX: 1.4, halfZ: 2.6}, '#58329b'));
{ const [x, y] = at(12, 13.5); parts.push(text(x, y + 4, 'a Titan to scale', 13, '#3b1f6e', 'middle', 600)); }
// Names of the parts.
for (const [s, off, words] of [[8, 18, 'THE JUMP STRAIGHT (main stand)'], [64 + bowl.halfLap, 18, 'THE CRUSH STRAIGHT (far stand)'],
  [bowl.halfLap / 2 + 35, 0, 'END 1: banked bowl'], [bowl.halfLap * 1.5 + 35, 0, 'END 2: banked bowl']]) {
  const [x, y] = at(s, off); parts.push(text(x, y + 5, words, 15, '#2b2118', 'middle', 700));
}
{ const [x, y] = at(35, -21.9 + 3.2); parts.push(text(x, y + 5, `THE SPINE: shipping containers, ${(2 * bowl.spine.halfWidth).toFixed(1)} m wide`, 13, '#20282d', 'middle', 700)); }
// Dimensions.
const ends = [px({x: centre.x - across / 2 - 9, z: centre.z - along / 2}), px({x: centre.x - across / 2 - 9, z: centre.z + along / 2})];
parts.push(dim(ends[0], ends[1], `${along.toFixed(1)} m between the end walls`, -4));
const sides = [px({x: centre.x - across / 2, z: centre.z + along / 2 + 6}), px({x: centre.x + across / 2, z: centre.z + along / 2 + 6})];
parts.push(`<line x1="${sides[0][0]}" y1="${sides[0][1]}" x2="${sides[1][0]}" y2="${sides[1][1]}" stroke="#1d3d5c" stroke-width="1.6" marker-start="url(#tick)" marker-end="url(#tick)"/>`);
parts.push(`<text transform="translate(${sides[0][0] + 22},${(sides[0][1] + sides[1][1]) / 2}) rotate(90)" font-size="15" fill="#1d3d5c" text-anchor="middle" font-weight="600">${across.toFixed(1)} m between the side walls</text>`);
parts.push(dim(at(64, -20), at(64, 20), '', 0, '#f6f1e4'));
{ const [x, y] = at(62.2, 6); parts.push(`<text transform="translate(${x},${y}) rotate(90)" font-size="13" fill="#f6f1e4" text-anchor="middle" font-weight="600">40 m of floor</text>`); }
parts.push(dim(at(0, 21.9 + 7.5), at(70, 21.9 + 7.5), '', 0));
{ const [x, y] = at(35, 21.9 + 9.5); parts.push(text(x, y + 6, 'each straight 70 m, the Spine 70 m', 14, '#1d3d5c', 'middle', 600)); }

for (const gate of bowl.gates) {
  const [x,y] = at(gate.s,gate.lateral);
  parts.push(box({s:gate.s,off:gate.lateral,halfX:3,halfZ:gate.width/2},'#6ea889'));
  parts.push(text(x, y-12, gate.name, 12, '#183c30', 'middle', 700));
}
const legend = [
  ['#4f2e16', 'jump (dark: full height)'], ['#8a5a33', 'banked end, rising to 3.2 m at the wall'], ['#61746a', 'crush line: junk cars'],
  ['#c9b37a', 'buses and RV'], ['#d4541c', 'burning stacks'], ['#2f6f9e', 'parked cars for the launch off cars'],
  ['#ff8a1e', 'flame jet'], ['#8c1d18', 'Scrapasaurus rails, 16.5 m out'], ['#f6f1e4', 'centre line: the Side by Side lanes'],
  ['#ffffff', 'Last Truck Rolling start slots'], ['#f2e3b3', 'the old Bowl floor, to scale'], ['#ffffff', 'a football field, 110 m by 49 m (dashed)'],
];
const legendParts = legend.map(([colour, words], i) => {
  const x = 60 + (i % 3) * 410, y = 92 + Math.floor(i / 3) * 0 + 0;
  const row = Math.floor(i / 3), cx = 60 + (i % 3) * 410, cy = 822 + row * 24;
  return `<rect x="${cx}" y="${cy - 12}" width="16" height="14" fill="${colour}" stroke="#444" stroke-width=".8"/>` + text(cx + 24, cy, words, 14, '#2b2118', 'start');
});

// The floor plan above keeps its existing scale. Draw the whole outside below
// at its own scale so both the outer bank and the two tunnel mouths fit.
const outMap = (s,off) => {
  const p = course.worldAt(s,off);
  return [650 + (p.z-centre.z)*1.3,1175 + (p.x-centre.x)*1.3];
};
const exterior = bowl.outside;
parts.push(text(650,950,'Terraces, car park and return gates',20,'#2b2118','middle',700));
for (const [offset, fill] of [[exterior.bank,'#a58b70'],[exterior.bank-2,'#bfc1b9'],
  [exterior.back,'#726a61'],[exterior.front,'#b98c5c']]) {
  const points=[];
  for(let s=0;s<course.length;s++) points.push(outMap(s,offset));
  parts.push(`<path d="${path(points)}" fill="${fill}"/>`);
}
for (const car of exterior.parking) {
  const [x,y]=outMap(car.s,car.off);
  parts.push(`<rect x="${x-3}" y="${y-1.5}" width="6" height="3" fill="#485850"/>`);
}
for (const gate of bowl.gates) {
  const [x,y]=outMap(gate.s,exterior.front), [bx,by]=outMap(gate.s,exterior.back);
  parts.push(`<line x1="${x}" y1="${y}" x2="${bx}" y2="${by}" stroke="#c4ebd0" stroke-width="${gate.width*1.3}"/>`);
  const throat = exterior.back - (gate.mouthWidth-gate.width)/2;
  const reach = gate.guideLength/Math.sqrt(2);
  const guides = [-1,1].map(side => [
    outMap(gate.s+side*gate.width/2,throat),
    outMap(gate.s+side*(gate.width/2+reach),throat+reach)
  ]);
  parts.push(`<polygon points="${[...guides[0],...guides[1].slice().reverse()].map(p=>p.join(',')).join(' ')}" fill="#c4ebd0"/>`);
  for (const [a,b] of guides) parts.push(`<path d="M${a.join(',')} L${b.join(',')}" stroke="#183c30"/>`);
  parts.push(text(bx,by + (by>1175?17:-7),gate.name,12,'#183c30','middle',700));
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="Segoe UI, Arial, sans-serif">
<defs><marker id="tick" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M5,0L5,10" stroke="#1d3d5c" stroke-width="2"/></marker>
<marker id="head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0L10,5L0,10Z" fill="context-stroke"/></marker></defs>
<rect width="100%" height="100%" fill="#efe9dc"/>
${text(WIDTH / 2, 40, 'The Bowl, made far larger (BOWL-EXPAND): the floor from above, to scale', 24, '#2b2118', 'middle', 700)}
${text(WIDTH / 2, 66, 'Drawn from the course data in src/bowl/bowl-course.js. The lap starts at the left end of the Jump Straight (bottom) and runs to the right.', 15, '#4a3c2c')}
${parts.join('\n')}
${legendParts.join('\n')}
</svg>`;
writeFileSync(out, svg);
console.log(`Wrote ${out}`);
