// Course-owned metadata. This module never imports feature flags or config.
import {SUMMIT_ATTACK_ID} from './summit-attack.js';

const NAME = /^[a-z][a-z0-9-]*$/;
export const BASE_COURSE_COUNT = 16;

export function registerCircuits(modules) {
  const ids = new Set(), order = new Set();
  const entries = modules.filter(module => module.manifest !== undefined ||
    Object.values(module).some(value => value?.kind === 'circuit')).map(module => {
    const m = module.manifest;
    if (!m || typeof m.id !== 'string' || typeof m.flag !== 'string' || !NAME.test(m.id) || !NAME.test(m.flag) || !['dev', 'beta', 'on'].includes(m.state) ||
      !Number.isSafeInteger(m.price) || m.price < 0 || typeof m.grandPrix !== 'boolean' ||
      !Number.isSafeInteger(m.releaseOrder) || m.releaseOrder < 0 ||
      !m.driver || typeof m.driver.car !== 'string' || !/^[a-z][a-z0-9_]*$/.test(m.driver.car) ||
      typeof m.driver.driverId !== 'string' || !/^[a-z][a-z0-9_]*$/.test(m.driver.driverId) ||
      m.driver.controller !== 'racing-line' || !Number.isFinite(m.driver.skill) || m.driver.skill < 0 || m.driver.skill > 1)
      throw Error('Invalid circuit manifest.');
    if (ids.has(m.id) || order.has(m.releaseOrder)) throw Error('Duplicate circuit manifest id or releaseOrder.');
    ids.add(m.id); order.add(m.releaseOrder);
    const definition = Object.values(module).find(value => value !== m && value?.id === m.id && value.kind === 'circuit');
    const generationStage = definition?.stage;
    if (!definition || definition.flag !== m.flag || !Number.isSafeInteger(generationStage) || generationStage < 0)
      throw Error('Circuit manifest needs its matching authored definition and generation identity.');
    let unlock;
    if(Object.hasOwn(m,'unlock')){
      const value=m.unlock;
      if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||
          !Object.keys(value).every(key=>key==='kind'||key==='defaultEventId')||
          !['default-gp-podium','owned-course','spotted-from-air'].includes(value.kind)||typeof value.defaultEventId!=='string'||!NAME.test(value.defaultEventId))
        throw Error('Invalid circuit unlock descriptor.');
      if(m.price!==0)throw Error('A circuit unlock requires zero price, not a purchase.');
      if(value.kind==='owned-course'&&(m.id!==SUMMIT_ATTACK_ID||value.defaultEventId!=='summit-run'||m.grandPrix!==false))
        throw Error('The owned-course unlock is only the solo Summit Attack child.');
      unlock=Object.freeze({...value});
    }
    const manifest = Object.freeze({...m, driver: Object.freeze({...m.driver}),...(unlock?{unlock}:{})});
    return Object.freeze({manifest, definition, generationStage});
  });
  for(const {manifest} of entries)if(manifest.unlock){
    const parent=entries.find(row=>row.manifest.id===manifest.unlock.defaultEventId)?.manifest;
    if(!parent||parent.id===manifest.id||parent.unlock||parent.grandPrix!==true)
      throw Error('A circuit unlock needs a known default Grand Prix event, never itself or a chained variant.');
    if(manifest.unlock.kind==='owned-course'&&(manifest.flag!=='summit-run'||manifest.flag!==parent.flag||manifest.state!==parent.state||parent.id!=='summit-run'))
      throw Error('The owned-course child must share its Summit parent flag and state.');
  }
  const flagOwners=new Map();
  for(const {manifest}of entries){
    const group=flagOwners.get(manifest.flag)||[];group.push(manifest);flagOwners.set(manifest.flag,group);
  }
  for(const group of flagOwners.values())if(group.length>1){
    const parent=group.find(row=>row.id==='summit-run');
    const child=group.find(row=>row.id===SUMMIT_ATTACK_ID&&row.unlock?.kind==='owned-course'&&row.unlock.defaultEventId==='summit-run');
    if(group.length!==2||!parent||!child||parent.flag!==child.flag||parent.state!==child.state)
      throw Error('Duplicate circuit manifest flag.');
  }
  return Object.freeze(entries.sort((a, b) => a.manifest.releaseOrder - b.manifest.releaseOrder));
}

async function modulesFromFiles() {
  if (import.meta.env) {
    const modules = import.meta.glob(['./circuits/*.js', '!./circuits/index.js'], {eager: true});
    return Object.values(modules);
  }
  const {readdir} = await import(/* @vite-ignore */ 'node:fs/promises');
  const files = (await readdir(new URL('./circuits/', import.meta.url)))
    .filter(name => NAME.test(name.slice(0, -3)) && name.endsWith('.js') && name !== 'index.js').sort();
  return Promise.all(files.map(name => import(new URL('./circuits/' + name, import.meta.url).href)));
}

export const CIRCUIT_ENTRIES = registerCircuits(await modulesFromFiles());
export const CIRCUIT_MANIFESTS = Object.freeze(CIRCUIT_ENTRIES.map(row => row.manifest));
export function circuitDefinitions(flags, entries = CIRCUIT_ENTRIES) {
  return Object.freeze(entries.filter(row => !flags || flags.enabled(row.manifest.flag)).map(row => row.definition));
}
