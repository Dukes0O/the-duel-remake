"""Inspect unchanged cached CC0 sources. Render only the supplied Kenney female skin."""
import argparse, hashlib, json, sys
from pathlib import Path
import bpy
p=argparse.ArgumentParser()
p.add_argument('--library',default='C:/Users/kyleb/dev/art-library')
p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
base=Path(a.library); out=Path(a.output).resolve(); out.mkdir(parents=True,exist_ok=True)
standard=base/'quaternius-universal-base-characters-standard'
kenney=base/'kenney-animated-characters-survivors/unpacked'
sources=[('Standard female body',standard/'Superhero_Female_FullBody.fbx')]
sources += [('Standard '+n,standard/(n+'.fbx')) for n in ['Hair_Buns','Hair_BuzzedFemale','Hair_Long','Hair_SimpleParted']]
sources += [('Kenney body',kenney/'Model/characterMedium.fbx')]
sources += [('Kenney '+n,kenney/('Animations/'+n+'.fbx')) for n in ['idle','jump','run']]
report=[]
for label,path in sources:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(path))
    meshes=[]
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH': continue
        obj.data.calc_loop_triangles()
        mods=[m for m in obj.modifiers if m.type=='ARMATURE']
        meshes.append({'name':obj.name,'triangles':len(obj.data.loop_triangles),
          'armatures':[m.object.name if m.object else None for m in mods],
          'vertexGroups':len(obj.vertex_groups),'dimensions':list(obj.dimensions),
          'uvLayers':len(obj.data.uv_layers)})
    rigs=[{'name':o.name,'bones':len(o.data.bones),'boneNames':[b.name for b in o.data.bones]} for o in bpy.context.scene.objects if o.type=='ARMATURE']
    report.append({'label':label,'source':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
       'meshes':meshes,'rigs':rigs,'boundTriangles':sum(m['triangles'] for m in meshes if m['armatures']),
       'actions':[{'name':x.name,'frames':list(x.frame_range)} for x in bpy.data.actions]})
    if label!='Kenney body': continue
    # This is the pack's original female skin on its original shared topology.
    # No garment, body, rig, UV or source file is changed.
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        mat=bpy.data.materials.new('Official survivorFemaleA skin');mat.use_nodes=True
        node=mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image=bpy.data.images.load(str(kenney/'Skins/survivorFemaleA.png'))
        mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        o.data.materials.clear();o.data.materials.append(mat)
    from mathutils import Vector
    points=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
    lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)])
    center=(lo+hi)/2; height=hi.z-lo.z
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE_NEXT'
    scene.render.resolution_x=432;scene.render.resolution_y=576;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Source inspection world');scene.world.color=(.18,.18,.18)
    bpy.ops.object.camera_add(location=center+Vector((0,-height*2.8,height*.08)))
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=height*1.36;scene.camera=camera
    for delta,power,size in [((2,-3,4),1000,4),((-3,-1,2),600,3)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(delta)*height)
        light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size*height
        light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    scene.render.filepath=str(out/'kenney-female-source.png');scene.render.image_settings.file_format='PNG'
    bpy.ops.render.render(write_still=True)
(out/'source-inspection.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Inspected unchanged sources:',len(report))
