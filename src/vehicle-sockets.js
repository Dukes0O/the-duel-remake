import * as THREE from 'three';

// Model-local metres. Every car uses its authored size, then a small adjustment
// for its nose, roof and body center. +Z is forward on all nine vehicle models.
const ADJUSTMENTS = Object.freeze({
  falcone_f42: Object.freeze({ frontY: 0.48, roofLift: 0.10, roofZ: -0.24, shieldLift: 0 }),
  stuttgart_959s: Object.freeze({ frontY: 0.50, roofLift: 0.09, roofZ: -0.36, shieldLift: 0 }),
  falcone_heritage: Object.freeze({ frontY: 0.49, roofLift: 0.10, roofZ: -0.22, shieldLift: 0 }),
  aurora_gt: Object.freeze({ frontY: 0.50, roofLift: 0.12, roofZ: -0.22, shieldLift: 0 }),
  dusthawk_rally: Object.freeze({ frontY: 0.67, roofLift: 0.08, roofZ: -0.38, shieldLift: 0.10 }),
  banshee_muscle: Object.freeze({ frontY: 0.51, roofLift: 0.09, roofZ: -0.52, shieldLift: 0 }),
  viper_proto: Object.freeze({ frontY: 0.39, roofLift: 0.09, roofZ: -0.26, shieldLift: 0 }),
  titan_monster: Object.freeze({ frontY: 1.81, roofLift: 0.14, roofZ: -0.25, shieldLift: 0.22 }),
  koenigsegg_jesko: Object.freeze({ frontY: 0.34, roofLift: 0.10, roofZ: -0.20, shieldLift: 0 }),
});

export const VEHICLE_SOCKET_KEYS = Object.freeze(Object.keys(ADJUSTMENTS));

export function vehicleSocketLayout(key, size) {
  const adjustment = ADJUSTMENTS[key];
  if (!adjustment) throw new Error(`Unknown vehicle socket layout: ${key}`);
  if (!size || ![size.width, size.length, size.height].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error(`Vehicle ${key} needs positive model dimensions`);
  }

  const halfWidth = size.width / 2;
  const halfLength = size.length / 2;
  const shoulderY = size.height * 0.55;
  return Object.freeze({
    front: Object.freeze([0, adjustment.frontY, halfLength + 0.04]),
    rear: Object.freeze([0, adjustment.frontY, -halfLength - 0.04]),
    roof: Object.freeze([0, size.height + adjustment.roofLift, adjustment.roofZ]),
    hood: Object.freeze([0, Math.max(adjustment.frontY + 0.14, size.height * 0.57), halfLength * 0.43]),
    left: Object.freeze([halfWidth + 0.04, shoulderY, 0]),
    right: Object.freeze([-halfWidth - 0.04, shoulderY, 0]),
    door: Object.freeze([halfWidth + 0.03, shoulderY, -halfLength * 0.08]),
    shield: Object.freeze([0, size.height * 0.54 + adjustment.shieldLift, 0]),
  });
}

export function ensureVehicleSockets(vehicle) {
  if (vehicle.userData.vehicleSockets) return vehicle.userData.vehicleSockets;
  const layout = vehicleSocketLayout(vehicle.userData.vehicleKey, vehicle.userData.size);
  const sockets = Object.fromEntries(Object.entries(layout).map(([name, position]) => {
    const socket = new THREE.Group();
    socket.name = `vehicle-socket-${name}`;
    socket.position.fromArray(position);
    vehicle.add(socket);
    return [name, socket];
  }));
  vehicle.userData.vehicleSockets = sockets;
  return sockets;
}
