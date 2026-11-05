import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {dirname,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {extname,sep} from 'node:path';
import {buildVersionPlugin} from './build-version-plugin.mjs';

const MIME_TYPES = {
  '.avif':'image/avif','.bin':'application/octet-stream','.css':'text/css; charset=utf-8',
  '.flac':'audio/flac','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.hdr':'image/vnd.radiance','.html':'text/html; charset=utf-8',
  '.jpeg':'image/jpeg','.jpg':'image/jpeg','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.ktx2':'image/ktx2','.md':'text/markdown; charset=utf-8','.mp3':'audio/mpeg',
  '.ogg':'audio/ogg','.otf':'font/otf','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8',
  '.ttf':'font/ttf','.wav':'audio/wav','.webm':'audio/webm','.webp':'image/webp',
  '.woff':'font/woff','.woff2':'font/woff2',
};

// Vite's preview static handler runs first, so files emitted into the bundle
// win. This serves only missing files from public/ without copying that tree.
export function publicFallbackPlugin({publicDir} = {}) {
  let publicRoot = publicDir;
  return {
    name:'qa-public-fallback',
    configResolved(config) { publicRoot ??= resolve(config.root, 'public'); },
    configurePreviewServer(server) {
      return () => server.middlewares.use(async (req,res,next) => {
        if (!['GET','HEAD'].includes(req.method ?? 'GET')) return next();
        let pathname;
        try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://qa.local').pathname); }
        catch { return next(); }
        // Browser checks and the preview page share this isolated MPA server.
        // The launcher-only stamp is not copied into the QA bundle, but the
        // preview badge still needs a successful response in this build.
        if (pathname === '/preview-build.json') {
          const body = JSON.stringify({builtAt: new Date().toISOString()}) + '\n';
          res.statusCode = 200;
          res.setHeader('Content-Type','application/json; charset=utf-8');
          res.setHeader('Content-Length',String(Buffer.byteLength(body)));
          res.setHeader('Cache-Control','no-store');
          return res.end(req.method === 'HEAD' ? undefined : body);
        }
        if (pathname.includes('\0') || pathname.includes('\\')) return next();
        const pieces = pathname.split('/').filter(Boolean);
        if (pieces.some(piece => piece === '.' || piece === '..')) return next();
        const target = resolve(publicRoot, ...pieces);
        const part = relative(publicRoot, target);
        if (part === '..' || part.startsWith('..' + sep) || part.includes(':')) return next();
        let actual, info;
        try {
          actual = await realpath(target);
          const root = await realpath(publicRoot);
          const actualPart = relative(root, actual);
          if (actualPart === '..' || actualPart.startsWith('..' + sep) || actualPart.includes(':')) return next();
          info = await stat(actual);
          if (!info.isFile()) return next();
        } catch { return next(); }
        let start = 0, end = info.size - 1, status = 200;
        const range = req.headers?.range;
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!match || (!match[1] && !match[2]) || info.size === 0) {
            res.statusCode = 416; res.setHeader('Accept-Ranges','bytes');
            res.setHeader('Content-Range',`bytes */${info.size}`); return res.end();
          }
          if (match[1]) { start = Number(match[1]); end = match[2] ? Number(match[2]) : end; }
          else { const suffix = Number(match[2]); start = Math.max(0,info.size-suffix); }
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
            res.statusCode = 416; res.setHeader('Accept-Ranges','bytes');
            res.setHeader('Content-Range',`bytes */${info.size}`); return res.end();
          }
          end = Math.min(end,info.size-1); status = 206;
          res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
        }
        res.statusCode = status;
        res.setHeader('Content-Type',MIME_TYPES[extname(actual).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Content-Length',String(Math.max(0,end-start+1)));
        res.setHeader('Accept-Ranges','bytes');
        if (req.method === 'HEAD' || info.size === 0) return res.end();
        const stream = createReadStream(actual,{start,end});
        stream.on('error',next); stream.pipe(res);
      });
    },
  };
}

// Explicit test-only hybrid: Claude's frozen authored definition, our engine.
// Normal QA and production builds never enable this fixture.
const harbourSource = process.env.P4_KIT_HARBOUR_SOURCE;
const expectedHarbourSource = 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-harbour/src/circuits/harbour-lights.js';
const harbourHead = 'e96d52bb4eb1f841b7be477a3e9ec707ff415ba7';
let aliases = [],plugins = [buildVersionPlugin(),publicFallbackPlugin()];
if (harbourSource) {
  const source = resolve(harbourSource);
  assert.equal(source.replaceAll('\\','/').toLowerCase(),expectedHarbourSource.toLowerCase(),
    'Dense kit QA requires the explicitly granted Harbour source.');
  const root = dirname(dirname(dirname(source)));
  const head = spawnSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true});
  const status = spawnSync('git',['-C',root,'status','--porcelain'],{encoding:'utf8',windowsHide:true});
  assert.equal(head.status,0);assert.equal(head.stdout.trim(),harbourHead);
  assert.equal(status.status,0);assert.equal(status.stdout.trim(),'','Harbour QA source must be frozen and clean.');
  aliases = [{find:/^\.\/harbour-lights\.js$/,replacement:source}];
  plugins.push({
    name:'kit-loader-harbour-metadata-fixture',
    transform(code,id) {
      const ownField = fileURLToPath(new URL('../src/race-field.js',import.meta.url)).replaceAll('\\','/');
      if (id.replaceAll('\\','/') !== ownField) return null;
      const admission = /export const GRAND_PRIX_COURSES = Object\.freeze\(\[([^\]]*)\]\);/g;
      assert.equal([...code.matchAll(admission)].length,1,'Own field admission hook changed.');
      return {code:code.replace(admission,(whole,entries)=>entries.includes("'harbour-lights'") ? whole :
        "export const GRAND_PRIX_COURSES = Object.freeze(["+entries+",'harbour-lights']);"),map:null};
    },
  });
}
const input = {
  game:fileURLToPath(new URL('../index.html',import.meta.url)),
  preview:fileURLToPath(new URL('./preview.html',import.meta.url)),
  checks:fileURLToPath(new URL('./visual-check.html',import.meta.url)),
  contacts:fileURLToPath(new URL('./contact-check.html',import.meta.url)),
  updates:fileURLToPath(new URL('./update-check.html',import.meta.url)),
  menu:fileURLToPath(new URL('./menu-check.html',import.meta.url)),
  vehicles:fileURLToPath(new URL('./vehicle-art-check.html',import.meta.url)),
  audio:fileURLToPath(new URL('./audio-race-check.html',import.meta.url)),
  listening:fileURLToPath(new URL('./audio/listening.html',import.meta.url)),
  deeplook:fileURLToPath(new URL('./deep-look.html',import.meta.url)),
};

export default defineConfig({
  plugins:plugins,resolve:{alias:aliases},define:{__DUEL_QA__:'true'},
  publicDir:false,appType:'mpa',build:{outDir:'.qa-dist',copyPublicDir:false,rollupOptions:{input}},server:{hmr:false},
});
