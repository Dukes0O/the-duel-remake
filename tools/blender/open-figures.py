"""Blender -b -t 4 -P tools/blender/open-figures.py -- --root ."""
import argparse
import json
import math
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
town = args.root.resolve() / 'public/assets/models/wasteland/town'
output = town / 'open-figures.glb'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [str(output)]}))
    sys.exit()

import bpy
import bmesh
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(town / 'story-walkers.glb'))
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == 'ARMATURE')
donors = {'walker-g': 'odessa', 'walker-vane': 'moss', 'walker-b': 'tin-cook',
          'walker-e': 'tin-porter', 'walker-kid-a': 'tin-child'}
for obj in list(scene.objects):
    if obj.type == 'MESH':
        source = obj.name.removeprefix('skin-')
        if source in donors:
            obj.name = 'skin-' + donors[source]
        else:
            bpy.data.objects.remove(obj, do_unlink=True)

def finish(obj, name, bone, colour, action=''):
    obj.name = owner + '_' + (action or 'wear') + '_' + name
    mat = bpy.data.materials.get(colour) or bpy.data.materials.new(colour)
    mat.diffuse_color = (*palette[colour], 1)
    mat.roughness = .88
    obj.data.materials.append(mat)
    matrix = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    bpy.context.view_layer.update()
    obj.matrix_world = matrix
    return obj

palette = {'hide': (.17,.072,.032), 'soot': (.038,.042,.039), 'steel': (.18,.21,.20),
           'glass': (.027,.083,.071), 'canvas': (.33,.24,.125), 'rust': (.32,.12,.047),
           'rag': (.48,.37,.25), 'oil': (.078,.076,.055), 'denim': (.092,.14,.16),
           'ochre': (.37,.213,.091), 'edge': (.23,.127,.052), 'brass': (.50,.32,.12)}

def oval(name, bone, pos, size, colour, action=''):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=pos)
    obj = bpy.context.object
    obj.scale = size
    bpy.context.view_layer.update()
    return finish(obj, name, bone, colour, action)

def rod(name, bone, a, b, radius, colour, action=''):
    delta = Vector(b) - Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=delta.length,
                                         location=(Vector(a)+Vector(b))*.5)
    obj = bpy.context.object
    obj.rotation_euler = delta.to_track_quat('Z','Y').to_euler()
    bpy.context.view_layer.update()
    return finish(obj,name,bone,colour,action)

def cloth(name, bone, rows, colour):
    # Three panels follow the body around both flanks, with a raised centre fold.
    points = [(x*w, y + abs(x)*.072, z + (.012 if x == 1 else 0))
              for z,w,y in rows for x in (-1,-.34,.28,1)]
    faces = [(i,i+1,i+5,i+4) for i in range(len(points)-4) if i%4 != 3]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    return finish(obj,name,bone,colour)

def draped(name, bone, sections, colour, action='', pleat=0, n=32):
    # Offset elliptical cross-sections give cloth a changing centre of gravity.
    verts = []
    for x,y,z,w,d in sections:
        for i in range(n):
            angle = math.tau*i/n
            fold = 1 + pleat*math.cos(7*angle + z*2)
            verts.append((x+w*fold*math.cos(angle),y+d*fold*math.sin(angle),z))
    faces = [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i)
             for j in range(len(sections)-1) for i in range(n)]
    faces.extend([tuple(reversed(range(n))), tuple(range(len(verts)-n,len(verts)))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    for face in mesh.polygons:
        face.use_smooth = len(face.vertices)==4
    return finish(obj,name,bone,colour,action)

def apron():
    # A shaped hide wraps around the coat. The belt gathers the folds above
    # the hips; below it the folds open out and end at an uneven curved hem.
    rows = [  # height, half-width, front depth, wrap, fold depth
        (1.435,.085,.132,.022,.004), (1.395,.101,.134,.032,.005),
        (1.32,.137,.136,.053,.009), (1.245,.165,.135,.076,.015),
        (1.185,.158,.129,.074,.021), (1.15,.151,.118,.067,.012),
        (1.13,.155,.119,.069,.008), (1.095,.177,.143,.087,.024),
        (1.02,.197,.15,.098,.030), (.88,.231,.156,.103,.031),
        (.74,.235,.162,.107,.027), (.64,.221,.161,.102,.024),
        (.603,.193,.163,.081,.023)]
    n = 25
    verts, faces, coords = [], [], []
    for z, width, depth, wrap, fold in rows:
        for j in range(n):
            t = 2*j/(n-1)-1
            ridge = math.cos(t*11 + 2*(1-z) + .8*t*t)
            hem = max(0, (.82-z)/.22)
            verts.append((width*t, -depth + wrap*t*t - fold*ridge,
                          z + hem*(.045*t*t+.014*t+.012*ridge)))
            coords.append(((t+1)/2, (z-.6)/.85))
    for i in range(len(rows)-1):
        for j in range(n-1):
            k = i*n+j
            faces.append((k,k+n,k+n+1,k+1))
    mesh = bpy.data.meshes.new('cut and gathered hide')
    mesh.from_pydata(verts, [], faces)
    for face in mesh.polygons:
        face.use_smooth = True
    uv = mesh.uv_layers.new(name='Hide')
    for loop in mesh.loops:
        uv.data[loop.index].uv = coords[loop.vertex_index]
    obj = bpy.data.objects.new('apron',mesh)
    scene.collection.objects.link(obj)
    finish(obj,'leather-apron','chest','hide')
    # Reuse the worn leather on the salvaged seat, keeping only the hide.
    from PIL import Image, ImageEnhance, ImageOps
    from tempfile import TemporaryDirectory
    with Image.open(town / 'textures/big-wheel-seat-top.jpg') as im:
        w,h = im.size
        grain = im.crop((int(.23*w),int(.17*h),int(.78*w),int(.39*h)))
        leather = ImageOps.colorize(ImageEnhance.Contrast(ImageOps.grayscale(grain)).enhance(1.35),
                                    '#301d14', '#d5a373')
    mat = bpy.data.materials.new('Odessa - oiled leather')
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .68
    with TemporaryDirectory() as folder:
        path = Path(folder)/'worn-apron.jpg'
        leather.save(path, quality=90)
        photo = mat.node_tree.nodes.new('ShaderNodeTexImage')
        photo.image = bpy.data.images.load(str(path))
        photo.image.pack()
    mat.node_tree.links.new(photo.outputs['Color'], shader.inputs['Base Color'])
    obj.data.materials[0] = mat


owner = 'odessa'
apron()
for sign in (-1,1):
    # A broad strap turns over each shoulder, behind the neck.
    path = [(sign*.069,-.133,1.43), (sign*.092,-.096,1.493),
            (sign*.079,-.035,1.543), (sign*.077,.040,1.547), (sign*.054,.065,1.523)]
    points = [(x+dx,y+dy,z) for x,y,z in path
              for dx,dy in [(-.014,-.004),(.014,-.004),(.014,.004),(-.014,.004)]]
    faces = [(4*i+j,4*i+(j+1)%4,4*i+4+(j+1)%4,4*i+4+j)
             for i in range(len(path)-1) for j in range(4)]
    mesh = bpy.data.meshes.new('leather strap')
    mesh.from_pydata(points, [], faces)
    strap = bpy.data.objects.new('neck strap',mesh)
    scene.collection.objects.link(strap)
    finish(strap,'sling','chest','hide')
    oval('brass-rivet','chest',(sign*.069,-.14,1.424),(.010,.005,.010),'brass')
rod('nape','chest',(-.054,.065,1.523),(.054,.065,1.523),.014,'hide')
# Flat belt over the gathered waist, tied on the left where the tails hang free.
draped('waist-tie','chest',[(0,-.007,1.128,.177,.126),
       (0,-.007,1.153,.171,.128)],'oil')
oval('tie-knot','chest',(-.165,-.07,1.136),(.029,.021,.022),'hide')
for x,z in [(-.191,1.012),(-.160,1.049)]:
    rod('tie-end','chest',(-.165,-.07,1.136),(x,-.097,z),.010,'hide')
draped('work-cap','head',[(0,0,1.733,.13,.123),(0,.004,1.762,.141,.131),
       (0,.014,1.813,.118,.109),(0,.02,1.832,.065,.061)],'denim')
oval('cap-peak','head',(0,-.105,1.744),(.121,.094,.014),'oil')
# Trim the donor's mitten below the cuff; each glove has its own silhouette.
skin = bpy.data.objects['skin-odessa']
mesh = bmesh.new()
mesh.from_mesh(skin.data)
weights = mesh.verts.layers.deform.active
hands = {skin.vertex_groups['hand.'+side].index for side in ('L','R')}
bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if v.co.z < .965
                 and any(i in hands for i in v[weights].keys())], context='VERTS')
mesh.to_mesh(skin.data)
mesh.free()
for side, sign in [('L',-1),('R',1)]:
    hand, arm = 'hand.'+side, 'forearm.'+side
    # The bell mouth follows the slant of the sleeve down into a narrower wrist.
    cuff = [(sign*x,-.019,z,w,d) for x,z,w,d in [
        (.333,.920,.052,.043),(.325,.973,.058,.049),(.311,1.011,.059,.051),(.303,1.036,.070,.055),
        (.278,1.092,.081,.062),(.274,1.112,.081,.064)]]
    draped('split-hide-cuff',arm,cuff,'ochre')
    draped('rolled-welt',arm,[(sign*.278,-.019,1.093,.083,.064),
           (sign*.274,-.019,1.111,.083,.066)],'edge')
    draped('glove-back',hand,[(sign*.343,-.026,.855,.049,.030),
           (sign*.343,-.024,.881,.057,.039),(sign*.337,-.020,.927,.055,.043),
           (sign*.329,-.017,.953,.046,.039)],'ochre')
    rod('knuckle-welt',hand,(sign*.302,-.051,.881),(sign*.382,-.053,.892),.005,'edge')
    for i,length in enumerate((.078,.088,.081,.063)):
        dx = (i-1.5)*.027
        # Four separate tapered fingers curl slightly toward the palm.
        rings = [(sign*(.343+dx*f),y,.867-length*t,w,d) for t,f,y,w,d in [
            (1,1.32,-.048,.007,.009),(.88,1.30,-.044,.012,.014),
            (.42,1.18,-.031,.014,.016),(0,1,-.024,.015,.017)]]
        draped('finger-'+str(i+1),hand,rings,'ochre',n=12)
    draped('opposed-thumb',hand,[(sign*.281,-.066,.839,.011,.014),
           (sign*.282,-.062,.861,.017,.018),(sign*.288,-.050,.885,.021,.021),
           (sign*.310,-.031,.912,.024,.024)],'ochre')
rod('torch','hand.R',(.33,-.04,.91),(.33,-.28,.94),.022,'steel','weld')
rod('billet','hand.L',(-.34,-.04,.92),(.25,-.04,.92),.054,'steel','carry')

owner = 'moss'
cloth('overall-bib','chest',[(1.37,.14,-.157),(1.18,.18,-.16),(.96,.196,-.158)],'denim')
oval('pocket-rag','pelvis',(.14,.13,.91),(.07,.036,.15),'rag')
rod('scrubbing-shaft','hand.R',(.34,.13,1.13),(.34,-.65,.28),.016,'canvas','scrub')
rod('brush-stock','hand.R',(.20,-.65,.28),(.48,-.65,.28),.042,'hide','scrub')
for i in range(10):
    rod('bristle'+str(i),'hand.R',(.21+i*.029,-.65,.27),(.21+i*.029,-.67,.20),.014,'rag','scrub')
bpy.ops.mesh.primitive_cone_add(vertices=18,radius1=.105,radius2=.138,depth=.22,end_fill_type='NOTHING',location=(.34,-.04,.62))
finish(bpy.context.object,'pail','hand.R','steel','carry-bucket')
for x in (.21,.47):
    rod('bail','hand.R',(x,-.04,.72),(.34,-.04,.93),.009,'soot','carry-bucket')

for owner in ('tin-cook','tin-porter','tin-child'):
    rod('ladle-stem','hand.R',(.33,-.04,.94),(.34,-.34,.84),.014,'hide','cook')
    oval('ladle-bowl','hand.R',(.34,-.35,.83),(.054,.068,.025),'steel','cook')
    # The filled belly drops down the back. The empty neck folds forward over
    # the left shoulder and is bound tight below its flared mouth.
    bag = [(-.19,.18,1.04,.052,.062),(-.20,.18,1.09,.147,.121),
           (-.218,.16,1.23,.157,.144),(-.232,.127,1.37,.142,.133),
           (-.23,.061,1.47,.111,.132),(-.216,-.024,1.52,.086,.114),
           (-.204,-.096,1.54,.044,.058),(-.202,-.113,1.56,.029,.033),
           (-.201,-.134,1.59,.059,.046)]
    draped('canvas-sack','chest',bag,'canvas','haul-sack',.092)
    draped('binding','chest',[(-.202,-.11,1.55,.033,.039),
           (-.202,-.114,1.562,.034,.038)],'hide','haul-sack')
    if owner == 'tin-cook':
        draped('linen-headwrap','head',[(0,0,1.716,.148,.147),(0,0,1.752,.156,.15),
               (0,.008,1.815,.14,.135),(0,.014,1.847,.099,.092)],'rag',pleat=.027)
    elif owner == 'tin-child':
        oval('wool-cap','head',(0,.006,1.76),(.164,.145,.11),'denim')

bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',export_animations=False)
