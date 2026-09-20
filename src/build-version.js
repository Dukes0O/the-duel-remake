// Vite replaces this value for a built release. Plain Node imports and the dev
// server deliberately remain usable without a build manifest or a network call.
export const BUILD_MANIFEST_FILE = 'build-version.json';
export const DEVELOPMENT_BUILD = Object.freeze({schema:1,id:'development',label:'DEV',builtAt:null,production:false,base:'/'});

export function parseBuildManifest(value) {
  if (!value || value.schema !== 1 || typeof value.id !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{3,79}$/.test(value.id) ||
      typeof value.label !== 'string' || !value.label.trim() || value.label.length > 64 ||
      /[\u0000-\u001f\u007f]/.test(value.label) || typeof value.builtAt !== 'string') return null;
  const time = Date.parse(value.builtAt);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value.builtAt) return null;
  return Object.freeze({schema:1,id:value.id,label:value.label,builtAt:value.builtAt});
}

const injected = typeof __DUEL_BUILD_VERSION__ === 'undefined' ? null : __DUEL_BUILD_VERSION__;
const manifest = parseBuildManifest(injected);
export const BUILD_VERSION = manifest && injected.production === true
  ? Object.freeze({...manifest,production:true,base:typeof injected.base === 'string' ? injected.base : '/'})
  : DEVELOPMENT_BUILD;
