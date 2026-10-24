import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseAst } from 'rolldown/parseAst';

// Cover the code the shortcut solver actually runs: buildShortcuts and every
// top-level function, constant and Course method it reaches by name, followed
// to the end (QA-TEST-AUDIT; it used to hash whole stretches of course.js, so an
// unrelated edit nearby forced a regeneration). A name that is also used on
// other objects (`at`, `start`) is included anyway: hashing more is safe.
// Runtime input keys separately cover complete event definitions, seeds,
// sampled geometry and tunnel placement.
export async function shortcutSourceFingerprint(){
  const read=async file=>(await readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const course=await read('src/course.js');
  const program=parseAst(course,null,'course.js');
  const topLevel=new Map(),methods=new Map();
  for(const statement of program.body){
    const node=statement.type==='ExportNamedDeclaration'&&statement.declaration?statement.declaration:statement;
    if(node.type==='FunctionDeclaration')topLevel.set(node.id.name,statement);
    else if(node.type==='VariableDeclaration'){
      for(const declaration of node.declarations)if(declaration.id.type==='Identifier')topLevel.set(declaration.id.name,statement);
    }else if(node.type==='ClassDeclaration'&&node.id.name==='Course')
      for(const member of node.body.body)if(member.type==='MethodDefinition'&&member.key.type==='Identifier')methods.set(member.key.name,member);
  }
  if(!topLevel.has('buildShortcuts')||!methods.size)
    throw new Error('Shortcut generation source boundaries changed; review the freshness fingerprint.');
  const included=new Set(),queue=[topLevel.get('buildShortcuts')];
  const walk=node=>{
    if(!node||typeof node.type!=='string')return;
    if(node.type==='Identifier'&&topLevel.has(node.name))queue.push(topLevel.get(node.name));
    if(node.type==='MemberExpression'&&!node.computed&&node.property.type==='Identifier'&&methods.has(node.property.name))
      queue.push(methods.get(node.property.name));
    for(const value of Object.values(node)){
      if(Array.isArray(value))value.forEach(walk);
      else if(value&&typeof value==='object')walk(value);
    }
  };
  while(queue.length){const node=queue.pop();if(included.has(node))continue;included.add(node);walk(node);}
  const hash=createHash('sha256');
  for(const node of [...included].sort((a,b)=>a.start-b.start))hash.update(course.slice(node.start,node.end)).update('\n');
  for(const file of['src/rng.js','src/shortcut-preset-cache.js'])hash.update(file).update(await read(file));
  return hash.digest('hex');
}
