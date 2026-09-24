"""Rebuild GFX-00 Rook pipeline study with Blender 4.5 LTS.
blender -b --python tools/blender/test-fighter.py -- --root REPO
Blender uses Z up / -Y forward; glTF export converts once to Y up / +Z.
"""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
asset_dir = root / 'public/assets/models/wasteland'
shots = root / 'docs/board/looks/test-fighter'
asset_dir.mkdir(parents=True, exist_ok=True)
shots.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 576
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.fps = 24
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'Medium High Contrast'
scene.world.color = (.23, .23, .23)

palette = {
    'jacket': (.16, .22, .235), 'seam': (.30, .34, .33),
    'vest': (.40, .34, .245), 'cloth': (.49, .42, .31),
    'pants': (.235, .255, .19), 'leather': (.125, .095, .065),
    'boot': (.105, .095, .08), 'sole': (.065, .065, .06),
    'skin': (.55, .37, .245), 'hair': (.075, .057, .04),
    'eye': (.018, .022, .023), 'metal': (.40, .38, .31),
}
material = bpy.data.materials.new('Rook weathered fabric and leather')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .88
colors = material.node_tree.nodes.new('ShaderNodeVertexColor')
colors.layer_name = 'Color'
material.node_tree.links.new(colors.outputs['Color'], shader.inputs['Base Color'])
parts = []

def finish(obj, name, shade, bone):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(material)
    color = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    base = tuple(c ** 1.7 for c in palette[shade])
    for loop in obj.data.loops:
        co = obj.data.vertices[loop.vertex_index].co
        wear = .92 + .10 * math.sin(co.x * 139 + co.z * 173 + co.y * 91)
        color.data[loop.index].color = tuple(min(1, c * wear) for c in base) + (1,)
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    for poly in obj.data.polygons:
        poly.use_smooth = True
    parts.append(obj)
    return obj

def ellipsoid(name, center, scale, shade, bone, segments=10, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, shade, bone)

def ringsurface(name, rings, shade, bone, count=12):
    # Hand-shaped elliptical cross sections give joints, cloth folds and taper.
    vertices, faces = [], []
    for x, y, z, rx, ry in rings:
        for n in range(count):
            a = n * math.tau / count
            vertices.append((x + rx * math.cos(a), y + ry * math.sin(a), z))
    for level in range(len(rings)-1):
        for n in range(count):
            a = level * count + n
            b = level * count + (n+1) % count
            faces.append((a, b, b+count, a+count))
    faces += [tuple(reversed(range(count))), tuple((len(rings)-1)*count+n for n in range(count))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, shade, bone)

# Anatomical landmarks: 1.83 m including hair; head ~0.24 m, natural 7.5-head body.
ringsurface('Jacket torso', [
    (0,0,.96,.19,.125),(0,0,1.04,.195,.125),(0,0,1.13,.17,.115),
    (0,0,1.26,.215,.135),(0,0,1.40,.24,.125),(0,0,1.46,.205,.105),
    (0,0,1.49,.105,.075)], 'jacket', 'chest')
ringsurface('Trouser seat', [(0,0,.84,.19,.12),(0,0,.95,.205,.14),
    (0,0,1.025,.18,.115)], 'pants','pelvis')
ringsurface('Worn belt', [(0,0,.975,.203,.137),(0,0,1.02,.204,.137)], 'leather','pelvis')
ellipsoid('Belt buckle',(0,-.145,.997),(.043,.017,.028),'metal','pelvis',8,6)
for side, suffix in [(-1,'L'),(1,'R')]:
    x = side * .112
    ringsurface('Upper cargo leg '+suffix, [
        (x,0,.95,.107,.122),(x*1.06,0,.86,.113,.113),
        (x*1.12,.006,.74,.097,.104),(x*1.2,.003,.63,.086,.091),
        (x*1.22,-.004,.55,.084,.09)], 'pants','thigh.'+suffix)
    ringsurface('Lower cargo leg '+suffix, [
        (x*1.22,0,.58,.085,.09),(x*1.26,.003,.49,.083,.094),
        (x*1.3,.014,.41,.079,.083),(x*1.3,.015,.32,.07,.075),
        (x*1.32,.008,.255,.067,.07)], 'pants','shin.'+suffix)
    # Soft pocket volumes, kneepads and boot cuffs remain inside one material.
    ellipsoid('Cargo pocket '+suffix,(side*.218,-.012,.78),(.036,.078,.095),'vest','thigh.'+suffix,8,6)
    ellipsoid('Patched knee '+suffix,(x*1.22,-.087,.545),(.065,.018,.071),'leather','shin.'+suffix,10,6)
    ellipsoid('Boot '+suffix,(x*1.32,-.036,.13),(.081,.145,.13),'boot','foot.'+suffix)
    ellipsoid('Boot sole '+suffix,(x*1.32,-.046,.031),(.086,.149,.031),'sole','foot.'+suffix,12,6)
    ringsurface('Boot cuff '+suffix,[(x*1.32,0,.16,.077,.083),
        (x*1.32,0,.26,.074,.082)],'leather','shin.'+suffix)
    for h in range(4):
        ellipsoid('Boot lace '+suffix+str(h),(x*1.32,-.112,.105+h*.026),(.049,.007,.006),'cloth','foot.'+suffix,8,4)
    shoulder, elbow, wrist = side*.25, side*.30, side*.32
    ringsurface('Jacket upper sleeve '+suffix, [
        (shoulder,0,1.425,.083,.092),(side*.277,0,1.35,.088,.09),
        (side*.29,0,1.25,.073,.078),(elbow,-.008,1.16,.071,.075)],'jacket','upper_arm.'+suffix)
    ringsurface('Rolled sleeve '+suffix, [
        (elbow,-.008,1.19,.072,.078),(side*.315,-.022,1.10,.064,.067),
        (side*.322,-.03,1.04,.066,.067)],'jacket','forearm.'+suffix)
    ringsurface('Sleeve cuff '+suffix,[(side*.32,-.03,1.035,.067,.068),
        (side*.32,-.03,1.075,.065,.069)],'seam','forearm.'+suffix)
    ellipsoid('Forearm '+suffix,(wrist,-.027,.985),(.049,.05,.085),'skin','forearm.'+suffix)
    ellipsoid('Fingerless glove '+suffix,(wrist,-.045,.885),(.049,.043,.066),'leather','hand.'+suffix)
    ellipsoid('Fingers '+suffix,(wrist,-.051,.848),(.04,.034,.043),'skin','hand.'+suffix)
    ellipsoid('Thumb '+suffix,(wrist-side*.038,-.068,.89),(.018,.026,.035),'skin','hand.'+suffix,8,6)
    # Open tan utility vest panels and sewn pockets.
    ellipsoid('Vest panel '+suffix,(side*.129,-.113,1.247),(.08,.041,.205),'vest','chest')
    ellipsoid('Chest pocket '+suffix,(side*.128,-.15,1.32),(.051,.024,.058),'cloth','chest',8,6)
    ellipsoid('Lower pouch '+suffix,(side*.13,-.154,1.106),(.056,.03,.058),'vest','chest',8,6)
    ellipsoid('Shoulder strap '+suffix,(side*.177,-.078,1.426),(.029,.052,.071),'leather','chest',8,6)
    ellipsoid('Vest buckle '+suffix,(side*.177,-.128,1.375),(.026,.013,.028),'metal','chest',8,6)

ellipsoid('Neck',(0,0,1.535),(.07,.067,.09),'skin','neck')
# Layered scarf rings, draped front and compact back hood.
ellipsoid('Scarf collar',(0,0,1.49),(.128,.11,.083),'cloth','neck')
ellipsoid('Scarf drape',(0,-.122,1.424),(.105,.038,.099),'cloth','chest')
for n in range(3):
    ellipsoid('Scarf fold '+str(n),(0,-.149+n*.007,1.425+n*.024),(.092-n*.009,.012,.015),'vest','chest',12,6)
ellipsoid('Back vest',(0,.11,1.257),(.184,.033,.18),'vest','chest')
ellipsoid('Back hood',(0,.131,1.397),(.12,.052,.098),'cloth','chest')
ellipsoid('Belt pouch',(.193,.069,1.006),(.064,.064,.079),'leather','pelvis',10,6)

# Cheek planes, narrow nose, brows, ears, beard and broken hair silhouette.
ellipsoid('Head',(0,-.002,1.681),(.092,.087,.126),'skin','head',16,12)
ellipsoid('Jaw',(0,-.025,1.617),(.073,.071,.061),'skin','head',12,8)
ellipsoid('Beard',(0,-.053,1.609),(.074,.052,.051),'hair','head',12,8)
ellipsoid('Nose',(0,-.089,1.679),(.019,.025,.041),'skin','head',10,6)
ellipsoid('Moustache',(0,-.097,1.638),(.041,.014,.012),'hair','head',10,6)
for side in [-1,1]:
    ellipsoid('Ear',(side*.091,.0,1.672),(.015,.022,.038),'skin','head',8,6)
    ellipsoid('Eye socket',(side*.034,-.080,1.704),(.027,.012,.014),'leather','head',10,6)
    ellipsoid('Eye',(side*.034,-.09,1.704),(.014,.006,.006),'eye','head',8,4)
    ellipsoid('Brow',(side*.035,-.085,1.724),(.031,.013,.009),'hair','head',8,4)
ellipsoid('Hair crown',(0,.015,1.775),(.102,.091,.052),'hair','head',12,8)
for n in range(11):
    a = n * 2.39996
    x, y = math.cos(a)*.078, math.sin(a)*.067+.015
    ellipsoid('Hair lock '+str(n),(x,y,1.774+.017*math.sin(n*1.7)),
        (.031,.036,.038),'hair','head',8,6)
for side in [-1,1]:
    ellipsoid('Sideburn',(side*.083,.014,1.70),(.027,.067,.074),'hair','head',8,6)

# One vertex-colour surface = one fighter draw call, including clothing.
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Rook skinned study'
# Merge identical material slots introduced by join.
for poly in body.data.polygons:
    poly.material_index = 0
while len(body.data.materials) > 1:
    body.data.materials.pop(index=1)
armature = bpy.data.armatures.new('Rook skeleton')
rig = bpy.data.objects.new('Rook rig', armature)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None):
    result = armature.edit_bones.new(name)
    result.head, result.tail = head, tail
    if parent:
        result.parent = armature.edit_bones[parent]
bone('root',(0,0,0),(0,0,.15))
bone('pelvis',(0,0,.94),(0,0,1.09),'root')
bone('chest',(0,0,1.09),(0,0,1.47),'pelvis')
bone('neck',(0,0,1.47),(0,0,1.56),'chest')
bone('head',(0,0,1.56),(0,0,1.8),'neck')
for side, suffix in [(-1,'L'),(1,'R')]:
    bone('thigh.'+suffix,(side*.112,0,.94),(side*.137,0,.56),'pelvis')
    bone('shin.'+suffix,(side*.137,0,.56),(side*.148,0,.20),'thigh.'+suffix)
    bone('foot.'+suffix,(side*.148,0,.20),(side*.148,-.16,.06),'shin.'+suffix)
    bone('upper_arm.'+suffix,(side*.25,0,1.425),(side*.3,-.008,1.18),'chest')
    bone('forearm.'+suffix,(side*.3,-.008,1.18),(side*.32,-.027,.95),'upper_arm.'+suffix)
    bone('hand.'+suffix,(side*.32,-.027,.95),(side*.32,-.051,.82),'forearm.'+suffix)
bpy.ops.object.mode_set(mode='OBJECT')
modifier = body.modifiers.new('Bound character skin','ARMATURE')
modifier.object = rig
body.parent = rig
# The torso uses blended chest/pelvis weights near the waist.
for vertex in body.data.vertices:
    for group in list(vertex.groups):
        if body.vertex_groups[group.group].name == 'chest':
            z = (body.matrix_world @ vertex.co).z
            chest_weight = max(0, min(1, (z-1.00)/.18))
            body.vertex_groups['chest'].add([vertex.index],chest_weight,'REPLACE')
            body.vertex_groups['pelvis'].add([vertex.index],1-chest_weight,'REPLACE')
            break
rig.animation_data_create()
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'
actions = {}
for name, frames in [('idle',[1,13,25,37,49]),('walk',[1,7,13,19,25]),('knockdown',[1,7,13,19,25])]:
    action = bpy.data.actions.new(name)
    rig.animation_data.action = action
    for frame in frames:
        phase = (frame-1)/(frames[-1]-1)
        for pb in rig.pose.bones:
            pb.rotation_euler = (0,0,0)
            pb.location = (0,0,0)
        if name == 'idle':
            rig.pose.bones['chest'].rotation_euler.x = .025*math.sin(phase*math.tau)
            rig.pose.bones['head'].rotation_euler.y = .04*math.sin(phase*math.tau)
        elif name == 'walk':
            stride = math.sin(phase*math.tau)
            for side, suffix in [(-1,'L'),(1,'R')]:
                rig.pose.bones['thigh.'+suffix].rotation_euler.x = side*.42*stride
                rig.pose.bones['shin.'+suffix].rotation_euler.x = -.20*max(0,-side*stride)
                rig.pose.bones['upper_arm.'+suffix].rotation_euler.x = -side*.28*stride
                rig.pose.bones['forearm.'+suffix].rotation_euler.x = -.1
            rig.pose.bones['pelvis'].location.y = .018*abs(stride)
        else:
            rig.pose.bones['root'].rotation_euler.x = math.pi/2*min(1,phase*1.4)
            rig.pose.bones['root'].location.y = .20*min(1,phase*1.4)
            rig.pose.bones['chest'].rotation_euler.x = -.13*phase
            rig.pose.bones['upper_arm.L'].rotation_euler.z = -.32*phase
            rig.pose.bones['upper_arm.R'].rotation_euler.z = .24*phase
        for pb in rig.pose.bones:
            pb.keyframe_insert(data_path='rotation_euler', frame=frame)
            pb.keyframe_insert(data_path='location', frame=frame)
    # Plant the lowest deformed vertex at ground on every authored sample.
    # Root translation is animation data, never a runtime simulation correction.
    for frame in frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        floor_z = min((evaluated.matrix_world @ v.co).z for v in evaluated.data.vertices)
        rig.pose.bones['root'].location.y -= floor_z
        rig.pose.bones['root'].keyframe_insert(data_path='location', frame=frame)
    actions[name] = action
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name,1,action)
    track.mute = True
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_euler = (0,0,0)
    pb.location = (0,0,0)
scene.frame_set(1)
bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(asset_dir/'test-fighter.glb'),
    export_format='GLB', use_selection=True, export_yup=True,
    export_animations=True, export_animation_mode='NLA_TRACKS',
    export_force_sampling=True, export_skins=True, export_materials='EXPORT')

# Matched 28-degree vertical perspective camera at five metres.
bpy.ops.object.camera_add(location=(0,-5,.9))
camera = bpy.context.object
camera.name = 'Matched five metre camera'
camera.data.type = 'PERSP'
camera.data.sensor_fit = 'VERTICAL'
camera.data.sensor_height = 32
camera.data.lens = 32/(2*math.tan(math.radians(28)/2))
camera.rotation_euler = (Vector((0,0,.9))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera = camera
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.012))
floor = bpy.context.object
floor.name = 'Neutral review floor'
floor_mat = bpy.data.materials.new('Review grey')
floor_mat.diffuse_color = (.22,.22,.22,1)
floor.data.materials.append(floor_mat)
for name, location, energy, size in [
    ('Key',(-3,-4,6),500,4),('Fill',(3,-2,3),240,5),('Rim',(0,3,4),350,3)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
rig.animation_data.action = actions['idle']
scene.frame_set(7)
bpy.ops.wm.save_as_mainfile(filepath=str(asset_dir/'test-fighter.blend'))
views = [('front',0),('side',math.pi/2),('back',math.pi)]
for clip, time in [('idle',.25),('walk',.25),('knockdown',1)]:
    rig.animation_data.action = actions[clip]
    scene.frame_set(round(time*24)+1)
    for view, yaw in views:
        rig.rotation_euler.z = yaw
        offset = Vector((math.sin(yaw)*.90, -math.cos(yaw)*.90, 0)) if clip == 'knockdown' else Vector((0,0,0))
        target = Vector((0,0,.9)) + offset
        camera.location = target + Vector((0,-5,0))
        camera.rotation_euler = (target-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = str(shots/f'blender-{clip}-{view}.png')
        bpy.ops.render.render(write_still=True)
rig.rotation_euler.z = 0
rig.animation_data.action = actions['idle']
scene.frame_set(7)
bpy.ops.wm.save_as_mainfile(filepath=str(asset_dir/'test-fighter.blend'))
body.data.calc_loop_triangles()
(shots/'blender.json').write_text(json.dumps({
    'blender': bpy.app.version_string,
    'camera': {'position':[0,.9,5], 'target':[0,.9,0], 'verticalFov':28,
               'width':576,'height':640,'distanceMetres':5},
    'poses':[{'clip':c,'time':t,'views':['front','side','back']} for c,t in [('idle',.25),('walk',.25),('knockdown',1)]],
    'triangles':len(body.data.loop_triangles), 'materials':len(body.data.materials),
    'axis':'Blender Z-up/-Y-forward; export_yup converts once to Three Y-up/+Z-forward',
    'reference':'public/assets/reference/wasteland-crew-1.png; left Rook figure triplet'
},indent=2)+'\n')
print('GFX-00 export and matched Blender renders complete.')