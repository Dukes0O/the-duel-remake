import {TREMBLANT_WOODS, manifest as parentManifest} from './tremblant-woods.js';
import {reverseVariant} from '../circuit-variants.js';
import {buildTrackScript} from '../track-script.js';

function reversePlacements(definition, {mappedKit}) {
  const road = buildTrackScript(definition), wrap = s => ((s % road.length) + road.length) % road.length;
  const rows = TREMBLANT_WOODS.kitPlacements.filter(p => !/^braking-board-/.test(p.id)).map(mappedKit);
  // The parent needs extra warnings where its larger-radius bends have no
  // automatic boards. Rebuild only missing warnings on the new approach.
  const names = ['Ridge Corner', "Devil's Chicane 1", 'Lodge Bend', 'Final Turn', 'Beaver Hairpin'];
  for (const name of names) {
    const corner = road.pieces.find(p => p.name === name);
    for (const distance of [150, 100, 50]) {
      const s = wrap(corner.s0 - distance);
      if (road.pieceAt(s).kind !== 'straight' || road.boards.some(b => b.name === name && b.distance === distance)) continue;
      rows.push({id: 'braking-board-' + distance, s,
        lateral: -corner.dir * (road.halfWidthAt(s) + 2.4), heading: Math.PI, scale: 1});
    }
  }
  return rows;
}
export const {definition, manifest} = reverseVariant(TREMBLANT_WOODS, parentManifest, {
  id: 'tremblant-woods-reverse', name: 'Tremblant Woods Reverse', releaseOrder: 11, placements: reversePlacements,
});
