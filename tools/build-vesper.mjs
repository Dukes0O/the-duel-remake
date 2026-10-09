import {spawnSync} from 'node:child_process';
import {copyFileSync,readFileSync,mkdirSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'.qa-dist',`vesper-install-${randomUUID()}`);
const blender=process.env.BLENDER || 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
const built=spawnSync(blender,['-b','--python-exit-code','1','--python',
  join(root,'tools/blender/vesper-blackiron.py'),'--','--root',root,
  '--fit-config','tools/art/vesper-fit.json','--output-dir',output],
  {cwd:root,stdio:'inherit',windowsHide:true});
if(built.error)throw built.error;
if(built.status!==0)throw Error('Approved Vesper fitting recipe failed');
const source=join(output,'vesper.glb'),bytes=readFileSync(source);
const manifest=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'));
const hash=createHash('sha256').update(bytes).digest('hex');
if(bytes.toString('ascii',0,4)!=='glTF' || hash!==manifest.modelSha256)
  throw Error('The approved recipe must produce a complete verified native Vesper model');
const target=join(root,'public/assets/models/wasteland/crew/vesper.glb');
mkdirSync(dirname(target),{recursive:true}); copyFileSync(source,target);
console.log(`Installed approved Vesper: ${bytes.length} bytes, ${hash}`);
console.log(`Private recipe output: ${output}`);
