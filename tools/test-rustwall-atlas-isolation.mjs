import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = [], check = (name, run) => checks.push({name, run});
const scratchHome = join(root, '.qa-dist');
mkdirSync(scratchHome, {recursive: true});
const scratch = mkdtempSync(join(scratchHome, 'rustwall-atlas-isolation-'));
assert.ok(scratch.startsWith(scratchHome + sep), 'fixture stays within lane scratch');
const protectedPaths = ['public/assets/models/wasteland/rustwall/wall.glb',
  'public/assets/models/wasteland/rustwall/wash.glb',
  'public/assets/models/classics/falcone_f42.glb',
  'public/assets/models/unlocks/banshee_muscle.glb', 'tools/blender/rustwall.py'];
const protectedHashes = protectedPaths.map(path => hash(readFileSync(join(root, path))));

function png(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  let width, height, channels, ended = false;
  const data = [];
  for (let offset = 8; offset < bytes.length;) {
    assert.ok(offset + 12 <= bytes.length, 'complete PNG chunk header');
    const size = bytes.readUInt32BE(offset), end = offset + 12 + size;
    assert.ok(end <= bytes.length, 'complete PNG chunk payload');
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(offset + 4, end - 4)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    assert.equal(bytes.readUInt32BE(end - 4), (crc ^ 0xffffffff) >>> 0, 'PNG chunk CRC');
    const kind = bytes.toString('ascii', offset + 4, offset + 8);
    if (kind === 'IHDR') {
      width = bytes.readUInt32BE(offset + 8); height = bytes.readUInt32BE(offset + 12);
      assert.equal(bytes[offset + 16], 8, '8-bit atlas');
      channels = {2: 3, 6: 4}[bytes[offset + 17]];
      assert.ok(channels, 'RGB or RGBA atlas');
    }
    if (kind === 'IDAT') data.push(bytes.subarray(offset + 8, end - 4));
    if (kind === 'IEND') ended = true;
    offset = end;
  }
  assert.ok(ended, 'complete PNG terminator');
  const raw = inflateSync(Buffer.concat(data)), stride = width * channels;
  assert.equal(raw.length, height * (stride + 1), 'complete decoded PNG rows');
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0, input = 0; y < height; y++) {
    const filter = raw[input++];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const above = y ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      const p = left + above - upperLeft;
      const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft);
      const prior = [0, left, above, Math.floor((left + above) / 2),
        a <= b && a <= c ? left : b <= c ? above : upperLeft][filter];
      assert.notEqual(prior, undefined, 'supported PNG filter');
      pixels[y * stride + x] = (raw[input++] + prior) & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i++)
    pixels.copy(rgba, i * 4, i * channels, i * channels + channels);
  return {width, height, pixels: rgba};
}

function glb(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'complete GLB');
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const size = bytes.readUInt32LE(offset), kind = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + size);
    if (kind === 0x4e4f534a) json = JSON.parse(chunk.toString());
    if (kind === 0x004e4942) binary = chunk;
    offset += size + 8;
  }
  assert.ok(json && binary, 'actual native export contains JSON and binary');
  return (materialName, label) => {
    const material = json.materials.find(item => item.name === materialName);
    assert.ok(material, `exported material ${materialName}`);
    const texture = {color: material.pbrMetallicRoughness.baseColorTexture,
      surface: material.pbrMetallicRoughness.metallicRoughnessTexture,
      normal: material.normalTexture, emissive: material.emissiveTexture}[label];
    assert.ok(texture, `exported ${label} texture`);
    const image = json.images[json.textures[texture.index].source];
    assert.equal(image.mimeType, 'image/png', 'embedded lossless atlas');
    const view = json.bufferViews[image.bufferView];
    return binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  };
}

// Run the actual recipe definitions with only its top-level full/probe dispatch
// disabled. Native bpy saves, packs, renders and glTF export are not replaced.
// A low-poly triangle source limits render cost; it does not replace atlas logic.
const nativeFixture = String.raw`
import ast, json, os, sys
from pathlib import Path
import bpy
source=Path(sys.argv[sys.argv.index('--')+1]).resolve()
fixture=Path(sys.argv[sys.argv.index('--')+2]).resolve()
sys.argv=['rustwall.py','--','--root',str(fixture),'--round','2']
tree=ast.parse(source.read_text(encoding='utf-8'),filename=str(source))
kept=[]
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='captures' for t in node.targets):break
    if isinstance(node,ast.If) and isinstance(node.test,ast.Attribute) and node.test.attr in (
        'p2_hulk_probe','p2_section_probe','p2_wheel_probe','p2_relief_probe'):continue
    kept.append(node)
tree.body=kept
recipe={'__file__':str(source),'__name__':'atlas_component_fixture'}
exec(compile(tree,str(source),'exec'),recipe)
original_get=bpy.types.Image.__getattribute__
original_replace=os.replace
active=False
phase=''
mode=''
events=[]
publications=[]
own_dir=fixture/'own'
own_dir.mkdir()
competitor=bpy.data.images.new('competing-writer',512,512,alpha=True)
competitor.generated_color=(.91,.02,.74,1)
competitor.filepath_raw=str(fixture/'competitor.png');competitor.file_format='PNG'
competitor.save()
competitor_bytes=Path(competitor.filepath_raw).read_bytes()

def canonical(image):
    name,label=image.name.rsplit('-',1)
    return recipe['texture_path'](name,label)

def intercepted_get(image,name):
    value=original_get(image,name)
    if name!='save' or not active or image.name not in (
        'hulks-color','hulks-surface','hulks-normal',
        'details-color','details-surface','details-normal','details-emissive'):return value
    def save(*args,**kwargs):
        result=value(*args,**kwargs)
        saved=Path(image.filepath_raw).resolve()
        target=canonical(image).resolve()
        expected=own_dir/f'{mode}-{phase}-{image.name}.png'
        expected.write_bytes(saved.read_bytes())
        events.append({'mode':mode,'phase':phase,'name':image.name,
            'saved':str(saved),'canonical':str(target),'expected':str(expected)})
        # Another invocation publishes after this invocation saves, before its
        # next pack/read. Valid foreign bytes prove ownership, partial foreign
        # bytes prove the observed corrupt-PNG failure without scheduler luck.
        payload=competitor_bytes if mode=='complete' else competitor_bytes[:len(competitor_bytes)//2]
        temp=target.with_suffix('.competing.png');temp.write_bytes(payload)
        original_replace(temp,target)
        return result
    return save

def intercepted_replace(src,dst,*args,**kwargs):
    destination=Path(dst).resolve()
    if destination.parent==(fixture/'art-build/rustwall').resolve() and destination.suffix=='.png':
        publications.append({'mode':mode,'phase':phase,'destination':str(destination),
            'source':str(Path(src).resolve()),'bytes':len(Path(src).read_bytes())})
    return original_replace(src,dst,*args,**kwargs)

bpy.types.Image.__getattribute__=intercepted_get
os.replace=intercepted_replace
reports=[]
for mode in ('complete','interrupted'):
    active=False;recipe['fresh']()
    proof=fixture/'art-build/rustwall-p2'/mode;proof.mkdir(parents=True)
    phase='initial';active=True
    hulks=recipe['material']('hulks');details=recipe['material']('details')
    active=False
    def mesh(name,mat):
        geometry=recipe['Geometry']();geometry.box((0,1,0),(2,2,2),0)
        return geometry.build(name,mat)
    objects=[mesh('fixture-hulks',hulks),mesh('fixture-details',details)]
    def export(path):
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
            export_yup=True,export_image_format='AUTO',export_texcoords=True,export_normals=True,
            export_materials='EXPORT',export_extras=True)
    def record(stage,snapshots=None):
        for event in [e for e in events if e['mode']==mode and e['phase']==stage]:
            image=bpy.data.images[event['name']]
            packed=own_dir/f'{mode}-{stage}-{image.name}-packed.png'
            if image.packed_file:packed.write_bytes(bytes(image.packed_file.data))
            reports.append(dict(event,packed=str(packed),snapshot=(snapshots or {}).get(image.name.rsplit('-',1)[1])))
    record('initial');export(proof/'initial.glb')
    phase='relief';active=True
    # The real relief builder stamps this actual native triangle 120 times,
    # renders it in EEVEE, edits its reserved pixels and saves/packs snapshots.
    template=[(0,((-.5,-.5,0),(.5,-.5,0),(0,.5,1)))]
    source_path,source_hash,snapshots=recipe['p2_prepare_relief_atlas'](
        hulks,[(template,{}),(template,{})],proof,'probe')
    active=False;record('relief',snapshots);export(proof/'relief.glb')
(fixture/'result.json').write_text(json.dumps({'reports':reports,'publications':publications}),encoding='utf-8')
`;

let failures = 0;
try {
  const fixture = join(scratch, 'fixture');
  mkdirSync(fixture);
  const harness = join(scratch, 'native.py');
  writeFileSync(harness, nativeFixture);
  const blender = process.env.BLENDER_BIN ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  execFileSync(blender, ['-b', '--python-exit-code', '1', '--python', harness, '--',
    join(root, 'tools/blender/rustwall.py'), fixture],
  {cwd: scratch, timeout: 120000, maxBuffer: 20 * 1024 * 1024});
  const result = JSON.parse(readFileSync(join(fixture, 'result.json')));
  check('native competing-write fixture executes every initial, emissive and relief atlas', () => {
    for (const mode of ['complete', 'interrupted']) {
      assert.equal(result.reports.filter(row => row.mode === mode && row.phase === 'initial').length, 7);
      assert.equal(result.reports.filter(row => row.mode === mode && row.phase === 'relief').length, 3);
    }
  });
  for (const row of result.reports) {
    const label = row.name.split('-').at(-1), name = row.name.startsWith('hulks') ? 'hulks' : 'details';
    const context = `${row.mode}/${row.phase}/${row.name}`;
    const expected = readFileSync(row.expected);
    const exported = glb(join(fixture, 'art-build/rustwall-p2', row.mode, `${row.phase}.glb`));
    check(`${context}: save privately before atomic canonical publication`, () => {
      assert.notEqual(row.saved, row.canonical, 'native image save must use a private path');
      assert.ok(result.publications.some(item => item.mode === row.mode && item.phase === row.phase &&
        item.destination === row.canonical && item.source !== item.destination && item.bytes > 0),
      'canonical atlas must publish through atomic replace');
    });
    check(`${context}: packed PNG decodes with valid CRC and complete rows`, () => png(readFileSync(row.packed)));
    check(`${context}: pack contains this invocation\'s native saved bytes`, () => {
      assert.equal(hash(readFileSync(row.packed)), hash(expected), 'packed bytes must belong to this save');
    });
    check(`${context}: GLB pixels belong to this invocation`, () => {
      const actual = png(exported(`${name} authored padded atlas`, label)), own = png(expected);
      assert.deepEqual([actual.width, actual.height], [own.width, own.height]);
      assert.ok(actual.pixels.equals(own.pixels), 'GLB pixels must match own atlas despite competing publication');
    });
    if (row.phase === 'relief') {
      check(`${context}: unpack preserves this invocation's original car pixels`, () => {
        const initial = result.reports.find(item => item.mode === row.mode &&
          item.phase === 'initial' && item.name === row.name);
        const before = png(readFileSync(initial.expected)), after = png(expected);
        assert.deepEqual([before.width, before.height, after.width, after.height], [512, 512, 512, 512]);
        for (let y = 0; y < 512; y++) {
          const ranges = y >= 132 && y < 380 ? [[0, 260], [508, 512]] : [[0, 512]];
          for (const [x0, x1] of ranges) {
            const start = (y * 512 + x0) * 4, end = (y * 512 + x1) * 4;
            assert.ok(before.pixels.subarray(start, end).equals(after.pixels.subarray(start, end)),
              `protected original car pixels remain this invocation's at row ${y}`);
          }
        }
      });
      check(`${context}: snapshot has valid CRC and this invocation's bytes`, () => {
        assert.deepEqual(Object.keys(row.snapshot).sort(), ['path', 'sha256'], 'snapshot manifest contract');
        const snapshot = readFileSync(join(fixture, row.snapshot.path));
        png(snapshot);
        assert.equal(hash(snapshot), row.snapshot.sha256, 'snapshot records its actual hash');
        assert.equal(hash(snapshot), hash(expected), 'snapshot must belong to this save');
      });
    }
  }
  check('default paths, atlas names and probe manifest filenames stay stable', () => {
    const script = join(root, 'tools/blender/rustwall.py');
    for (const probe of ['wheel', 'relief']) {
      const plan = JSON.parse(execFileSync('python', [script, '--', '--root', fixture, '--round', '2',
        `--p2-${probe}-probe`, '--paths-only'], {cwd: scratch, encoding: 'utf8', timeout: 10000}));
      assert.deepEqual(plan.textures, ['color', 'surface', 'normal'].map(label =>
        join(fixture, 'art-build/rustwall', `hulks-${label}.png`)));
      assert.deepEqual(plan.glb, [join(fixture, 'art-build/rustwall-p2', `${probe}-probe.glb`)]);
      assert.deepEqual(plan.blend, [join(fixture, 'art-build/rustwall-p2', `${probe}-probe.blend`)]);
      assert.ok(plan.evidence.includes(join(fixture, 'art-build/rustwall-p2', `${probe}-probe.json`)));
    }
  });
  check('runtime assets, source cars and recipe stay byte-identical during fixture execution', () => {
    assert.deepEqual(protectedPaths.map(path => hash(readFileSync(join(root, path)))), protectedHashes);
  });
  for (const {name, run} of checks) {
    try { run(); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
} finally {
  assert.ok(scratch.startsWith(scratchHome + sep), 'cleanup target remains lane scratch');
  rmSync(scratch, {recursive: true, force: true});
}
console.log(`rustwall atlas isolation: ${checks.length} checks, ${checks.length - failures} passed, ${failures} failed`);
if (failures) process.exitCode = 1;
