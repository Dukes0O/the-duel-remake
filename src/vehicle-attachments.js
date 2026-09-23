import { ensureVehicleSockets } from './vehicle-sockets.js';
import { applyVehiclePaint } from './vehicle-paint.js';

// An owner is a stable name for one visual piece, independent of the car that
// currently carries it. Kits, decals and figures can use the same mounts as
// combat rigs without adding more vehicle-specific code to the renderer.
export function createVehicleAttachmentRegistry() {
  const bindings = new Map();
  const objectOwners = new WeakMap();

  function detach(owner) {
    const binding = bindings.get(owner);
    if (!binding) return false;
    bindings.delete(owner);
    objectOwners.delete(binding.object);
    if (binding.fallback) binding.fallback.add(binding.object);
    else binding.object.removeFromParent();
    return true;
  }

  function attach({ owner, vehicle, socket, object, fallback = null }) {
    if (typeof owner !== 'string' || !owner || !vehicle || !object?.isObject3D) {
      throw new Error('A vehicle attachment needs an owner, vehicle and scene object.');
    }
    const target = ensureVehicleSockets(vehicle)[socket];
    if (!target) throw new Error(`Unknown vehicle attachment socket: ${socket}`);
    const objectOwner = objectOwners.get(object);
    if (objectOwner && objectOwner !== owner) {
      throw new Error(`Vehicle attachment object already belongs to ${objectOwner}.`);
    }
    const current = bindings.get(owner);
    if (current?.vehicle === vehicle && current.socket === socket && current.object === object) return object;
    detach(owner);
    target.add(object);
    bindings.set(owner, { vehicle, socket, object, fallback });
    objectOwners.set(object, owner);
    return object;
  }

  function detachVehicle(vehicle) {
    let count = 0;
    for (const [owner, binding] of bindings) {
      if (binding.vehicle === vehicle) {
        detach(owner);
        count++;
      }
    }
    return count;
  }

  function clear() {
    for (const owner of bindings.keys()) detach(owner);
  }

  return {
    attach, detach, detachVehicle, clear,
    applyPaint: (vehicle, appearance) => applyVehiclePaint(vehicle, appearance),
    get size() { return bindings.size; },
  };
}
