import {randomUUID} from 'node:crypto';
import {BUILD_MANIFEST_FILE,DEVELOPMENT_BUILD} from '../src/build-version.js';

// One identity is shared by all chunks and the manifest in this build. Neither
// reading the page nor serving the manifest generates a new identity.
export function buildVersionPlugin({now=()=>new Date(),nonce=()=>randomUUID().replaceAll('-','').slice(0,12)}={}) {
  let release;
  return {
    name:'duel-build-version',
    config(config,{command}) {
      if (command !== 'build') return {define:{__DUEL_BUILD_VERSION__:JSON.stringify(DEVELOPMENT_BUILD)}};
      if (!release) {
        const builtAt = now().toISOString(), suffix = nonce();
        const id = `${builtAt.slice(0,19).replace(/[-:T]/g,'')}-${suffix}`;
        const label = `${builtAt.slice(2,10).replaceAll('-','.')} ${builtAt.slice(11,16)} UTC · ${suffix.slice(0,6)}`;
        release = Object.freeze({schema:1,id,label,builtAt,production:true,base:config.base || '/'});
      }
      return {define:{__DUEL_BUILD_VERSION__:JSON.stringify(release)}};
    },
    generateBundle() {
      if (!release) return;
      const {schema,id,label,builtAt} = release;
      this.emitFile({type:'asset',fileName:BUILD_MANIFEST_FILE,source:JSON.stringify({schema,id,label,builtAt})+'\n'});
    },
    configurePreviewServer(server) {
      server.middlewares.use((request,response,next)=>{
        const base = server.config.base || '/';
        const pathname = (request.url || '').split('?')[0];
        if (pathname === `${base}${BUILD_MANIFEST_FILE}`) {
          response.setHeader('Cache-Control','no-store, max-age=0');
          response.setHeader('Pragma','no-cache');
          response.setHeader('Expires','0');
        } else if (pathname === base || pathname === `${base}index.html`) {
          // A user-requested reload must revalidate the entry HTML as well.
          response.setHeader('Cache-Control','no-cache');
        }
        next();
      });
    },
  };
}
