import * as THREE from 'three';
import {TOWN_CELL_METRES} from '../town-world-data.js';

export function pickTownItem(camera, objects, clientX, clientY, rect) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const pointer = new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(objects, true)[0];
  if (!hit) return null;
  const object = hit.object, rows = object.userData.townItems;
  if (rows && Number.isInteger(hit.instanceId)) return {type:'building', building:rows[hit.instanceId], point:hit.point};
  return {type:'ground', x:Math.floor(hit.point.x/TOWN_CELL_METRES), z:Math.floor(hit.point.z/TOWN_CELL_METRES), point:hit.point};
}
