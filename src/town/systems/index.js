// Vite includes every system file. Node's headless tests use this fallback.
const systems=import.meta.glob?.('./modules/*.js',{eager:true})||{};
if(!Object.keys(systems).length) await import('./modules/calendar.js');
await import('../town-fire.js');
