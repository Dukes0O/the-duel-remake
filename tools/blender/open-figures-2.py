"""Dress the Walkers' photographic skins and export the Glasshouse, Radio Hill and Rats.

blender -b -t 4 --python-exit-code 1 --python tools/blender/open-figures-2.py -- --root .
node tools/art/story-people-poses.mjs .evidence/open-figures-4 --open-figures-4
Repeat the Blender command with --sheet .evidence/open-figures-4 for the comparison.
"""
import argparse
import io
import json
import math
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--paths-only', action='store_true')
parser.add_argument('--sheet', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
root = args.root.resolve()
models = root / 'public/assets/models/wasteland'
output = models / 'scablands/open-figures-2.glb'
sheet = root / 'docs/board/looks/open-people/round-4.jpg'
if args.paths_only:
    print(json.dumps({'blend': [], 'glb': [] if args.sheet else [str(output)],
                      **({'summary': [str(sheet)]} if args.sheet else {})}))
    raise SystemExit(0)

import bpy
import bmesh
from mathutils import Vector
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

# Original atlas row, donor mesh, clothing dye. The face retains its own photograph.
cast = [
    ('marigold', 4, 'walker-b', (.76, .95, .59)),
    ('finch', 1, 'dace', (.76, .90, .77)),
    ('grower-1', 6, 'walker-vane', (1.16, .85, .57)),
    ('grower-2', 10, 'walker-h', (.78, .75, .64)),
    ('grower-3', 7, 'walker-e', (1.16, 1.02, .78)),
    ('hetty', 7, 'walker-e', (.83, .79, .83)),
    ('bern', 10, 'walker-h', (1.30, .79, .57)),
    ('sump', 9, 'walker-g', (.91, .73, .61)),
    ('road-rat-lamp', 6, 'walker-vane', (.58, .67, .72)),
    ('road-rat-lookout', 5, 'walker-c', (1.15, .66, .51)),
]
# Each item of kit is cut from one of the game's material photographs.
swatches = {
    'tin': ('faded-yellow-steel', (.78, .82, .77)),
    'steel': ('machines2-dusty-steel', (1, 1, 1)),
    'boot': ('tire-rubber', (1, 1, 1)),
    'canvas': ('canvas-patched-cream', (.73, .63, .48)),
    'indigo': ('canvas-tan', (.43, .55, .68)),
    'rust': ('pipe-rusted-steel', (1, .78, .59)),
    'cord': ('bleached-plank', (.71, .59, .36)),
    'wood': ('power-pole-wood', (.78, .66, .53)),
    'sage': ('walker-h-cloth', (.88, 1.16, .71)),
    'oxblood': ('patched-canvas', (.84, .43, .32)),
    'pages': ('canvas-cream', (1.16, 1.14, 1.0)),
    'amber': ('broken-glass', (2.1, 1.28, .41)),
    'seat-vinyl': ('big-wheel-seat-top', (.82, .57, .44)),
    'lens': ('broken-glass', (.46, .68, .74)),
}
WIDTH, ROW = 1280, 256
HEIGHT = ROW * (len(cast) + 1)
TAU = math.tau


def dye(image, factors):
    return Image.merge('RGB', tuple(channel.point(lambda v: int(v * f))
                                    for channel, f in zip(image.split(), factors)))


def texture_atlas(photo):
    atlas = Image.new('RGB', (WIDTH, HEIGHT))
    for idx, (name, row, donor, tint) in enumerate(cast):
        top = photo.height - (row + 1) * ROW
        strip = photo.crop((0, top, WIDTH, top + ROW))
        clothes = strip.crop((250, 0, WIDTH, ROW))
        strip.paste(dye(clothes, tint), (250, 0))
        if name in ('hetty', 'grower-2'):
            clothes = ImageEnhance.Color(strip.crop((250, 0, WIDTH, ROW))).enhance(.46)
            strip.paste(clothes, (250, 0))
            # Abrasion follows the arm and leg UV islands and fades into the fabric.
            soil = Image.open(models / 'town/textures/dirt.jpg').convert('RGB')
            for x, y, w, h in [(500,190,100,35),(753,190,100,35),(631,105,90,56),(883,105,90,56)]:
                patch = strip.crop((x,y,x+w,y+h))
                mask = Image.new('L', (w,h))
                for v in range(h):
                    for u in range(w):
                        mask.putpixel((u,v), int(130*max(0,1-(2*u/w-1)**2-(2*v/h-1)**2)))
                strip.paste(ImageOps.fit(soil, patch.size), (x,y), mask)
        if name.startswith('road-rat'):
            # Strip the donor torso's red checks. Put the gang dye on individual kit.
            torso = strip.crop((252,0,500,ROW))
            strip.paste(ImageOps.colorize(ImageOps.grayscale(torso), '#201e19', '#a2977f'), (252,0))
        if name == 'marigold':
            # Arm UV panels run up from each cuff. Work earth into both sleeves.
            soil = Image.open(models / 'town/textures/dirt.jpg').convert('RGB')
            for x in (500, 753):
                patch = strip.crop((x, 186, x + 113, 252))
                strip.paste(Image.blend(patch, ImageOps.fit(soil, patch.size), .64), (x, 186))
        if name in ('marigold', 'hetty', 'bern'):
            hair = strip.crop((0, 156, 197, 177))
            strip.paste(ImageEnhance.Color(ImageEnhance.Brightness(hair).enhance(1.35)).enhance(.28), (0, 156))
        atlas.paste(strip, (0, HEIGHT - (idx + 1) * ROW))
    for n, (source, factors) in enumerate(swatches.values()):
        photo = Image.open(models / 'town/textures' / (source + '.jpg')).convert('RGB')
        if source == 'big-wheel-seat-top':
            w,h = photo.size
            photo = photo.crop((w//3,h//3,2*w//3,2*h//3))
        atlas.paste(dye(ImageOps.fit(photo, (156, 124)), factors), (160 * (n % 8), 128 * (n // 8)))
    return atlas


class Tailor:
    """Cut accessories as sections or bent tubing, with a photo patch and bone per piece."""
    def __init__(self):
        self.verts, self.faces, self.uvs, self.weights = [], [], [], []

    def loft(self, rings, fabric, bone='chest'):
        n = len(rings[0])
        start = len(self.verts)
        for ring in rings:
            self.verts.extend(ring)
            self.weights.extend([bone] * n)
        slot = list(swatches).index(fabric)
        def uv(u, v):
            return ((160 * (slot % 8) + 3 + 150 * u) / WIDTH,
                    1 - (128 * (slot // 8) + 3 + 118 * v) / HEIGHT)
        for k in range(len(rings) - 1):
            for j in range(n):
                a = start + k * n
                nxt = (j + 1) % n
                self.faces.append((a+j, a+nxt, a+n+nxt, a+n+j))
                self.uvs.append([uv(u / n, v / (len(rings)-1)) for u, v in
                                 [(j,k), (j+1,k), (j+1,k+1), (j,k+1)]])
        for k, order in [(0, reversed(range(n))), (len(rings)-1, range(n))]:
            order = list(order)
            self.faces.append([start + k*n + j for j in order])
            self.uvs.append([uv(.5+.48*math.cos(TAU*j/n), .5+.48*math.sin(TAU*j/n)) for j in order])

    def oval(self, at, sections, fabric, bone='chest', n=20):
        x, y, z = at
        self.loft([[(x+rx*math.cos(TAU*i/n), y+ry*math.sin(TAU*i/n), z+h)
                    for i in range(n)] for h, rx, ry in sections], fabric, bone)

    def box(self, at, size, fabric, bone='chest', bevel=.012):
        x, y, z = at
        w, d, h = (v / 2 for v in size)
        b = min(bevel, w*.5, d*.5, h*.5)
        rings = []
        for level, inset in [(-h,b), (-h+b,0), (h-b,0), (h,b)]:
            a, c = w-inset, d-inset
            rings.append([(x+i, y+j, z+level) for i,j in [
                (-a+b,-c),(a-b,-c),(a,-c+b),(a,c-b),(a-b,c),(-a+b,c),(-a,c-b),(-a,-c+b)]])
        self.loft(rings, fabric, bone)

    def tube(self, points, radius, fabric, bone='chest', n=8):
        points = list(map(Vector, points))
        rings = []
        for i, p in enumerate(points):
            axis = (points[min(i+1,len(points)-1)] - points[max(0,i-1)]).normalized()
            side = axis.cross(Vector((0,1,0)))
            if side.length < .01:
                side = axis.cross(Vector((1,0,0)))
            side.normalize()
            up = axis.cross(side)
            rings.append([p + radius * (side*math.cos(TAU*j/n) + up*math.sin(TAU*j/n)) for j in range(n)])
        self.loft(rings, fabric, bone)

    def loop(self, centre, rx, rz, radius, fabric, bone='chest', tilt=0):
        x, y, z = centre
        self.tube([(x+rx*math.cos(TAU*i/28), y+tilt*math.cos(TAU*i/28),
                    z+rz*math.sin(TAU*i/28)) for i in range(29)], radius, fabric, bone)

    def mesh(self, name, material, bound=False):
        data = bpy.data.meshes.new(name)
        data.from_pydata(self.verts, [], self.faces)
        data.update()
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        data.materials.append(material)
        uv = data.uv_layers.new(name='UVMap')
        for poly, coords in zip(data.polygons, self.uvs):
            for loop, coord in zip(poly.loop_indices, coords):
                uv.data[loop].uv = coord
        if bound:
            for bone in set(self.weights):
                obj.vertex_groups.new(name=bone).add(
                    [i for i, b in enumerate(self.weights) if b == bone], 1, 'REPLACE')
        return obj


def scarf(kit, fabric):
    kit.oval((0,0,1.53), [(-.055,.12,.10),(-.025,.155,.13),(.01,.13,.11),(.036,.105,.093)], fabric)
    kit.tube([(-.08,-.09,1.51),(-.12,-.13,1.44),(-.10,-.145,1.35)], .025, fabric)


def kit_for(name):
    k = Tailor()
    if name == 'marigold':
        # A pressed wheel liner beaten out into a brim, with a rolled lip and hub flutes.
        k.oval((0,.008,1.76), [(-.018,.275,.248),(-.009,.295,.256),(.004,.292,.252),
                 (.037,.142,.131),(.087,.123,.121),(.103,.09,.094)], 'tin', 'head', 40)
        for i in range(10):
            c,s = math.cos(TAU*i/10),math.sin(TAU*i/10)
            k.tube([(.144*c,.133*s,1.797),(.248*c,.216*s,1.766)],.006,'steel','head')
        scarf(k,'sage')
    elif name == 'finch':
        k.oval((0,0,1.711), [(0,.112,.115),(.036,.113,.115)], 'boot','head')
        for x in (-.059,.059):
            k.box((x,-.103,1.729),(.117,.063,.092),'boot','head',.017)
            k.box((x,-.136,1.732),(.095,.018,.067),'lens','head')
        k.tube([(-.011,-.139,1.734),(.011,-.139,1.734)],.009,'tin','head')
        k.tube([(-.12,.02,1.54),(-.13,-.09,1.50),(.02,-.145,1.29),
                (.19,-.10,1.08),(.21,.025,1.02)],.019,'canvas')
        k.box((.193,-.052,1.011),(.187,.128,.209),'canvas','pelvis',.024)
        k.box((.193,-.120,1.047),(.19,.017,.084),'oxblood','pelvis')
        for i in range(5):
            x=.13+.026*i
            k.tube([(x,-.071,1.10),(x+.014,-.08,1.15+i%2*.018),
                    (x+.007,-.073,1.18+i%3*.014)],.011,'sage','pelvis')
    elif name.startswith('grower'):
        index = int(name[-1])
        scarf(k, ['oxblood','indigo','canvas'][index-1])
        if index == 1:
            k.oval((0,0,1.765), [(0,.115,.129),(.028,.124,.137),(.065,.083,.087)],'oxblood','head')
            k.box((.14,-.09,.97),(.12,.07,.17),'canvas','pelvis')
        elif index == 2:
            k.tube([(-.13,.025,1.51),(-.13,-.085,1.47),(.16,-.116,1.09)],.021,'canvas')
            k.oval((0,0,1.02),[(0,.163,.113),(.05,.163,.113)],'wood','pelvis')
        else:
            k.oval((0,0,1.77),[(0,.124,.131),(.032,.12,.128),(.067,.08,.09)],'canvas','head')
            k.tube([(.095,.053,1.79),(.16,.07,1.67),(.17,.08,1.53)],.024,'canvas','head')
    elif name == 'hetty':
        # A padded spring band behind the neck, dropping onto the collarbones.
        k.tube([(-.153,-.120,1.45),(-.150,-.067,1.515),(-.128,.005,1.55),
                (-.084,.069,1.564),(0,.089,1.566),(.084,.069,1.564),
                (.128,.005,1.55),(.150,-.067,1.515),(.153,-.120,1.45)],.022,'seat-vinyl')
        for sign in (-1,1):
            # Turn each drum outwards a little. An oval cushion, pale enamel shell
            # and inset grille are visible together from the front and the side.
            centre = Vector((sign*.133,-.133,1.406))
            normal = Vector((sign*.48,-.86,.13)).normalized()
            across = Vector((.86,sign*.48,0)).normalized()
            vertical = normal.cross(across).normalized()
            def rim(radius, tall, depth):
                return [centre + normal*depth + across*(radius*math.cos(TAU*j/28))
                        + vertical*(tall*math.sin(TAU*j/28)) for j in range(28)]
            k.loft([rim(.072,.086,-.028),rim(.092,.108,-.012),
                    rim(.091,.105,.014)],'boot')
            k.loft([rim(.086,.100,.013),rim(.088,.098,.024),
                    rim(.076,.087,.051),rim(.064,.075,.062)],'pages')
            k.loft([rim(.065,.077,.060),rim(.061,.070,.068),
                    rim(.034,.040,.078)],'steel')
            k.tube([(sign*.155,-.086,1.503),(sign*.214,-.107,1.473),
                    (sign*.226,-.121,1.409)],.011,'steel')
            k.tube([centre + normal*.035 + across*(sign*w) + vertical*h for w,h in
                    [(.082,.003),(.078,-.042),(.051,-.081),(.018,-.096)]],.007,'steel')
        k.tube([(-.143,-.159,1.318),(-.148,-.162,1.263),(-.105,-.15,1.207),
                (-.057,-.132,1.216),(-.034,-.131,1.25)],.008,'boot')
    elif name == 'bern':
        scarf(k,'oxblood')
        for i in range(7):
            k.loop((.14,-.045-i*.009,1.29+i%2*.009), .139+i%3*.004,.226,.009,'rust',tilt=.074)
        k.tube([(.13,-.15,1.07),(.18,-.17,1.0),(.23,-.13,.94)],.008,'rust')
        k.box((.142,-.119,1.505),(.061,.084,.031),'canvas')
    elif name == 'sump':
        # Four shoulder-to-hem gores wrap around the body. The open edges form
        # front and back vents; the skirt follows the corresponding thigh.
        for sign, side in [(-1,'L'),(1,'R')]:
            for back, fabric in [(False,'seat-vinyl' if sign < 0 else 'oxblood'),
                                 (True,'indigo' if sign < 0 else 'boot')]:
                rings, edges = [], []
                for z,w,d,gap in [(.57,.29,.192,.16),(.83,.251,.176,.085),
                                  (1.04,.217,.166,.035),(1.28,.241,.174,.035),
                                  (1.46,.218,.144,.20),(1.52,.133,.112,.28)]:
                    angles = [gap+(math.pi/2-gap)*i/8 for i in range(9)]
                    curve = [(sign*w*math.sin(t), (1 if back else -1)*d*math.cos(t),
                              z+.016*math.sin(2*t)) for t in angles]
                    rings.append(curve+[(x*.97,y*.97,h) for x,y,h in reversed(curve)])
                    edges.append(curve[0])
                first = len(k.weights)
                k.loft(rings,fabric)
                for j, bone in enumerate(['thigh.'+side,'thigh.'+side,'pelvis','chest','chest','chest']):
                    start = first+j*len(rings[j])
                    k.weights[start:start+len(rings[j])] = [bone]*len(rings[j])
                # Welt the fixed bodice edge; leave the moving skirt free.
                k.tube(edges[3:],.008,'cord')
            for x,z,sections,bone in [
                    (.246,1.40,[(-.16,.072,.078),(0,.096,.104),(.077,.067,.08)],'upper_arm.'),
                    (.304,1.15,[(-.14,.068,.071),(.02,.074,.08),(.106,.072,.078)],'forearm.')]:
                k.oval((sign*x,0,z),sections,'seat-vinyl' if sign<0 else 'canvas',bone+side)
        k.box((-.237,-.088,1.20),(.055,.244,.282),'pages')
        for x in (-.273,-.201):
            k.box((x,-.088,1.20),(.014,.259,.30),'oxblood')
        k.box((-.236,.035,1.20),(.078,.021,.294),'boot')
        # Pale moustache follows the raised corners of his grin.
        k.tube([(-.047,-.084,1.65),(-.024,-.094,1.644),(0,-.101,1.65),
                (.024,-.094,1.644),(.047,-.084,1.65)],.008,'canvas','head')
    elif name.startswith('road-rat'):
        side = 'L' if name.endswith('lamp') else 'R'
        sign = -1 if side == 'L' else 1
        k.oval((sign*.215,0,1.425),[(-.054,.124,.114),(0,.139,.131),
               (.042,.098,.093)],'oxblood' if side=='L' else 'boot','upper_arm.'+side)
        for dx in (-.057,0,.057):
            k.tube([(sign*.215+dx,-.105,1.40),(sign*.215+dx,-.064,1.46),
                    (sign*.215+dx,.058,1.467)],.011,'steel','upper_arm.'+side)
        scarf(k,'oxblood' if side=='R' else 'indigo')
        if side == 'R':
            k.oval((0,-.018,1.755),[(0,.119,.185),(.013,.119,.179),
                   (.035,.115,.114),(.074,.076,.082)],'boot','head')
    return k


def tool_meshes(material):
    tools = {}
    hoe = Tailor()
    # Local origin is the lower palm. Local +Z runs up the ash haft.
    hoe.tube([(0,0,-.963),(0,0,.63)],.019,'wood')
    hoe.tube([(0,0,-.963),(0,-.12,-.983)],.022,'steel')
    hoe.box((0,-.164,-1.003),(.184,.115,.021),'rust')
    tools['hoe'] = hoe
    lamp = Tailor()
    lamp.tube([(0,0,-.61),(.009,0,.34),(0,.01,1.27)],.018,'wood')
    lamp.tube([(0,.01,1.22),(.045,.01,1.32),(.145,.01,1.32),(.165,.01,1.24)],.011,'steel')
    lamp.oval((.16,.01,1.17),[(-.13,.079,.077),(-.097,.081,.079),
             (-.083,.060,.059)],'tin')
    lamp.oval((.16,.01,1.17),[(.03,.058,.059),(.048,.079,.076),(.077,.035,.035)],'tin')
    for s in (-1,1):
        lamp.tube([(.16+s*.06,-.018,1.08),(.16+s*.069,-.018,1.15),(.16+s*.058,-.018,1.219)],.006,'steel')
    tools['lamp'] = lamp
    frame = Tailor()
    for z in (0,.64):
        frame.box((.5,0,z),(1.04,.043,.045),'steel')
    for x in (0,.5,1):
        frame.box((x,0,.32),(.038,.05,.645),'rust')
    tools['frame'] = frame
    bindings = Tailor()
    # One wrist to the other; doubled turns and loose end at the knot.
    for z in (0,.018):
        bindings.tube([(0,0,z),(.25,-.018,z),(.75,-.018,z),(1,0,z)],.009,'cord')
    for x in (0,1):
        for y in (-.012,.006):
            bindings.loop((x,y,0),.11,.029,.008,'cord')
    bindings.tube([(.78,-.012,.006),(.74,-.025,-.059),(.79,-.021,-.097)],.008,'cord')
    tools['ties'] = bindings
    objects = [tool.mesh('implement-'+key,material) for key, tool in tools.items()]
    mantle = Tailor()
    mantle.oval((.16,.01,1.17),[(-.087,.057,.057),(-.06,.063,.063),(.031,.052,.052)],'amber')
    wick = bpy.data.materials.new('Amber lamp mantle')
    wick.use_nodes = True
    shader = wick.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (.72,.37,.10,1)
    shader.inputs['Emission Color'].default_value = (1,.45,.08,1)
    shader.inputs['Emission Strength'].default_value = 1.5
    objects.append(mantle.mesh('implement-mantle',wick))
    glass = bpy.data.materials.new('Salvaged windscreen')
    glass.use_nodes = True
    bsdf = glass.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.31,.53,.50,1)
    bsdf.inputs['Roughness'].default_value = .21
    bsdf.inputs['Alpha'].default_value = .33
    pane = Tailor()
    for x in (.25,.75):
        pane.box((x,0,.32),(.474,.008,.61),'lens')
    objects.append(pane.mesh('implement-glass',glass))
    return objects


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(models / 'town/story-walkers.glb'))
    rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    source = bpy.data.objects['skin-dace'].data.materials[0]
    tex = next(n for n in source.node_tree.nodes if n.type == 'TEX_IMAGE')
    atlas = texture_atlas(Image.open(io.BytesIO(tex.image.packed_file.data)).convert('RGB'))
    with TemporaryDirectory() as folder:
        filename = Path(folder)/'open-scablands-clothes.jpg'
        atlas.save(filename, quality=90)
        tex.image = bpy.data.images.load(str(filename))
        tex.image.pack()
    source.name = 'Scablands work clothes and salvage'
    output_objects = [rig]
    for i, (name, row, donor, _) in enumerate(cast):
        body = bpy.data.objects['skin-'+donor].copy()
        body.data = body.data.copy()
        bpy.context.collection.objects.link(body)
        body.name = 'skin-'+name
        # The leather donors have no roll except walker-c. Drop that donor's old travel pack.
        mesh = bmesh.new()
        mesh.from_mesh(body.data)
        uv = mesh.loops.layers.uv.active
        for face in list(mesh.faces):
            if all(loop[uv].uv.x > .94 and loop[uv].uv.y > .955 for loop in face.loops):
                mesh.faces.remove(face)
        bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if not v.link_faces], context='VERTS')
        mesh.to_mesh(body.data)
        mesh.free()
        for loop in body.data.uv_layers.active.data:
            loop.uv.y = (i + max(0,min(1,loop.uv.y*11-row))) * ROW/HEIGHT
        kit = kit_for(name).mesh(name+' work kit',source,True)
        bpy.ops.object.select_all(action='DESELECT')
        kit.select_set(True)
        body.select_set(True)
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.join()
        output_objects.append(body)
    output_objects.extend(tool_meshes(source))
    bpy.ops.object.select_all(action='DESELECT')
    for o in output_objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(output), use_selection=True, export_animations=False,
                              export_format='GLB', export_image_format='AUTO')

def render_sheet(folder):
    """Render the actual skinned game geometry baked by story-people-poses.mjs."""
    if not folder.is_relative_to(root / '.evidence'):
        parser.error('Bake the poses in a directory under .evidence/.')
    panels = json.loads((folder / 'panels.json').read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 12
    scene.cycles.use_denoising = False
    width, height = 1024, 360
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world = bpy.data.worlds.new('Overcast skylight')
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get('Background')
    background.inputs['Color'].default_value = (.65,.71,.78,1)
    background.inputs['Strength'].default_value = .95
    bpy.ops.object.light_add(type='SUN')
    sun = bpy.context.object
    sun.rotation_euler = Vector((.55,.65,-.87)).to_track_quat('-Z','Y').to_euler()
    sun.data.energy = 2.7
    sun.data.angle = .19
    sun.data.color = (1,.87,.72)
    bpy.ops.mesh.primitive_plane_add(size=600)
    ground = bpy.data.materials.new('Dust')
    ground.diffuse_color = (.23,.19,.145,1)
    bpy.context.object.data.materials.append(ground)
    bpy.ops.object.camera_add(location=(0,-20,3.08))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0,0,1.22)) - camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 8.0
    scene.camera = camera
    materials = {}
    def material_for(item):
        key = (item.get('texture'), tuple(item['colour']), item['rough'], item['metal'], item['opacity'])
        if key in materials:
            return materials[key]
        mat = bpy.data.materials.new(item['name'] or 'Stool')
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Roughness'].default_value = item['rough']
        shader.inputs['Metallic'].default_value = item['metal']
        shader.inputs['Base Color'].default_value = tuple(item['colour'])+(1,)
        shader.inputs['Alpha'].default_value = item['opacity']
        if item.get('emissive'):
            shader.inputs['Emission Color'].default_value = tuple(item['emissive'])+(1,)
            shader.inputs['Emission Strength'].default_value = item.get('emissiveIntensity', 1)
        if item.get('texture'):
            node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = bpy.data.images.load(str(folder/item['texture']),check_existing=True)
            mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
        materials[key] = mat
        return mat

    gutter, margin, header, caption = 18, 26, 82, 68
    panel_h = height + caption
    rows = (len(panels)+1)//2
    distance_y = header + rows*panel_h + (rows-1)*gutter
    page = Image.new('RGB', (2*width+gutter+2*margin, distance_y+margin+252), '#e9e5d9')
    draw = ImageDraw.Draw(page)
    def font(size, bold=False):
        try:
            return ImageFont.truetype('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf', size)
        except OSError:
            return ImageFont.load_default(size=size)
    draw.text((margin,16), 'Open Scablands', font=font(38,True), fill='#263027')
    draw.text((page.width-margin,33), 'FIGURES   /   ROUND 4     •     RELL   1.78 M', font=font(19,True),
              fill='#44513f', anchor='ra')
    for i, panel in enumerate(panels):
        if 'camera' in panel:
            view = panel['camera']
            camera.data.ortho_scale = view['width']
            camera.location = (0,-20,view['target']+20*math.tan(math.radians(view['elevation'])))
            camera.rotation_euler = (Vector((0,0,view['target']))-camera.location).to_track_quat('-Z','Y').to_euler()
        objects = []
        for item in json.loads((folder/(panel['name']+'.json')).read_text()):
            data = bpy.data.meshes.new(item['name'])
            idx = item['index']
            data.from_pydata(item['position'], [], list(zip(idx[::3],idx[1::3],idx[2::3])))
            if item['normal']:
                for poly in data.polygons:
                    poly.use_smooth = True
                data.normals_split_custom_set_from_vertices(item['normal'])
            if item['uv']:
                layer = data.uv_layers.new()
                for loop in data.loops:
                    layer.data[loop.index].uv = item['uv'][loop.vertex_index]
            data.materials.append(material_for(item))
            obj = bpy.data.objects.new(item['name'],data)
            scene.collection.objects.link(obj)
            objects.append(obj)
        filename = folder/(panel['name']+'.png')
        scene.render.filepath = str(filename)
        bpy.ops.render.render(write_still=True)
        x = margin+(i%2)*(width+gutter)
        y = header+(i//2)*(panel_h+gutter)
        draw.rectangle((x,y,x+width-1,y+32), fill='#3b463b')
        draw.text((x+14,y+4), panel['title'], font=font(18,True), fill='#faf5e5')
        page.paste(Image.open(filename).convert('RGB'),(x,y+33))
        for label in panel['labels']:
            px = x + width*(.5+label['x']/camera.data.ortho_scale)
            draw.text((px,y+height+39), label['text'], font=font(17), fill='#29332c', anchor='ma')
        if i < 3:
            # Show actual apparent size as well as the enlarged outfit studies above.
            camera.location = (0,-20,1.62)
            camera.rotation_euler = (Vector((0,0,1.62))-camera.location).to_track_quat('-Z','Y').to_euler()
            camera.data.type = 'PERSP'
            camera.data.sensor_fit = 'VERTICAL'
            camera.data.sensor_height = 24
            camera.data.lens = 12 / math.tan(math.radians(36))
            scene.render.resolution_x, scene.render.resolution_y = 1280, 720
            distant = folder/(panel['name']+'-20m.png')
            scene.render.filepath = str(distant)
            bpy.ops.render.render(write_still=True)
            bottom = distance_y+(i//2)*126
            crop = Image.open(distant).convert('RGB').crop((128,325,1152,422))
            page.paste(crop,(x,bottom+29))
            draw.text((x,bottom+3), '20 m   /   '+panel['title'].split('  /  ')[0]+
                      '   ·   72° vertical field of view, native pixels',font=font(16),fill='#29332c')
            camera.location = (0,-20,3.08)
            camera.rotation_euler = (Vector((0,0,1.22))-camera.location).to_track_quat('-Z','Y').to_euler()
            camera.data.type = 'ORTHO'
            camera.data.sensor_fit = 'AUTO'
            scene.render.resolution_x, scene.render.resolution_y = width, height
        for obj in objects:
            data = obj.data
            bpy.data.objects.remove(obj,do_unlink=True)
            bpy.data.meshes.remove(data)
    sheet.parent.mkdir(parents=True,exist_ok=True)
    for quality in (89,84,78,70):
        page.save(sheet, quality=quality, optimize=True)
        if sheet.stat().st_size <= 500000:
            return
    raise ValueError('Comparison sheet exceeds 500 kB')


if args.sheet:
    render_sheet((root/args.sheet).resolve())
else:
    build()
