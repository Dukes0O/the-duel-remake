"""Candidate Wasteland construction-stage, ruin and street props."""
import math
import json
import random
import sys
from pathlib import Path
if '--paths-only' in sys.argv:
    import argparse
    cli=[arg for arg in sys.argv[1:] if arg!='--']
    parser=argparse.ArgumentParser();parser.add_argument('--root',default=str(Path(__file__).resolve().parents[2]));parser.add_argument('--evidence',default='');parser.add_argument('--paths-only',action='store_true')
    args=parser.parse_args(cli);root=Path(args.root).resolve();evidence=Path(args.evidence).resolve() if args.evidence else root/'.evidence/2026-11-05/TOWN-ART-STAGES/art-build'
    print(json.dumps({'blend':[str(evidence/'stages.blend')],
      'glb':[str(root/'public/assets/models/wasteland/town/stages.glb')]}));raise SystemExit(0)
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import town_base as t

OUT=Path(__file__).resolve().parents[2]/'public/assets/models/wasteland/town/stages.glb'
EVIDENCE=Path(__file__).resolve().parents[2]/'.evidence/2026-11-05/TOWN-ART-STAGES'
ids=['scaffold-1','scaffold-2','scaffold-3','scaffold-4']+[f'rubble-{i}' for i in range(1,5)]+[f'burnt-{i}' for i in range(1,5)]+['street-lamp','barrel-fire','crate-stack','barrels','washing-line','bench','bin','signpost','sandbags','junk-pile','dead-tree']
def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def build():
    reset()
    texture_dir=OUT.parent/'textures'
    mats=t.make_materials({'weathered-plank':texture_dir/'timber.jpg','rusted-steel':texture_dir/'tin.jpg',
      'galvanised-tin':texture_dir/'tin.jpg','iron-dark':texture_dir/'charred-wood.jpg',
      'salvaged-brick':texture_dir/'rubble.jpg'})
    atlas=next(node.image for mat in mats.values() for node in mat.node_tree.nodes
               if node.type=='TEX_IMAGE' and node.image is not None)
    atlas.scale(384,384);atlas.pack()
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.render.resolution_x=900;scene.render.resolution_y=620;scene.render.resolution_percentage=100
    scene.world.color=(.62,.62,.62)
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.75,.78,.82,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
    scene.view_settings.view_transform='AgX'
    family=bpy.data.objects.new('town-stages',None);scene.collection.objects.link(family);roots=[]
    def cube(n,c,s,m,bev=.025):return t.cube(n,c,s,m,bev)
    def beam(n,a,b,w,m):return t.beam(n,a,b,w,m)
    def scaffold(prefix,w,d,h,stage):
        start=set(scene.objects)
        # Each early stage tells a different point in the build sequence.
        if stage == 1:
          for side in (-1,1):
            beam(prefix+':foundation-trench',(-w*.40,.04,side*d*.40),(w*.40,.04,side*d*.40),.42,mats['iron-dark'])
          for x in (-w*.42,w*.42):
            for z in (-d*.42,d*.42):
              cube(prefix+':layout-peg',(x,.24,z),(.10,.48,.10),mats['weathered-plank'])
              beam(prefix+':layout-string',(x,.42,z),(-x,.42,-z),.018,mats['patched-canvas'])
        else:
          # Visible masonry pads lift every standard clear of the dirt.
          for x in (-w*.47,w*.47):
            for z in (-d*.47,d*.47):
              cube(prefix+':base-block',(x,.18,z),(.48,.36,.48),mats['cracked-concrete'],.035)
        # timber standards, steel ledgers, cross braces and real plank walkways
        for x in (-w*.47,w*.47):
          for z in (-d*.47,d*.47):beam(prefix+':post',(x,.08,z),(x,h,z),.13,mats['weathered-plank'])
        levels=[.75,h*.58,h*.92] if stage>=2 else [.75,h*.82]
        for y in levels:
          for z in (-d*.47,d*.47):beam(prefix+':ledger',( -w*.5,y,z),(w*.5,y,z),.09,mats['rusted-steel'])
          for x in (-w*.47,w*.47):beam(prefix+':side-ledger',(x,y,-d*.48),(x,y,d*.48),.08,mats['rusted-steel'])
        for z in (-d*.47,d*.47):beam(prefix+':cross-brace',(-w*.46,.15,z),(w*.46,h*.84,z),.065,mats['rusted-steel'])
        for x in (-w*.47,w*.47):beam(prefix+':side-brace',(x,.15,-d*.46),(x,h*.8,d*.46),.06,mats['rusted-steel'])
        for y in levels[:-1]:
          # A narrow work platform at the scaffold face leaves the interior
          # open; full-floor decks read as a roof slab at the mayor's camera.
          for plank in range(max(4,round(w/.45))):
            px=-w*.44+plank*.44
            cube(prefix+':walkway-plank',(px,y+.07,-d*.28),(.42,.12,.78),mats['weathered-plank'],.012)
        # exposed half-wall of pressed tin and rough infill varies by stage
        if stage>=3:
          for x in (-w*.25,w*.25):
            t.corrugated_sheet(prefix+':wall-panel',(x,h*.44,-d*.49),w*.42,h*.67,mats,bent=.025*(1 if x>0 else -1))
          beam(prefix+':ridge-pole',(-w*.48,h*.94,0),(w*.48,h*.94,0),.12,mats['rusted-steel'])
        if stage == 4:
          for x in (-w*.33,w*.33):
            sheet=t.corrugated_sheet(prefix+':removed-sheet',(x,.85,-d*.62),w*.28,1.5,mats,bent=.08,turn=.48)
            sheet.rotation_euler[0]=-.28
        # ladder, rope and bucket hoist distinguish the construction silhouette
        lx=w*.31;beam(prefix+':ladder-left',(lx,.1,-d*.58),(lx-.25,h*.78,-d*.58),.075,mats['weathered-plank']);beam(prefix+':ladder-right',(lx+.42,.1,-d*.58),(lx+.17,h*.78,-d*.58),.075,mats['weathered-plank'])
        for k in range(6):beam(prefix+':ladder-rung',(lx-.2+k*.003,.25+k*h*.085,-d*.58),(lx+.36+k*.003,.25+k*h*.085,-d*.58),.045,mats['weathered-plank'])
        beam(prefix+':hoist-arm',(-w*.45,h,-d*.35),(w*.45,h,-d*.35),.085,mats['rusted-steel']);t.pipe_run(prefix+':rope',[(w*.35,h,-d*.35),(w*.35,h*.38,-d*.35)],.015,mats['iron-dark'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.16,depth=.22,location=t.game_vector((w*.35,h*.35,-d*.35)));bpy.context.object.name=prefix+':bucket';bpy.context.object.data.materials.append(mats['galvanised-tin'])
        for o in set(scene.objects)-start:
          if o.parent is None:o.parent=root
    for n in range(1,5):
      w=d=8*n;h=2.4+1.05*n;root=bpy.data.objects.new(f'scaffold-{n}',None);scene.collection.objects.link(root);root.parent=family;roots.append(root)
      scaffold(f'scaffold-{n}',w-1.2,d-1.2,h,n)
    for n in range(1,5):
      prefix=f'rubble-{n}';root=bpy.data.objects.new(prefix,None);scene.collection.objects.link(root);root.parent=family;roots.append(root);rng=random.Random(880+n); span=2.2*n
      for k in range(22+12*n):
        x=rng.uniform(-span/2,span/2);z=rng.uniform(-span/2,span/2);y=rng.uniform(.12,.55+1.4*n/4);a=rng.uniform(.35,1.2);o=cube(prefix+':broken-member',(x,y,z),(a,rng.uniform(.12,.28),rng.uniform(.12,.35)),rng.choice([mats['weathered-plank'],mats['rusted-steel'],mats['galvanised-tin']]),.02);o.rotation_euler[0]=rng.uniform(-.7,.7);o.rotation_euler[2]=rng.uniform(-.9,.9);o.parent=root
      for k in range(7):beam(prefix+':bent-frame',(rng.uniform(-span*.4,span*.4),.2,rng.uniform(-span*.4,span*.4)),(rng.uniform(-span*.4,span*.4),rng.uniform(1,2.4),rng.uniform(-span*.4,span*.4)),.085,mats['rusted-steel']).parent=root
    for n in range(1,5):
      prefix=f'burnt-{n}';root=bpy.data.objects.new(prefix,None);scene.collection.objects.link(root);root.parent=family;roots.append(root);span=2.5*n;h=2.5+.8*n
      for x in (-span*.42,span*.42):
        for z in (-span*.42,span*.42):beam(prefix+':charred-post',(x,.08,z),(x,h*(.72 if x<0 else 1),z),.14,mats['iron-dark']).parent=root
      for y in (h*.36,h*.72):
        beam(prefix+':blackened-beam',(-span*.48,y,-span*.42),(span*.48,y*.92,span*.42),.13,mats['rusted-steel']).parent=root
      for x in (-span*.42,span*.42):beam(prefix+':broken-rafter',(x,h*.72,-span*.42),(x*.6,h*.5,span*.42),.11,mats['iron-dark']).parent=root
      ember=bpy.data.materials.new(prefix+' ember glow');ember.diffuse_color=(1,.12,.015,1);ember.use_nodes=True;bs=ember.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,.035,.002,1);bs.inputs['Emission Color'].default_value=(1,.035,.002,1);bs.inputs['Emission Strength'].default_value=2
      e=cube(prefix+':ember',(0,.12,0),(.34,.18,.34),ember,.03);e.parent=root;e.name=prefix+':ember'
    # under-cell street objects; separate emissive named children where specified
    def prop(id):
      r=bpy.data.objects.new(id,None);scene.collection.objects.link(r);r.parent=family;roots.append(r);return r
    r=prop('street-lamp');beam('street-lamp:post',(0,0,0),(0,4.2,0),.09,mats['rusted-steel']).parent=r;beam('street-lamp:arm',(0,4.0,0),(.65,4.15,0),.07,mats['rusted-steel']).parent=r
    em=bpy.data.materials.new('street lamp emission');em.use_nodes=True;em.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=3;em.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(1,.48,.12,1);cube('street-lamp:lamp',(.68,4.08,0),(.32,.14,.25),em).parent=r
    r=prop('barrel-fire');t.drum('barrel-fire:drum',(0,.48,0),mats);[setattr(o,'parent',r) for o in set(scene.objects) if o.name.startswith('barrel-fire:') and o.parent is None]; e=cube('barrel-fire:lamp',(0,1.1,0),(.36,.28,.36),em);e.parent=r
    for id,count in [('crate-stack',3),('barrels',3),('washing-line',1),('bench',1),('bin',1),('signpost',1),('sandbags',1),('junk-pile',1),('dead-tree',1)]:
      r=prop(id)
      if id=='crate-stack':
        for x,y,z in [(-.42,.4,0),(.42,.4,0),(0,1.15,0)]:cube(id+':crate',(x,y,z),(.78,.78,.78),mats['weathered-plank']).parent=r
      elif id=='barrels':
        for x in (-.42,.42):
          t.drum(id+':drum',(x,.48,0),mats)
          for o in set(scene.objects):
            if o.name.startswith(id+':drum') and o.parent is None:o.parent=r
      elif id=='washing-line':t.washing_line(id,(-1,2,0),(1,1.8,0),mats);[setattr(o,'parent',r) for o in set(scene.objects) if o is not r and o.name.startswith(id) and o.parent is None]
      elif id=='bench':
        cube(id+':seat',(0,.55,0),(1.5,.12,.48),mats['weathered-plank']).parent=r
        for x in (-.58,.58):beam(id+':leg',(x,.08,0),(x,.55,0),.09,mats['rusted-steel']).parent=r
        cube(id+':back',(0,.95,.2),(1.5,.7,.1),mats['weathered-plank']).parent=r
      elif id=='bin':cube(id+':body',(0,.55,0),(.72,1.1,.72),mats['rusted-steel']).parent=r;cube(id+':lid',(0,1.13,0),(.82,.1,.82),mats['galvanised-tin']).parent=r
      elif id=='signpost':
        beam(id+':post',(0,0,0),(0,2.4,0),.1,mats['rusted-steel']).parent=r
        for i in range(3):cube(id+':arrow',(0,1.0+i*.55,0),(.9,.28,.07),mats['galvanised-tin']).parent=r
      elif id=='sandbags':t.sandbag_row(id,( -.8,.2,0),5,mats);[setattr(o,'parent',r) for o in set(scene.objects) if o is not r and o.name.startswith(id) and o.parent is None]
      elif id=='junk-pile':
        rng=random.Random(55)
        for i in range(14):
          o=cube(id+':scrap',(rng.uniform(-.6,.6),rng.uniform(.15,.65),rng.uniform(-.5,.5)),(rng.uniform(.25,.8),.12,rng.uniform(.2,.6)),mats['rusted-steel'],.015);o.rotation_euler[2]=rng.uniform(-1,1);o.parent=r
      else:
        beam(id+':trunk',(0,0,0),(.12,2.8,0),.25,mats['iron-dark']).parent=r
        for j in range(5):beam(id+':branch',(0,1+j*.28,0),((-.8 if j%2 else .8),1.5+j*.28,0),.11,mats['iron-dark']).parent=r
    # normalize every object into its declared child root and export GLB
    bpy.ops.object.select_all(action='DESELECT')
    for o in scene.objects:
      if o.type=='MESH' and o.parent is None:
        match=next((r for r in roots if o.name.startswith(r.name+':')),None)
        if match:o.parent=match
    OUT.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=True,
      export_apply=True,export_materials='EXPORT',export_image_format='JPEG',export_image_quality=65)
    # bright overcast rendered proof: a broad family lineup on a sand stage
    # Close three-quarter proof of the representative scaffold, framed large
    # enough to judge its 8 m proportions and construction details.
    visible_root=next(root for root in roots if root.name=='scaffold-2')
    for obj in scene.objects:
      ancestor=obj
      while ancestor.parent is not None and ancestor.parent is not family:ancestor=ancestor.parent
      obj.hide_render=(obj.type=='MESH' and ancestor is not visible_root and obj.name!='render-only sand')
    visible_root.hide_render=False
    floor=cube('render-only sand',(0,0,-.12),(19,.2,19),mats['sand'])
    bpy.ops.object.camera_add(location=(27,-37,23));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-0,2.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=50;scene.camera=cam
    bpy.ops.object.light_add(type='AREA',location=(1,-9,18));bpy.context.object.data.energy=25000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=12
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(EVIDENCE/'family-overview.png');EVIDENCE.mkdir(parents=True,exist_ok=True);bpy.ops.render.render(write_still=True)
if __name__=='__main__':build()
