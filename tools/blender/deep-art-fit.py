"""DEEP-ART-SRC: fit Claude's licensed donors and two approved authored models.

Run in the owned isolated lane with Blender --disable-autoexec --threads 4.
No downloads, runtime scene changes, or player storage. Original source bytes
are checked against the art catalog before import. Blender XYZ exports to glTF.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

ROLES = ['silver-school','reef-fish','turtle','ray','manta','sea-lion','otter',
         'crab','moray','grouper','reef-shark','jellyfish','whale','octopus',
         'wreck-hull','giant-clam','anchor','sunken-boat']

def arguments():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',required=True)
    p.add_argument('--evidence',required=True)
    p.add_argument('--paths-only',action='store_true')
    p.add_argument('--inspect',action='store_true')
    p.add_argument('--only',choices=ROLES)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    root=Path(a.root).resolve()
    return a,root,Path(a.evidence).resolve()

# Existing Blender pipeline's pure output planner: no bpy, input reads or writes.
if '--paths-only' in sys.argv:
    a,root,evidence=arguments();roles=[a.only] if a.only else ROLES
    if not evidence.is_relative_to(root/'.evidence') or evidence==root/'.evidence':
        raise ValueError('Blend sources require an owned ignored .evidence leaf inside the requested root')
    print(json.dumps({'blend':[str(evidence/(role+'.blend')) for role in roles],
        'glb':[str(root/'public/assets/models/deep'/(role+'.glb')) for role in roles],
        'json':[] if a.only else [str(root/'public/assets/models/deep/manifest.json')],
        'evidence':[],'summary':[]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector, Matrix

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def donors(root):
    return {r['deepId']:r for r in json.loads((root/'tools/art/catalog.json').read_text(encoding='utf8'))['assets'] if r.get('card')=='DEEP-ART-SRC'}

def import_donor(row):
    file=next(f for f in row['files'] if f['path'].endswith('.glb'))
    path=Path(row['library'])/file['path']
    if hashlib.sha256(path.read_bytes()).hexdigest()!=file['sha256']:
        raise RuntimeError('Donor hash mismatch: '+str(path))
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [o for o in bpy.context.scene.objects if o.type=='MESH']

def bounds(objects):
    for o in objects:o.data.update()
    bpy.context.view_layer.update()
    graph=bpy.context.evaluated_depsgraph_get()
    points=[o.matrix_world@v.co for o in objects for v in o.evaluated_get(graph).data.vertices]
    lo=Vector([min(v[i] for v in points) for i in range(3)])
    hi=Vector([max(v[i] for v in points) for i in range(3)])
    return lo,hi


# Reusable static helpers and the two explicitly approved authored forms.
def material(name, colour, roughness=.7, metallic=0, alpha=1, glow=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*colour,alpha)
    p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metallic
    p.inputs['Alpha'].default_value=alpha
    if glow:p.inputs['Emission Color'].default_value=(*colour,1);p.inputs['Emission Strength'].default_value=glow
    m.diffuse_color=(*colour,alpha)
    if alpha<1:m.surface_render_method='DITHERED';m.use_transparency_overlap=False
    return m

def mesh(name,vertices,faces,mat):
    d=bpy.data.meshes.new(name);d.from_pydata(vertices,[],faces);d.update()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    for p in d.polygons:p.use_smooth=True
    return o

def sphere(name,at,scale,mat,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=at)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    return o

def pipe(name,points,radii,mat,sides=12):
    verts=[];faces=[]
    for i,point in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize();cross=tangent.cross(Vector((0,0,1)))
        if cross.length<.01:cross=tangent.cross(Vector((1,0,0)))
        cross.normalize();up=cross.cross(tangent).normalized()
        for j in range(sides):
            ang=j*2*math.pi/sides;verts.append(Vector(point)+radii[i]*(math.cos(ang)*cross+math.sin(ang)*up))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))));faces.append(tuple(range((len(points)-1)*sides,len(points)*sides)))
    return mesh(name,verts,faces,mat)

def vertex_paint(o,colour_function):
    for index,mat in enumerate(o.data.materials):
        if mat:o.data.materials[index]=mat.copy()
    attr=o.data.color_attributes.get('DeepPaint') or o.data.color_attributes.new(name='DeepPaint',type='BYTE_COLOR',domain='CORNER')
    o.data.color_attributes.active_color=attr
    for loop in o.data.loops:attr.data[loop.index].color=(*colour_function(o.data.vertices[loop.vertex_index].co),1)
    for m in o.data.materials:
        if not m:continue
        m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');node=m.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='DeepPaint'
        m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])

def mottled(base,p,scale=28):
    # Fixed recipe, independent of race RNG; broad natural mottling, no neon noise.
    n=(math.sin(p.x*scale+math.sin(p.y*scale*.39))*math.sin(p.z*scale*1.13+p.y*scale*.7)+1)*.5
    shade=.73+.28*n
    return tuple(c*shade for c in base)

def authored_moray():
    body=material('moray / brown olive skin',(.24,.19,.105),.58)
    mouth=material('moray / mouth shadow',(.019,.024,.016),.82);eye=material('moray / black eye',(.009,.014,.01),.24)
    pts=[];rs=[]
    for i in range(85):
        t=i/84;pts.append((.19*math.sin(t*5.8)*t,-.59+1.45*t,.18+.10*math.sin(t*4.2)*t));rs.append(.065*(1-t)**.65+.005)
    o=pipe('moray / tapered continuous body',pts,rs,body,16);vertex_paint(o,lambda p:mottled((.27,.215,.12),p,78))
    # A continuous dorsal-to-tail ribbon with true thickness, not isolated spines.
    verts=[];faces=[]
    for i in range(85):
        t=i/84;p=Vector(pts[i]);height=.046*math.sin(math.pi*t)**.7
        verts.extend([p+Vector((0,0,rs[i]*.7)),p+Vector((0,0,rs[i]+height))])
    for i in range(84):faces.append((i*2,i*2+1,i*2+3,i*2+2))
    fin=mesh('moray / continuous dorsal fin',verts,faces,body);mod=fin.modifiers.new('fin skin thickness','SOLIDIFY');mod.thickness=.002
    head=sphere('moray / upper head',(-.005,-.64,.185),(.072,.13,.063),body)
    sphere('moray / lower jaw',(-.005,-.668,.117),(.055,.115,.023),body)
    sphere('moray / open mouth',(-.005,-.727,.145),(.052,.065,.012),mouth)
    for sign in [-1,1]:sphere('moray / eye',(.058*sign,-.685,.209),(.007,.009,.007),eye,16,8)
    return [o,fin,head]

def authored_clam():
    shell=material('clam / sandy grey shell',(.25,.26,.23),.91);mantle=material('clam / blue green mantle',(.065,.20,.17),.69)
    result=[]
    for top in [False,True]:
        verts=[];faces=[];rings=6;slices=40
        # Elliptic cup with ten fluted radial ridges and a wavy scalloped rim.
        for i in range(rings+1):
            r=max(.0001,i/rings)
            for j in range(slices):
                ang=j*2*math.pi/slices;wav=math.cos(10*ang)*r**2
                x=.67*r*(1+.075*wav)*math.cos(ang);y=.50*r*math.sin(ang)
                z=.19*(r*r)+.04*wav*r
                if top:
                    # Hinged open valve; its inside remains visible above the mantle.
                    dy=y-.45;z=.36+math.sin(.73)*dy+math.cos(.73)*z;y=.45+math.cos(.73)*dy-math.sin(.73)*z
                else:z=-z+.20
                verts.append((x,y,z))
        for i in range(rings):
            for j in range(slices):a=i*slices+j;b=i*slices+(j+1)%slices;faces.append((a,b,b+slices,a+slices))
        o=mesh('clam / '+('open upper valve' if top else 'lower valve'),verts,faces,shell);sol=o.modifiers.new('shell thickness','SOLIDIFY');sol.thickness=.028
        vertex_paint(o,lambda p:mottled((.29,.30,.26),p,34));result.append(o)
    # Living mantle is clearly separate from the ridged mineral shell.
    m=sphere('clam / soft mantle', (0,-.035,.13),(.57,.425,.08),mantle,20,8)
    vertex_paint(m,lambda p:mottled((.085,.24,.20),p,43));result.append(m)
    for j in range(10):
        ang=j*2*math.pi/10;at=(.53*math.cos(ang),.38*math.sin(ang),.16)
        sphere('clam / mantle fold',at,(.09,.065,.043),mantle,8,4)
    return result

# Shape adaptation uses imported source topology and UVs; it never replaces a
# donor animal with a procedural whole body. Only moray and clam are authored.
DIMENSIONS={'silver-school':.32,'reef-fish':.28,'turtle':1.05,'ray':1.45,'manta':4.2,
            'sea-lion':2.25,'otter':1.20,'crab':.30,'grouper':1.20,'reef-shark':1.8,
            'jellyfish':.65,'whale':14.0,'octopus':1.5,'wreck-hull':32.0,'anchor':1.8,'sunken-boat':6.0}

def visible_meshes():
    return [o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render]

def apply_world(o):
    o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4);o.parent=None

def old_loop_colours(o):
    images={};factors={};polygon_material={}
    for index,m in enumerate(o.data.materials):
        factors[index]=tuple(m.diffuse_color[:3]) if m else (1,1,1)
        if m and m.use_nodes:
            tex=next((n for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None)
            if tex:images[index]=(tex.image.size[:],list(tex.image.pixels[:]))
    for poly in o.data.polygons:
        for index in poly.loop_indices:polygon_material[index]=poly.material_index
    uv=o.data.uv_layers.active;colours=[]
    for loop in o.data.loops:
        index=polygon_material[loop.index];rgb=factors.get(index,(1,1,1))
        if index in images and uv:
            (w,h),pixels=images[index];u,v=uv.data[loop.index].uv
            x=min(w-1,max(0,int(u*w)));y=min(h-1,max(0,int(v*h)));k=(y*w+x)*4;rgb=tuple(pixels[k:k+3])
        colours.append(rgb)
    return colours

def colour_static(o,role):
    old=old_loop_colours(o);materials=[]
    alpha=.64 if role=='jellyfish' else 1
    m=material(role+' / fitted muted skin',(.5,.5,.5),.48 if role in ['silver-school','reef-fish','grouper'] else .72, .35 if role=='silver-school' else 0,alpha,.07 if role=='jellyfish' else 0)
    o.data.materials.clear();o.data.materials.append(m)
    attr=o.data.color_attributes.get('DeepPaint') or o.data.color_attributes.new(name='DeepPaint',type='BYTE_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
    for p in o.data.polygons:p.material_index=0;p.use_smooth=True
    lo,hi=bounds([o]);size=hi-lo
    for loop in o.data.loops:
        p=o.data.vertices[loop.vertex_index].co;t=(p.y-lo.y)/max(.001,size.y);z=(p.z-lo.z)/max(.001,size.z);rgb=old[loop.index]
        palettes={'silver-school':(.39,.50,.54),'reef-fish':(.075,.24,.31),'turtle':(.16,.22,.095),'ray':(.12,.18,.19),'sea-lion':(.105,.085,.057),'otter':(.065,.041,.025),'crab':(.19,.075,.035),'grouper':(.26,.185,.10),'jellyfish':(.45,.245,.32),'octopus':(.25,.087,.039),'anchor':(.22,.16,.09),'wreck-hull':(.155,.17,.15),'sunken-boat':(.14,.16,.13)}
        base=palettes[role]
        if role=='reef-fish' and t>.79:base=(.58,.45,.09)
        if role=='silver-school' and z>.70:base=(.12,.24,.29)
        if role=='turtle':base=(.115,.15,.057) if z>.58 else (.18,.27,.115)
        if role=='ray' and z<.35:base=(.38,.38,.30)
        if role=='otter' and t<.3:base=(.31,.26,.17)
        if role=='grouper':base=(.28,.215,.12)
        if role=='anchor':base=(.085,.09,.075) if math.sin(p.x*27+p.y*17)>0 else (.25,.135,.064)
        if role in ['wreck-hull','sunken-boat']:
            rust=math.sin(p.x*4.3+math.sin(p.y*3.1))*math.cos(p.z*8.3+p.y*2.1)
            base=(.30,.145,.064) if rust>.03 else (.13,.16,.135)
            if z<.32:base=(.08,.135,.075)
        paint=mottled(base,p,24 if role not in ['wreck-hull','sunken-boat'] else 4)
        # Preserve source-painted pupils and mouths when they are truly black.
        if role not in ['anchor','wreck-hull','sunken-boat','jellyfish'] and max(rgb)<.065:paint=(.012,.014,.01)
        attr.data[loop.index].color=(*paint,alpha)
    node=m.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='DeepPaint';m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

def morph(o,name,transform,seconds=3):
    basis=o.shape_key_add(name='Basis') if not o.data.shape_keys else o.data.shape_keys.key_blocks[0]
    key=o.shape_key_add(name=name)
    for i,v in enumerate(basis.data):key.data[i].co=transform(v.co.copy())
    for frame,value in [(1,0),(int(seconds*24/4),1),(int(seconds*24/2),0),(int(seconds*24*.75),.35),(int(seconds*24)+1,0)]:
        key.value=value;key.keyframe_insert('value',frame=frame)
    o.data.shape_keys.animation_data.action.name=name
    return key

def fit_static(role,objects):
    for o in objects:apply_world(o)
    if role=='wreck-hull':
        for o in list(objects):
            if o.name.startswith('cargo-'):bpy.data.objects.remove(o,do_unlink=True);objects.remove(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=role
    lo,hi=bounds([o]);centre=(lo+hi)*.5;span=hi-lo
    # Canonical Blender -Y nose, +Z up. Long-X mackerel rotates into that frame.
    if role=='silver-school':
        rot=Matrix.Rotation(math.pi/2,4,'Z');o.data.transform(rot);lo,hi=bounds([o]);centre=(lo+hi)*.5;span=hi-lo
    length_axis=0 if role in ['ray','crab','octopus'] else (2 if role=='jellyfish' else 1)
    scale=DIMENSIONS[role]/span[length_axis]
    for v in o.data.vertices:v.co=(v.co-centre)*scale
    if role=='ray':
        for v in o.data.vertices:v.co.z*=.45
    if role=='sea-lion':
        # Recline the raised torso/head into a streamlined glide; retain source flippers.
        for v in o.data.vertices:
            p=v.co.copy();lift=max(0,p.z+.10);v.co.y-=lift*.68;v.co.z=.20*p.z+.10*math.sin(p.y*2)
    if role=='otter':
        # Flatten the donor's standing arch into a horizontal floating spine.
        # Preserve each cross-section, nose, face and original donor topology.
        sections={}
        for v in o.data.vertices:
            key=round(v.co.y/.075);sections.setdefault(key,[]).append(v.co.z)
        centres={key:(min(z)+max(z))*.5 for key,z in sections.items()}
        for v in o.data.vertices:
            p=v.co.copy();v.co.z=-.85*(p.z-centres[round(p.y/.075)])
            # The source back rolls down; its belly and folded forepaws face up.
            if p.y>.28:v.co.z*=.18;v.co.x*=1.40
            if p.y<-.05 and p.z<-.10 and abs(p.x)>.04:
                w=min(1,(-p.z-.1)/.10);v.co.x=p.x*(1-.76*w);v.co.y=p.y*(1-.30*w);v.co.z=.105*w+v.co.z*(1-w)
            if p.y<-.32:
                v.co.x*=1.18;v.co.z-=.025  # round pale face remains readable below
        paws=material('otter / chest forepaws',(.19,.15,.105),.8)
        for sign in [-1,1]:sphere('otter / folded chest paw',(.038*sign,-.19,.105),(.039,.055,.026),paws,12,6)
    if role=='octopus':
        for v in o.data.vertices:
            p=v.co;r=math.hypot(p.x,p.y)
            if p.z<-.05 and r>.35:
                t=min(1,(r-.35)/.45);ang=.6*t;v.co.x=math.cos(ang)*p.x-math.sin(ang)*p.y;v.co.y=math.sin(ang)*p.x+math.cos(ang)*p.y;v.co.z+=.14*t*t
    if role=='grouper':
        for v in o.data.vertices:
            p=v.co;belly=max(0,1-(p.y/.60)**2);v.co.x*=1+.6*belly;v.co.z*=1+.55*belly
            if p.y<-.37:v.co.x*=1.4;v.co.z*=1.35
    colour_static(o,role)
    if role=='turtle':morph(o,'slow-flipper-stroke',lambda p: p+Vector((0,0,.075*max(0,(abs(p.x)-.21)/.27)*math.cos(p.y*2))),5)
    if role=='sea-lion':morph(o,'glide-body-wave',lambda p:p+Vector((.035*math.sin(p.y*5),0,.022*math.cos(p.y*4))),3)
    if role=='crab':
        morph(o,'side-scuttle-legs',lambda p:p+Vector((0,.018*math.sin(p.x*90) if abs(p.x)>.07 else 0,.012 if abs(p.x)>.09 else 0)),1.6)
        for frame,x in [(1,0),(20,.045),(40,0)]:o.location.x=x;o.keyframe_insert('location',frame=frame)
        o.animation_data.action.name='side-scuttle'
    if role=='jellyfish':morph(o,'gentle-bell-pulse',lambda p:Vector((p.x*(.91 if p.z>.08 else 1),p.y*(.91 if p.z>.08 else 1),p.z+(.025 if p.z>.08 else .01))),4)
    if role=='otter':morph(o,'surface-breath',lambda p:p+Vector((0,0,.013*max(0,1-abs(p.y)*2))),4)
    return o

def fit_rig(role,row):
    objects=import_donor(row)
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and o.hide_render:bpy.data.objects.remove(o,do_unlink=True)
    objects=visible_meshes();lo,hi=bounds(objects);span=hi-lo;factor=DIMENSIONS[role]/(span.x if role=='manta' else span.y)
    root=bpy.data.objects.new(role+' / metric root',None);bpy.context.collection.objects.link(root)
    roots=[o for o in bpy.context.scene.objects if o.parent is None and o!=root]
    for o in roots:o.parent=root
    root.scale=(factor,)*3;root.location=-(lo+hi)*.5*factor
    for o in objects:
        for m in o.data.materials:
            if not m:continue
            m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
            bottom='Bottom' in m.name
            if role=='manta':colour=(.42,.43,.39) if bottom else (.07,.105,.12)
            elif role=='whale':colour=(.27,.30,.29) if bottom else (.065,.10,.12)
            else:colour=(.47,.48,.43) if bottom else (.18,.22,.23)
            p.inputs['Base Color'].default_value=(*colour,1);p.inputs['Roughness'].default_value=.52;m.diffuse_color=(*colour,1)
            if role=='reef-shark' and not bottom:
                # Real black tips on dorsal/pectoral/tail extrema in original donor space.
                o.data.color_attributes.new(name='DeepPaint',type='BYTE_COLOR',domain='CORNER')
                attr=o.data.color_attributes['DeepPaint'];o.data.color_attributes.active_color=attr
                material_by_loop={index:poly.material_index for poly in o.data.polygons for index in poly.loop_indices}
                for loop in o.data.loops:
                    w=o.matrix_world@o.data.vertices[loop.vertex_index].co
                    tipped=(abs(w.x)>.78*(span.x*.5) or w.z>lo.z+.86*span.z or w.y>lo.y+.94*span.y)
                    source_mat=o.data.materials[material_by_loop[loop.index]]
                    rgb=(1,1,1) if 'Bottom' in source_mat.name else ((.022,.024,.024) if tipped else colour)
                    attr.data[loop.index].color=(*rgb,1)
                node=m.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='DeepPaint'
                m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])

    return root
def cube(name,at,dimensions,mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.name=name;o.dimensions=dimensions
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat:o.data.materials.append(mat)
    return o

def subtract(o,cutter,name):
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)

def trim_opening(o,cutter,name):
    # Imported multi-part surface shells are not a single CSG solid. Split
    # their ORIGINAL faces on the cutter planes, then remove only faces inside
    # the aperture. No cutter faces can enter the fitted hull.
    import bmesh
    bpy.context.view_layer.update();bm=bmesh.new();bm.from_mesh(o.data)
    local=[v.co for v in cutter.data.vertices];lo=Vector([min(v[i] for v in local) for i in range(3)]);hi=Vector([max(v[i] for v in local) for i in range(3)])
    transform=cutter.matrix_world;inverse=transform.inverted()
    for axis in range(3):
        normal=Vector((int(axis==0),int(axis==1),int(axis==2)))
        for value in [lo[axis],hi[axis]]:
            point=Vector((0,0,0));point[axis]=value
            bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,plane_co=transform@point,plane_no=transform.to_3x3()@normal,clear_inner=False,clear_outer=False)
    selected=[]
    for face in bm.faces:
        point=inverse@face.calc_center_median()
        if all(lo[i]-.00001<=point[i]<=hi[i]+.00001 for i in range(3)):selected.append(face)
    if not selected:bm.free();raise RuntimeError('No donor faces removed for '+name)
    bmesh.ops.delete(bm,geom=selected,context='FACES')
    bm.to_mesh(o.data);bm.free();o.data.update();bpy.data.objects.remove(cutter,do_unlink=True)


def fit_vessel(role,o):
    # GLB UV/normal seams duplicate coincident vertices. Weld the donor shell
    # and orient its connected faces before cutting actual voids.
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(o.data);bm.free();o.data.update()
    lo,hi=bounds([o]);span=hi-lo
    rust=material(role+' / exposed rusty steel',(.20,.105,.055),.94,.15)
    algae=material(role+' / algae stain',(.08,.13,.065),.96)
    inner=material(role+' / hold shadows',(.06,.075,.062),.93,.08)
    if role=='wreck-hull':
        floor_z=lo.z+.35
        trim_opening(o,cube('hold opening',(0,.4,(floor_z+hi.z)/2+.3),(span.x*.63,span.y*.48,hi.z-floor_z+1.5)),'cut real open cargo hold')
        # Irregular edge: an asymmetric broken aperture through the hull side.
        cut=cube('starboard breach',(span.x*.40,.5,lo.z+2.1),(span.x*.50,5.8,4.6));cut.rotation_euler[0]=.09;cut.rotation_euler[2]=-.13
        trim_opening(o,cut,'open hull breach')
        cut_lo,cut_hi=bounds([o])
        if any(cut_lo[i]<lo[i]-.01 or cut_hi[i]>hi[i]+.01 for i in range(3)):
            raise RuntimeError('Hull subtraction grew outward instead of making a breach')
        floor=cube('wreck-hull / hold floor',(0,.4,floor_z),(span.x*.61,span.y*.47,.16),inner)
        for y in [-6,-3,0,3,6]:
            for sign in [-1,1]:
                cube('wreck-hull / exposed hold frame',(sign*span.x*.30,y,floor_z+1.65),(.12,.16,3.3),rust)
        # Bent, interrupted rails make the missing runs plainly visible.
        for sign in [-1,1]:
            for ya,yb in [(-10,-7),(-5,-3),(4,7)]:
                z=lo.z+3.6;pipe('wreck-hull / broken rail',[(sign*span.x*.46,ya,z),(sign*span.x*.46,yb-.5,z),(sign*(span.x*.46-.30),yb,z+.35)],[.055,.055,.043],rust,8)
                pipe('wreck-hull / rail post',[(sign*span.x*.46,ya,z-.9),(sign*span.x*.46,ya,z)],[.06,.06],rust,8)
    else:
        # Cut a breached rear cockpit; source cabin shape stays, loud paint does not.
        trim_opening(o,cube('fishing boat stern opening',(0,.95,lo.z+.70),(span.x*.47,span.y*.30,1.15)),'broken cockpit and open deck')
        cutter=cube('boat hull hole',(-span.x*.44,.60,lo.z+.46),(.8,1.25,.68));cutter.rotation_euler[1]=.18
        trim_opening(o,cutter,'irregular hull hole')
        for sign in [-1,1]:
            for y in [-1.4,.2]:
                pipe('sunken-boat / broken guard',[(sign*span.x*.42,y,lo.z+.75),(sign*span.x*.44,y+.7,lo.z+.85),(sign*span.x*.30,y+.85,lo.z+.42)],[.025,.025,.020],rust,8)
    # A subdued algae patch is geometry on exposed steel, never a bright decal.
    return o

def fit_grouper_mouth(o):
    lo,hi=bounds([o]);dark=material('grouper / down turned mouth shadow',(.018,.017,.010),.90)
    # A broad shallow inset in the donor face, without the rejected torus/loop.
    centre=(0,lo.y+.014,.012)
    cut=sphere('mouth cutter',centre,(.17,.085,.060),dark,24,12);subtract(o,cut,'grouper wide mouth cavity')
    recess=sphere('grouper / down turned mouth recess',(0,lo.y+.055,.004),(.149,.020,.044),dark,20,8)
    for v in recess.data.vertices:
        v.co.z-=.026*min(1,abs(v.co.x)/.149)**2


def role_build(role,rows):
    clear()
    if role=='moray':authored_moray()
    elif role=='giant-clam':authored_clam()
    elif role in ['manta','whale','reef-shark']:fit_rig(role,rows[role])
    else:
        objects=import_donor(rows['reef-fish' if role=='grouper' else role])
        # Imported armature display widgets are not authored asset geometry.
        objects=[o for o in objects if not o.name.startswith('Icosphere')]
        o=fit_static(role,objects)
        if role in ['wreck-hull','sunken-boat']:
            fit_vessel(role,o)
            colour_static(o,role)  # Paint the new boolean-cut corners too.
        if role=='grouper':fit_grouper_mouth(o)
    meshes=visible_meshes()
    for o in meshes:
        for mod in list(o.modifiers):
            if mod.type=='SOLIDIFY':
                bpy.context.view_layer.objects.active=o
                bpy.ops.object.modifier_apply(modifier=mod.name)
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH' and o.name.startswith('Icosphere'):bpy.data.objects.remove(o,do_unlink=True)
    bpy.context.view_layer.update()
    for o in bpy.context.scene.objects:o['deep_role']=role
    scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=max([int(a.frame_range[1]) for a in bpy.data.actions]+[97])
    scene.frame_set(1)
    return visible_meshes()

def export_role(root,evidence,role,rows):
    objects=role_build(role,rows);destination=root/'public/assets/models/deep';destination.mkdir(parents=True,exist_ok=True)
    bpy.context.view_layer.update();lo,hi=bounds(objects)
    path=destination/(role+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_apply=False,export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
    # Keep only regenerable blends in ignored review evidence, not public/Git.
    bpy.ops.wm.save_as_mainfile(filepath=str(evidence/(role+'.blend')))
    data=path.read_bytes()
    import struct
    n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n])
    tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'] if p.get('mode',4)==4)
    if role=='giant-clam' and (tris>4000 or len(data)>150000):raise RuntimeError('Clam exceeds Claude final budget')
    if not g.get('meshes') or not all(math.isfinite(c) for c in [*lo,*hi]):raise RuntimeError('Invalid export '+role)
    if role in ['manta','whale'] and not g.get('animations'):raise RuntimeError('Lost source Swim clip '+role)
    if any('uri' in x and not x['uri'].startswith('data:') for x in g.get('images',[])+g.get('buffers',[])):raise RuntimeError('External runtime dependency '+role)
    return {'id':role,'path':'assets/models/deep/'+role+'.glb','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'triangles':tris,'boundsBlender':{'min':list(lo),'max':list(hi)},'dimensionsMetres':list(hi-lo),'clips':[a.get('name') for a in g.get('animations',[])],'primitives':sum(len(m['primitives']) for m in g['meshes']),'authored':role in ['moray','giant-clam']}

def main():
    a,root,evidence=arguments()
    if not (root/'docs/board/cards/DEEP-ART-SRC.md').is_file():raise RuntimeError('Not the owned game lane')
    if not (evidence.as_posix().find('/.evidence/')>=0):raise RuntimeError('Raw evidence must use ignored .evidence')
    evidence.mkdir(parents=True,exist_ok=True);rows=donors(root)
    if a.inspect:
        result=[]
        for role in ROLES:
            if role in ['moray','giant-clam'] or a.only and role!=a.only:continue
            clear();objects=import_donor(rows['reef-fish' if role=='grouper' else role]);objects=[o for o in objects if not o.name.startswith('Icosphere')]
            lo,hi=bounds(objects);result.append({'role':role,'lo':list(lo),'hi':list(hi),'objects':[o.name for o in objects]})
        (evidence/'donor-inspection.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));return
    results=[];failures=[]
    for role in ROLES:
        if a.only and a.only!=role:continue
        try:
            result=export_role(root,evidence,role,rows);results.append(result);print('FITTED',role,result['triangles'],result['bytes'])
        except Exception as e:
            import traceback;traceback.print_exc();failures.append({'id':role,'error':str(e)})
    report={'formatVersion':1,'round':2,'coordinates':'metres; glTF Y up; Blender -Y forward maps to glTF +Z','models':results,'failures':failures}
    (evidence/('fit-report-'+(a.only or 'all')+'.json')).write_text(json.dumps(report,indent=2)+'\n')
    if not a.only and not failures:(root/'public/assets/models/deep/manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    if failures:raise RuntimeError(str(failures))



if __name__=='__main__':main()
