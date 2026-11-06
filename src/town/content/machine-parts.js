const part = (id, name, picture) => Object.freeze({id, name, picture});
const machine = (id, name, picture, parts, predecessor = null) => Object.freeze({
  id, name, picture, predecessor, parts:Object.freeze(parts),
});

export const SCRAPYARD_MACHINES = Object.freeze([
  machine('flatbed', 'Flatbed', 'machine-flatbed', []),
  machine('trencher', 'Trencher', 'machine-trencher', [
    part('tractor-wreck', 'A tractor wreck', 'part-tractor-wreck'),
    part('dig-chain', 'A digging chain', 'part-dig-chain'),
    part('hydraulic-ram', 'A hydraulic ram', 'part-hydraulic-ram'),
  ], 'flatbed'),
  machine('dump-truck', 'Dump truck', 'machine-dump-truck', [
    part('truck-cab', 'A truck cab', 'part-truck-cab'),
    part('axle-pair', 'A pair of axles', 'part-axle-pair'),
    part('tip-ram', 'A tipping ram', 'part-tip-ram'),
  ], 'trencher'),
  machine('excavator', 'Excavator', 'machine-excavator', [
    part('crawler-base', 'A crawler base', 'part-crawler-base'),
    part('airliner-ram-pair', 'Two landing-gear rams', 'part-airliner-ram-pair'),
    part('digging-bucket', 'A digging bucket', 'part-digging-bucket'),
  ], 'dump-truck'),
]);

export const MACHINE_PARTS = Object.freeze(SCRAPYARD_MACHINES.flatMap(row => row.parts));
