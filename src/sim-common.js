// Constants shared by the extracted Duel systems. Values are unchanged from
// game.js; keep race tuning in config.js when a later gameplay card changes it.
export const BOUNDARY_WARNING = 60;
export const BOUNDARY_RESET = 78;
export const GLANCING_WALL_NORMAL_FRACTION = Math.sin(35 * Math.PI / 180);
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const freshDamageZones = () => ({ front: 0, rear: 0, left: 0, right: 0 });
