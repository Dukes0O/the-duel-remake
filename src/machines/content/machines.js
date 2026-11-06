// Machine content is data. Model node names stay here so the sim never needs a renderer.
export const MACHINE_CONTENT = Object.freeze({
  excavator: Object.freeze({
    id:'excavator', name:'Excavator', driveKind:'tracks', massKg:18_000, maxSpeedMps:2.2,
    turnRateRadPerSecond:0.9, trackWidthM:2.2, maxLoadKg:3_200, startAngles:Object.freeze({boom:0.42}),
    cabEye:Object.freeze([-0.72,3.05,0.1]), cabTurnsWith:'house',
    // Pivots and lengths come from machines-1.glb, so the bucket the sim digs with is the bucket on screen.
    joints:Object.freeze([
      Object.freeze({name:'house', control:'swing', modelNode:'excavator:cab', parent:null, origin:[0,1.88,-0.12], axis:[0,-1,0], limits:[-Math.PI,Math.PI], rate:0.75}),
      Object.freeze({name:'boom', control:'boom', modelNode:'excavator:boom', parent:'house', origin:[0,-1.16,0.36], axis:[-1,0,0], limits:[-0.2,0.95], rate:0.45}),
      Object.freeze({name:'arm', control:'arm', modelNode:'excavator:arm', parent:'boom', origin:[0,1.12,5.5], axis:[-1,0,0], limits:[-1.2,0.9], rate:0.65}),
      Object.freeze({name:'bucket', control:'bucket', modelNode:'excavator:bucket', parent:'arm', origin:[0,-1.65,2.34], axis:[-1,0,0], limits:[-1.1,1.1], rate:0.9}),
    ]),
    tools:Object.freeze({bucket:Object.freeze({kind:'bucket', joint:'bucket', offset:[0,-0.7,0.55], capacityM3:0.8, radiusM:0.55, cutRateM3s:0.45, dischargeRateM3s:0.8})}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['swing','boom','arm','bucket'])}),
  }),
  dumpTruck: Object.freeze({
    id:'dump-truck', name:'Dump truck', driveKind:'wheels', massKg:12_000, maxSpeedMps:12,
    turnRateRadPerSecond:0.7, maxLoadKg:18_000, joints:Object.freeze([]), cabEye:Object.freeze([-0.6,3.05,2.6]),
    tools:Object.freeze({bed:Object.freeze({kind:'bed', capacityM3:8, radiusM:1.8, widthM:2.5, lengthM:5, centerZ:-0.8, offset:[0,0,-5.2], dischargeRateM3s:2})}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['bed'])}),
  }),
  trencher: Object.freeze({
    id:'trencher', name:'Trencher', driveKind:'tracks', massKg:8_500, maxSpeedMps:0.8,
    turnRateRadPerSecond:0.55, trackWidthM:1.8, maxLoadKg:0, cabEye:Object.freeze([0,2.65,0.2]),
    joints:Object.freeze([
      Object.freeze({name:'boom', control:'boom', modelNode:'trencher:boom', parent:null, origin:[0,1.02,-1.82], axis:[1,0,0], limits:[-0.9,0.2], rate:0.8}),
    ]),
    tools:Object.freeze({chain:Object.freeze({kind:'chain', joint:'boom', offset:[0,-0.6,-0.8], widthM:1, depthM:1.5, rearM:3,
      radiusM:0.5, cutRateM3s:1.5, ridgeOffsetM:1.4, ridgeRadiusM:0.5})}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['boom','chain'])}),
  }),
});

export function machineDefinition(id) {
  const definition = MACHINE_CONTENT[id];
  if (!definition) throw new RangeError(`Unknown machine: ${id}`);
  return definition;
}

export function defineMachine(definition) {
  if (!definition || typeof definition.id !== 'string' || !['wheels','tracks','fixed'].includes(definition.driveKind) ||
      !Number.isFinite(definition.massKg) || definition.massKg <= 0 || !Number.isFinite(definition.maxSpeedMps) ||
      definition.maxSpeedMps < 0 || !Number.isFinite(definition.maxLoadKg) || definition.maxLoadKg < 0 ||
      !Array.isArray(definition.joints) || !definition.tools || typeof definition.tools !== 'object' || !definition.controls)
    throw new TypeError('Machine definitions need a drive kind, mass, joints, tools and control sets.');
  return Object.freeze({...definition, joints:Object.freeze([...definition.joints]), tools:Object.freeze({...definition.tools})});
}
