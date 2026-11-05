// Machine content is data. Model node names stay here so the sim never needs a renderer.
export const MACHINE_CONTENT = Object.freeze({
  excavator: Object.freeze({
    id:'excavator', name:'Excavator', driveKind:'tracks', massKg:18_000, maxSpeedMps:2.2,
    turnRateRadPerSecond:0.9, trackWidthM:2.2, maxLoadKg:3_200,
    joints:Object.freeze([
      Object.freeze({name:'house', control:'swing', modelNode:'House', parent:null, origin:[0,1.15,0], axis:[0,1,0], limits:[-Math.PI,Math.PI], rate:0.75}),
      Object.freeze({name:'boom', control:'boom', modelNode:'Boom', parent:'house', origin:[0,0,0.15], axis:[1,0,0], limits:[-0.45,0.75], rate:0.45}),
      Object.freeze({name:'arm', control:'arm', modelNode:'Arm', parent:'boom', origin:[0,0,2.1], axis:[1,0,0], limits:[-1.8,0.35], rate:0.65}),
      Object.freeze({name:'bucket', control:'bucket', modelNode:'Bucket', parent:'arm', origin:[0,0,1.55], axis:[1,0,0], limits:[-1.25,1.25], rate:0.9}),
    ]),
    tools:Object.freeze({bucket:Object.freeze({kind:'bucket', joint:'bucket', offset:[0,0,0.65], capacityM3:0.8, radiusM:0.55, cutRateM3s:0.45, dischargeRateM3s:0.8})}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['swing','boom','arm','bucket'])}),
  }),
  dumpTruck: Object.freeze({
    id:'dump-truck', name:'Dump truck', driveKind:'wheels', massKg:12_000, maxSpeedMps:12,
    turnRateRadPerSecond:0.7, maxLoadKg:18_000, joints:Object.freeze([]),
    tools:Object.freeze({bed:Object.freeze({kind:'bed', capacityM3:8, radiusM:1.8, dischargeRateM3s:2})}),
    controls:Object.freeze({drive:Object.freeze(['forward','steer']), work:Object.freeze(['bed'])}),
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
