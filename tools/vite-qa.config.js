import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {buildVersionPlugin} from './build-version-plugin.mjs';

// Explicit test-only hybrid: Claude's frozen authored definition, our engine.
// Normal QA and production builds never enable this fixture.
const harbourSource = process.env.P4_KIT_HARBOUR_SOURCE;
const expectedHarbourSource = 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/p4-harbour/src/circuits/harbour-lights.js';
const harbourHead = 'e96d52bb4eb1f841b7be477a3e9ec707ff415ba7';
let aliases = [],plugins = [buildVersionPlugin()];
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
const input = Object.fromEntries([
  ['game','../index.html'],['preview','./preview.html'],['checks','./visual-check.html'],
  ['contacts','./contact-check.html'],['updates','./update-check.html'],['menu','./menu-check.html'],
  ['vehicles','./vehicle-art-check.html'],['audio','./audio-race-check.html'],['listening','./audio/listening.html'],
].map(([name,path])=>[name,fileURLToPath(new URL(path,import.meta.url))]));

export default defineConfig({
  plugins:plugins,resolve:{alias:aliases},define:{__DUEL_QA__:'true'},
  build:{outDir:'.qa-dist',rollupOptions:{input}},server:{hmr:false},
});
