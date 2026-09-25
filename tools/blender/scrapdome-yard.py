"""Build the authored Scrapdome yard in gate-local metres.

blender -b --python-exit-code 1 --python tools/blender/scrapdome-yard.py -- --root . --round 1
Coordinates in this script are glTF X right, Y up, Z into the yard.
"""
import argparse
import hashlib
import json
import math
import os
import sys
from datetime import date
from pathlib import Path

args_parser = argparse.ArgumentParser()
args_parser.add_argument('--root', required=True)
args_parser.add_argument('--round', type=int, required=True)
args_parser.add_argument('--skip-renders', action='store_true')
args_parser.add_argument('--paths-only', action='store_true')
args_parser.add_argument('--hero-probe', action='store_true')
args_parser.add_argument('--probe-model', choices=('f42','banshee','titan'), default='f42')
args = args_parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
output = root / 'public/assets/models/wasteland/scrapdome/yard.glb'
blend_output = root / 'art-build/scrapdome/yard.blend'
evidence = Path(os.environ.get('DUEL_EVIDENCE_DIR') or root / '.evidence' / date.today().isoformat() / 'scrapdome' / f'round-{args.round}')
if not evidence.is_absolute(): evidence = root / evidence
if args.paths_only:
    print(json.dumps({'blend': [str(blend_output)],
                      'glb': [str(output)],
                      'textures': [str(blend_output.parent / f'{name}-color.png')
                                   for name in ('metal', 'wreck', 'earth')],
                      'evidence': [str(evidence)]}))
    sys.exit(0)
for path in (output.parent, blend_output.parent, evidence): path.mkdir(parents=True, exist_ok=True)

import bpy
import bmesh
import numpy as np
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def blender_point(point):
    return (point[0], -point[2], point[1])

def make_material(name, colors, seed):
    rng = np.random.default_rng(seed)
    size = 1024
    pixels = np.ones((size, size, 4), np.float32)
    for tile, base in enumerate(colors):
        column, row = tile % 4, tile // 4
        noise = rng.normal(0, .034, (256, 256, 1)).astype(np.float32)
        fleck = (rng.random((256, 256, 1)) > .985).astype(np.float32) * .15
        coarse = np.repeat(np.repeat(rng.normal(0, .028, (32, 32, 1)).astype(np.float32), 8, 0), 8, 1)
        pigment = np.clip(np.array(base, np.float32) + noise + coarse + fleck, .015, .95)
        yy, xx = np.mgrid[0:256, 0:256]
        if name != 'earth':
            edge = np.minimum.reduce((xx, 255-xx, yy, 255-yy))
            rust = np.clip((32-edge)/30, 0, 1)[..., None]
            soot = np.clip((yy-157)/86, 0, 1)[..., None]
            corrugation = (np.sin(xx*.29)*.025)[..., None]
            seam = ((xx%83)<3)[..., None]
            pigment = np.clip(pigment*(1-.35*rust-.16*soot)
                              + rust*np.array([.15,.045,.012],np.float32)
                              + corrugation - seam*.10, .012, .95)
            if name == 'wreck' and tile == 6:
                frame = (edge<18)[..., None]
                pigment = np.where(frame, np.array([.19,.14,.12],np.float32),
                                   pigment*.48)
        else:
            track = (np.sin(xx*.08+np.sin(yy*.025)*3)*.035)[...,None]
            pigment = np.clip(pigment+track, .015, .95)
        pixels[row*256:(row+1)*256, column*256:(column+1)*256, :3] = pigment
    image = bpy.data.images.new(name + ' painted atlas', width=size, height=size, alpha=True)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(blend_output.parent / (name + '-color.png'))
    image.file_format = 'PNG'; image.save()
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    color = nodes.new('ShaderNodeTexImage'); color.image = image
    nodes.get('Principled BSDF').inputs['Roughness'].default_value = .94
    material.node_tree.links.new(color.outputs['Color'], nodes.get('Principled BSDF').inputs['Base Color'])
    return material

palette = {
    'metal': [( .20,.24,.23),(.36,.26,.17),(.12,.15,.15),(.39,.38,.30),
              (.25,.31,.30),(.45,.22,.11),(.08,.10,.11),(.53,.43,.30),
              (.30,.34,.33),(.31,.16,.10),(.17,.19,.18),(.41,.33,.23),
              (.19,.27,.28),(.48,.30,.16),(.11,.12,.13),(.58,.50,.38)],
    'wreck': [( .26,.32,.29),(.49,.25,.12),(.19,.20,.20),(.39,.39,.33),
              (.39,.16,.09),(.24,.29,.33),(.08,.09,.09),(.53,.43,.25),
              (.16,.24,.24),(.35,.27,.18),(.12,.13,.14),(.40,.35,.31),
              (.47,.31,.19),(.32,.18,.10),(.23,.25,.25),(.58,.42,.27)],
    'earth': [( .41,.30,.19),(.38,.27,.17),(.49,.38,.24),(.31,.23,.16),
              (.44,.31,.18),(.37,.30,.20),(.52,.40,.27),(.34,.24,.16),
              (.45,.34,.22),(.38,.27,.17),(.47,.36,.24),(.32,.23,.15),
              (.46,.34,.22),(.40,.29,.19),(.53,.40,.26),(.37,.27,.18)]
}
materials = {name: make_material(name, colors, i + 41)
             for i, (name, colors) in enumerate(palette.items())}

def production_hulk(relative_path, hero=False, budgets=None, weld=False,
                    with_stats=False, ring_wheels=False):
    """Offline-decimated body, glass and four tires in shared car coordinates."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(root / relative_path))
    imported = set(bpy.data.objects) - before
    bpy.context.view_layer.update()
    body = next(obj for obj in imported if obj.type == 'MESH' and obj.name == 'Lacquered body')
    trim = next(obj for obj in imported if obj.type == 'MESH' and obj.name == 'Carbon and trim')
    glass = next(obj for obj in imported if obj.type == 'MESH' and obj.name == 'Glass')
    tires = sorted((obj for obj in imported if obj.type == 'MESH' and obj.name.startswith('Tire rubber')),
                   key=lambda obj: obj.name)[:4]
    assert len(tires) == 4
    sources = ([(body,budgets[0],0),(trim,budgets[1],9),(glass,16,6),
                *((obj,budgets[2],6) for obj in tires)] if budgets else
               [(body,260,0),(trim,80,9),(glass,16,6),*((obj,16,6) for obj in tires)]
               if hero else [(body,100,0),(glass,16,6),*((obj,12,6) for obj in tires)])
    def components(bm):
        remaining=set(bm.verts); count=0
        while remaining:
            count+=1; stack=[remaining.pop()]
            while stack:
                vertex=stack.pop()
                for edge in vertex.link_edges:
                    other=edge.other_vert(vertex)
                    if other in remaining:
                        remaining.remove(other);stack.append(other)
        return count
    weld_stats=[]
    if weld:
        for obj,_,_ in sources:
            bm=bmesh.new();bm.from_mesh(obj.data)
            before={'vertices':len(bm.verts),'components':components(bm)}
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
            after={'vertices':len(bm.verts),'components':components(bm)}
            bm.to_mesh(obj.data);obj.data.update();bm.free()
            weld_stats.append({'name':obj.name,'before':before,'after':after})
    all_points = [obj.matrix_world @ vertex.co for obj in [body,trim,glass,*tires]
                  for vertex in obj.data.vertices]
    mid_x=(max(p.x for p in all_points)+min(p.x for p in all_points))/2
    mid_y=(max(p.y for p in all_points)+min(p.y for p in all_points))/2
    half_x=(max(p.x for p in all_points)-min(p.x for p in all_points))/2
    half_y=(max(p.y for p in all_points)-min(p.y for p in all_points))/2
    min_z=min(p.z for p in all_points); height=max(p.z for p in all_points)-min_z
    def normal(point):
        return ((point.x-mid_x)/half_x*.5,(point.y-mid_y)/half_y*.5,
                (point.z-min_z)/height*2.35)
    triangles=[]
    for obj, target, tile in (sources[:-4] if ring_wheels else sources):
        modifier=obj.modifiers.new('Offline yard silhouette', 'DECIMATE')
        modifier.ratio=min(1, target/max(1,len(obj.data.polygons)))
        evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh=bpy.data.meshes.new_from_object(evaluated)
        mesh.calc_loop_triangles()
        for face in mesh.loop_triangles:
            points=[obj.matrix_world @ mesh.vertices[index].co for index in face.vertices]
            triangles.append((tile,tuple(normal(p) for p in points)))
        bpy.data.meshes.remove(mesh)
    if ring_wheels:
        for obj in tires:
            points=[obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
            xs=[p.x for p in points];ys=[p.y for p in points];zs=[p.z for p in points]
            x0,x1=min(xs),max(xs);cy=(min(ys)+max(ys))/2;cz=(min(zs)+max(zs))/2
            ry=(max(ys)-min(ys))/2;rz=(max(zs)-min(zs))/2
            def wheel_point(x,r,angle):
                return normal(Vector((x,cy+ry*r*math.cos(angle),cz+rz*r*math.sin(angle))))
            for i in range(8):
                a=i*math.tau/8;b=(i+1)*math.tau/8
                for x in [x0,x1]:
                    outer_a,outer_b=wheel_point(x,1,a),wheel_point(x,1,b)
                    inner_a,inner_b=wheel_point(x,.52,a),wheel_point(x,.52,b)
                    triangles.extend([(6,(outer_a,outer_b,inner_b)),(6,(outer_a,inner_b,inner_a))])
                for radius in [1,.52]:
                    a0,a1=wheel_point(x0,radius,a),wheel_point(x1,radius,a)
                    b0,b1=wheel_point(x0,radius,b),wheel_point(x1,radius,b)
                    triangles.extend([(6,(a0,a1,b1)),(6,(a0,b1,b0))])
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    return (triangles,weld_stats) if with_stats else triangles

if args.hero_probe:
    source={'f42':'public/assets/models/classics/falcone_f42.glb',
            'banshee':'public/assets/models/unlocks/banshee_muscle.glb',
            'titan':'public/assets/models/unlocks/titan_monster.glb'}[args.probe_model]
    probe_dir=evidence/('hulk-probe' if args.probe_model=='f42' else f'hulk-probe-{args.probe_model}')
    probe_dir.mkdir(parents=True,exist_ok=True)
    budgets=({'source':(1000000,1000000,1000000),'target1000':(750,180,16),
             'welded1000':(750,180,16),'welded1200':(750,180,64),
             'rings1200':(750,180,64)} if args.probe_model=='f42' else
             {'rings1200':(750,180,64)})
    reports={}
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24
    scene.render.resolution_x=960; scene.render.resolution_y=600
    scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Neutral hero probe');scene.world.color=(.55,.55,.55)
    sun=bpy.data.lights.new('Probe sun','SUN');sun.energy=2.0
    sun_object=bpy.data.objects.new('Probe sun',sun);bpy.context.collection.objects.link(sun_object)
    sun_object.rotation_euler=(.45,-.55,-.6)
    camera_data=bpy.data.cameras.new('Hero probe camera')
    camera=bpy.data.objects.new('Hero probe camera',camera_data)
    bpy.context.collection.objects.link(camera);scene.camera=camera
    for label,targets in budgets.items():
        triangles,weld_stats=production_hulk(source,True,targets,
            label.startswith('welded') or label=='rings1200',True,label=='rings1200')
        vertices=[];faces=[];regions=[]
        for region,triangle in triangles:
            start=len(vertices)
            vertices.extend((side*5.5,-along*10,up*1.15) for side,along,up in reversed(triangle))
            faces.append((start,start+1,start+2));regions.append(region)
        mesh=bpy.data.meshes.new(f'{label} source shape')
        mesh.from_pydata(vertices,[],faces);mesh.update()
        for material in [materials['wreck'],materials['metal'],materials['metal']]:
            mesh.materials.append(material)
        for polygon,region in zip(mesh.polygons,regions):
            polygon.material_index=0 if region==0 else 1 if region==9 else 2
        obj=bpy.data.objects.new(label,mesh);bpy.context.collection.objects.link(obj)
        bounds={'x':[min(v[0] for v in vertices),max(v[0] for v in vertices)],
                'y':[min(v[1] for v in vertices),max(v[1] for v in vertices)],
                'z':[min(v[2] for v in vertices),max(v[2] for v in vertices)]}
        reports[label]={'triangles':len(triangles),'regions':{str(key):regions.count(key)
                        for key in set(regions)},'boundsMetres':bounds,'weld':weld_stats,'images':[]}
        for view,position in [('front',(0,-18,6)),('profile',(18,0,6)),('three-quarter',(14,-16,8))]:
            camera.location=position
            camera.rotation_euler=(Vector((0,0,1.3))-camera.location).to_track_quat('-Z','Y').to_euler()
            camera_data.type='ORTHO';camera_data.ortho_scale=14
            path=probe_dir/f'{label}-{view}.png';scene.render.filepath=str(path)
            bpy.ops.render.render(write_still=True)
            reports[label]['images'].append(str(path))
        bpy.data.objects.remove(obj,do_unlink=True)
    (probe_dir/'report.json').write_text(json.dumps(reports,indent=2)+'\n',encoding='utf8')
    print('HULK_PROBE_RESULT '+json.dumps(reports))
    sys.exit(0)

hulk_templates = [production_hulk(path) for path in (
    'public/assets/models/classics/falcone_f42.glb',
    'public/assets/models/unlocks/banshee_muscle.glb',
    'public/assets/models/unlocks/titan_monster.glb')]
hero_templates = [production_hulk(path, True, (750,180,64), True, False, True) for path in (
    'public/assets/models/classics/falcone_f42.glb',
    'public/assets/models/unlocks/banshee_muscle.glb')]
support_templates = [production_hulk(path, True, (300,60,64), True, False, True) for path in (
    'public/assets/models/classics/falcone_f42.glb',
    'public/assets/models/unlocks/banshee_muscle.glb')]

class Mesh:
    def __init__(self, name):
        self.name, self.vertices, self.faces, self.uv = name, [], [], []

    def face(self, points, tile=0):
        start = len(self.vertices)
        self.vertices.extend(blender_point(point) for point in points)
        self.faces.append(tuple(range(start, start + len(points))))
        col, row = tile % 4, tile // 4
        pad = .008
        corners = [(pad,pad),(1-pad,pad),(1-pad,1-pad),(pad,1-pad)]
        self.uv.append([((col + corners[i % 4][0])/4, (row + corners[i % 4][1])/4)
                        for i in range(len(points))])

    def box(self, cx, cy, cz, sx, sy, sz, tile=0, heading=0):
        hx, hy, hz = sx/2, sy/2, sz/2
        corners = [(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),
                   (-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]
        sin, cos = math.sin(heading), math.cos(heading)
        points = [(cx+x*cos+z*sin, cy+y, cz-x*sin+z*cos) for x,y,z in corners]
        for indices in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)]:
            self.face([points[index] for index in indices],tile)

    def cylinder(self, x, bottom, z, radius, height, sides, tile=0):
        for index in range(sides):
            a=2*math.pi*index/sides; b=2*math.pi*(index+1)/sides
            edge=lambda angle,y:(x+radius*math.cos(angle),y,z+radius*math.sin(angle))
            self.face([edge(a,bottom),edge(b,bottom),edge(b,bottom+height),edge(a,bottom+height)],tile)
        # Caps are not visible on low yard clutter; the open side keeps draws small.

    def beam(self, start, end, width, tile=0):
        ax,ay,az=start;bx,by,bz=end
        dx,dy,dz=bx-ax,by-ay,bz-az
        length=math.sqrt(dx*dx+dy*dy+dz*dz)
        forward=(dx/length,dy/length,dz/length)
        side=(-forward[2],0,forward[0]); side_length=math.hypot(side[0],side[2]) or 1
        side=tuple(value/side_length for value in side)
        up=(forward[1]*side[2],forward[2]*side[0]-forward[0]*side[2],-forward[1]*side[0])
        def corner(origin,s,u):
            return tuple(origin[i]+width*.5*(s*side[i]+u*up[i]) for i in range(3))
        a=[corner(start,s,u) for s,u in [(-1,-1),(1,-1),(1,1),(-1,1)]]
        b=[corner(end,s,u) for s,u in [(-1,-1),(1,-1),(1,1),(-1,1)]]
        self.face(a,tile);self.face(list(reversed(b)),tile)
        for i in range(4):self.face([a[i],b[i],b[(i+1)%4],a[(i+1)%4]],tile)

    def build(self, material):
        mesh=bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.vertices, [], self.faces); mesh.update()
        mesh.materials.append(material)
        uv_layer=mesh.uv_layers.new(name='Painted atlas UV')
        for polygon, coords in zip(mesh.polygons,self.uv):
            for loop, uv in zip(polygon.loop_indices, coords): uv_layer.data[loop].uv=uv
        object=bpy.data.objects.new(self.name,mesh); bpy.context.collection.objects.link(object)
        return object

metal, wreck, earth = Mesh('Yard scaffold and barriers'), Mesh('Stacked wreck silhouettes'), Mesh('Dirt loop and strata')

def car_hulk(x, base, z, width, length, tile, heading, kind=0, hero=False, support=False):
    """Stamp a decimated whole production body, its glass and four tires."""
    sin,cos=math.sin(heading),math.cos(heading)
    dent=kind*.37+heading*1.7
    templates=support_templates if support else hero_templates if hero else hulk_templates
    for region, triangle in templates[kind%len(templates)]:
        placed=[]
        for side,along,up in triangle:
            crushed=max(0,up*((1.15 if hero else .84 if support else .72)
                        +.04*math.sin(along*11+dent))
                        +.12*math.sin(side*8+along*7+dent))
            px=(side+.035*math.sin(along*15+dent))*width
            pz=along*length
            placed.append((x+px*cos+pz*sin,base+crushed,z-px*sin+pz*cos))
        # Imported car Y points toward the opposite longitudinal axis in yard space.
        wreck.face(list(reversed(placed)),tile if region==0 else region)

# A dark, worn loop within the existing flat patch. It reads as a future bowl,
# with a lower island in the middle; no drivable arena geometry is installed.
center_z=118
island_z=90
for band, inner, outer, tile in [('rim',65,72,2),('loop',32,65,0),('island',0,32,5)]:
    count=48
    for i in range(count):
        a=2*math.pi*i/count; b=2*math.pi*(i+1)/count
        v=lambda radius,angle:(radius*math.cos(angle), .035 if band=='rim' and radius==outer else .075,
                                center_z+radius*math.sin(angle))
        if inner:
            earth.face([v(inner,a),v(outer,a),v(outer,b),v(inner,b)],tile)
        else:
            earth.face([(0,.08,center_z),v(outer,a),v(outer,b)],tile)
        if band=='rim':
            foot=lambda angle:(outer*math.cos(angle),.03,center_z+outer*math.sin(angle))
            earth.face([foot(a),foot(b),v(outer,b),v(outer,a)],3)
        if band=='loop' and i%3==0:
            # Short dark ruts follow the curved working track, not a clean disk.
            for r in [48,59]:
                mark=lambda angle:(r*math.cos(angle),.095,center_z+r*math.sin(angle))
                earth.face([mark(a),mark(b),((r+.8)*math.cos(b),.095,center_z+(r+.8)*math.sin(b)),
                            ((r+.8)*math.cos(a),.095,center_z+(r+.8)*math.sin(a))],3)

# Deliberately uneven wreck banks: varied widths, pitches and heights, with
# hollow dark windows rather than repeated flat rectangular panel colors.
for side in [-1,1]:
    # A broken dark understructure ties many small car silhouettes into one
    # salvage bank while leaving different roof heights and gaps.
    for i in range(18):
        z=48+i*8.1
        x=side*(97+(i%3)*1.4)
        low=(0,.08); h1=7+(i*5)%7; h2=7+((i+1)*5)%7
        face=[(x,low[1],z),(x,low[1],z+8.1),(x,h2,z+8.1),(x,h1,z)]
        metal.face(face,6 if i%3 else 9)
        metal.face(list(reversed(face)),6 if i%3 else 9)
    for i,z in enumerate([61,97,139,181]):
        x=side*(85+(i%2)*4)
        wreck.box(x,.85+(i%2)*.35,z,7.4,1.6+(i%2)*.7,16,(i*3+1)%16,side*.12)
    # Fragmented tire/barrier boundary in front of the banks, not in the lane.
    for i in range(18):
        z=48+i*8.4
        x=side*(78+(i%3)*.7)
        metal.box(x,.48,z,1.25,.96,4.1,(i+9)%16,side*.03)
        for offset in [-1,1]: wreck.cylinder(x+side*1.2,.08,z+offset*1.1,.55,.8,8,6)

for i in range(40):
    a=i*math.tau/40
    x=34*math.cos(a);z=island_z+34*math.sin(a)
    b=(i+1)*math.tau/40
    next_x=34*math.cos(b);next_z=island_z+34*math.sin(b)
    metal.beam((x,.7,z),(next_x,.7,next_z),1.15,(i//3)%16)
    if i%2:wreck.cylinder(x,.08,z,.85,.85,8,6)
    if i%4==0:
        metal.box(x,1.05,z,2.6,2.0,3.5,9,a)
        for level in range(2): wreck.cylinder(x+1.6,.08+level*.75,z,.75,.72,6,6)

# A smaller service crane sits opposite the massive diagonal salvage crane.
for x,z,height,arm,angle in [(76,157,31,35,.18)]:
    metal.box(x,1.6,z,12,3.2,11,9)
    for dx in [-2.7,2.7]:
        metal.box(x+dx,height/2,z,1.4,height,1.4,6)
    metal.box(x,height-.7,z,7.2,1.4,6.3,6)
    metal.box(x-8,4.2,z-4,13,7.8,8,9)
    metal.beam((x-12,5,z-4),(x-2,height-2,z),2.3,6)
    metal.beam((x-12,5,z+4),(x-2,height-2,z),2.3,6)
    for i in range(5):
        metal.box(x+(i+.5)*arm/5,height-1.8-i*.75,z,arm/5+.2,.95,1.25,6,angle)
        # Broad diagonal web and a second lower chord turn poles into cranes.
        metal.box(x+(i+.5)*arm/5,height-3.2-i*.75,z+1.2,arm/5+.2,.65,.9,6,angle)
        metal.box(x+(i+.5)*arm/5,height-2.0-i*.75,z+.5,1.0,2.5,.8,6,angle+.25)
        foot=x+i*arm/5; next_foot=x+(i+1)*arm/5
        metal.beam((foot,height-3.4-i*.75,z-1),(next_foot,height-.6-(i+1)*.75,z-1),.85,6)
        metal.beam((foot,height-.6-i*.75,z+1),(next_foot,height-3.4-(i+1)*.75,z+1),.85,6)
    for side in [-1,1]:
        metal.beam((x+side*6,.25,z+side*3),(x+side*2.7,height-1,z),1.5,6)
    metal.beam((x-7,.3,z-4),(x,height-2,z),1.2,7)
    tip=x+arm
    metal.box(tip,height*.55,z,.32,height*.50,.32,6)
    metal.box(tip,height*.28,z,4,1.2,2,9)
    for side in [-1,1]: metal.beam((tip+side*1.6,height*.28,z),(tip+side*2.4,height*.13,z),.65,6)
    for dx in [-3.3,3.3]:
        metal.box(x+dx,height*.38,z+2.2,.8,height*.65,.8,7,dx*.003)

# Heavy inclined truss boom, grounded base, counterweight and hanging claw.
metal.box(-65,3,115,15,6,13,9)
for x in [-69,-61]:
    metal.beam((x,.1,111),(-65,25,114),2.1,6)
    metal.beam((x,.1,119),(-65,25,116),2.1,6)
for i,(width,depth) in enumerate([(12,9),(10,8),(8,7)]):
    metal.box(-48,16.8+i*2.5,115,width,2.4,depth,9 if i!=1 else 6)
metal.beam((-48,.1,115),(-48,16,115),3.4,6)
metal.beam((-57,.8,111),(-48,17,115),2.0,6)
metal.beam((-48,20,115),(-65,25,115),2.2,6)
metal.beam((-48,24,113),(-65,31,113),.55,6)
metal.beam((-48,24,117),(-65,31,117),.55,6)
for i in range(6):
    x0=-65-i*47/6; x1=-65-(i+1)*47/6
    y0=25+i*17/6; y1=25+(i+1)*17/6
    for depth in [-2.1,2.1]:
        metal.beam((x0,y0,115+depth),(x1,y1,115+depth),1.4,6)
        metal.beam((x0,y0-4,115+depth),(x1,y1-4,115+depth),1.0,9)
        metal.beam((x0,y0-4,115+depth),(x1,y1,115+depth),.72,6)
metal.beam((-112,42,115),(-112,15,115),.38,6)
metal.box(-112,15,115,5,1.8,3,9)
for side in [-1,1]: metal.beam((-112+side*2,15,115),(-112+side*3.1,11,115),.8,6)

# Two scaffold towers and one trussed conveyor bridge form a background span.
bridge_height=lambda x:27+10*min(1,max(0,(x+99)/99))
for x in [-99,99]:
    top=bridge_height(x)
    for dx in [-4,4]:
        for depth in [-3,3]:
            metal.beam((x+dx,.1,177+depth),(x+dx*.6,top,177+depth*.6),1.6,6)
    for h in [9,top*.62,top]:
        metal.box(x,h,177,9,.65,8,9)
    for h in [8,top*.6]:
        metal.beam((x-4,h,174),(x+4,h+top*.36,174),.9,6)
for i in range(12):
    xa=-99+i*198/12; xb=-99+(i+1)*198/12
    ha=bridge_height(xa); hb=bridge_height(xb)
    for depth in [-3,3]:
        metal.beam((xa,ha,177+depth),(xb,hb,177+depth),1.1,6)
        metal.beam((xa,ha-13,177+depth),(xb,hb-13,177+depth),.9,9)
        if i%2:
            metal.beam((xa,ha-13,177+depth),(xb,hb,177+depth),.9,6)
        else:
            metal.beam((xa,ha,177+depth),(xb,hb-13,177+depth),.9,6)
    if i%3==0: metal.box(xa+5,ha-13,177,7,2,7,9)

# Twelve intact car bodies replace the flat shard filler on the island and banks.
bank_sites=[(-69,98),(69,123),(-78,158),(78,158),(-25,58),(25,58)]
for i in range(12):
    a=i*2.399963
    x=(9+(i%3)*6)*math.cos(a)
    z=island_z+(9+(i%3)*6)*math.sin(a)
    if i>=6: x,z=bank_sites[i-6]
    if i<4:
        # Actual crushed lower body touches the physical floor; the upper tires
        # nest into its roof so the pile is supported without a cube pedestal.
        car_hulk(x,.08,z,5.8,10.4,(i*3+7)%16,a*.12+.32,i%2,support=True)
        floor=1.92
    else:
        floor=.08
    car_hulk(x,floor,z,5.4+(i%3)*.8,10.2+(i%2)*1.3,
             (i*3+2)%16,a*.12,i%2,hero=True)

# Slim fence and floodlights give the scene scale without a wall of detail.
for side in [-1,1]:
    for i in range(10):
        z=44+i*15.3; x=side*132
        metal.box(x,3.5,z,.33,7,.34,6)
        metal.box(x,2.2,z+7.65,.16,.2,15.3,2)
        metal.box(x,5.8,z+7.65,.16,.2,15.3,2)
    for z in [65,175]:
        x=side*112
        metal.box(x,11,z,.65,22,.65,6)
        metal.box(x,22.5,z,6,.65,2,7)
        for dx in [-2,0,2]: metal.box(x+dx,22.6,z+1.1,1.5,.8,.35,15)

objects=[metal.build(materials['metal']),wreck.build(materials['wreck']),earth.build(materials['earth'])]
triangles=0
for obj in objects:
    obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles)
assert 1000<triangles<=25000, triangles

bpy.ops.object.select_all(action='DESELECT')
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=False,export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=str(blend_output))

captures=[]
if not args.skip_renders:
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=12
    scene.render.resolution_x=1280; scene.render.resolution_y=720; scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Warm yard review sky')
    scene.world.color=(.43,.39,.34)
    sun=bpy.data.lights.new('Late sun','SUN'); sun.energy=2.0
    sun_object=bpy.data.objects.new('Late sun',sun); bpy.context.collection.objects.link(sun_object)
    sun_object.rotation_euler=(.48,-.4,-.7)
    camera_data=bpy.data.cameras.new('Yard match'); camera=bpy.data.objects.new('Yard match',camera_data)
    bpy.context.collection.objects.link(camera); scene.camera=camera
    for name,position,target,fov in [('home',(0,4,0),(0,2,60),55),
                                     ('wide',(0,21,12),(0,5,120),58),
                                     ('side',(105,18,40),(0,6,130),62)]:
        camera.location=blender_point(position)
        camera.rotation_euler=(Vector(blender_point(target))-camera.location).to_track_quat('-Z','Y').to_euler()
        camera_data.sensor_fit='VERTICAL';camera_data.sensor_height=32
        camera_data.lens=32/(2*math.tan(math.radians(fov)/2))
        path=evidence/f'blender-{name}.png';scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        captures.append({'name':name,'path':path.relative_to(root).as_posix(),'sha256':digest(path),
                         'camera':{'position':position,'target':target,'fov':fov}})

manifest={'round':args.round,'source':'tools/blender/scrapdome-yard.py',
          'asset':{'path':output.relative_to(root).as_posix(),'sha256':digest(output)},
          'triangles':triangles,'materialDraws':3,'captures':captures,
          'reference':'public/assets/reference/wasteland-art-direction.png'}
(evidence/'blender-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='\n')
print('SCRAPDOME_RESULT '+json.dumps({'triangles':triangles,'draws':3,'bytes':output.stat().st_size}))
