"""Build the ten original Wasteland town homes and their review renders.

Run with Blender 4.5: blender -b --python tools/blender/town-homes.py -- --root . --render .evidence/DATE/TOWN-ART-HOMES
Footprints and coordinates are in game metres, X right, Y up, front -Z.
"""
import argparse, json, math, random, sys, struct
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--render',default='');p.add_argument('--paths-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);root=Path(a.root).resolve()
out=root/'public/assets/models/wasteland/town/homes.glb';blend=root/'art-build/town/homes.blend'
render=Path(a.render);render=render if render.is_absolute() else root/render
if a.paths_only:
    print(json.dumps({'blend':[str(blend)],'glb':[str(out)],'evidence':[str(render)] if a.render else []}));raise SystemExit(0)

import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));import town_base as town
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
out.parent.mkdir(parents=True,exist_ok=True);blend.parent.mkdir(parents=True,exist_ok=True)
texture_dir=root/'public/assets/models/wasteland/town/textures'
materials=town.make_materials({
    'galvanised-tin':str(texture_dir/'rusted-corrugated-tin.jpg'),
    'rusted-steel':str(texture_dir/'faded-yellow-steel.jpg'),
    'weathered-plank':str(texture_dir/'bleached-plank.jpg'),
    'faded-hand-paint':str(texture_dir/'faded-yellow-steel.jpg'),
    'patched-canvas':str(texture_dir/'patched-canvas.jpg'),
})
def photo_material(name, source, color=(1,1,1), metallic=0):
    image=bpy.data.images.load(str(source),check_existing=False);image.scale(192,192)
    image.filepath_raw=str(texture_dir/(name+'.jpg'));image.file_format='JPEG';image.save();image.pack()
    mat=bpy.data.materials.new('Town / '+name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Metallic'].default_value=min(metallic,.29);bsdf.inputs['Roughness'].default_value=.9
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT'
    if color!=(1,1,1):
        tint=mat.node_tree.nodes.new('ShaderNodeRGB');tint.outputs[0].default_value=(*color,1)
        multiply=mat.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
        mat.node_tree.links.new(tex.outputs['Color'],multiply.inputs[1]);mat.node_tree.links.new(tint.outputs[0],multiply.inputs[2]);mat.node_tree.links.new(multiply.outputs[0],bsdf.inputs['Base Color'])
    else:mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    return mat
mat=materials
canvas=mat['patched-canvas'];canvas_bsdf=canvas.node_tree.nodes.get('Principled BSDF')
canvas_link=next(link for link in canvas.node_tree.links if link.to_node==canvas_bsdf and link.to_socket==canvas_bsdf.inputs['Base Color'])
source_socket=canvas_link.from_socket;canvas.node_tree.links.remove(canvas_link)
canvas_tint=canvas.node_tree.nodes.new('ShaderNodeRGB');canvas_tint.outputs[0].default_value=(.72,.66,.55,1)
canvas_mix=canvas.node_tree.nodes.new('ShaderNodeMixRGB');canvas_mix.blend_type='MULTIPLY';canvas_mix.inputs[0].default_value=1
canvas.node_tree.links.new(source_socket,canvas_mix.inputs[1]);canvas.node_tree.links.new(canvas_tint.outputs[0],canvas_mix.inputs[2]);canvas.node_tree.links.new(canvas_mix.outputs[0],canvas_bsdf.inputs['Base Color'])
mat['paint-blue']=photo_material('paint-blue',texture_dir/'paint-blue.jpg',(.62,.72,.78))
mat['container-white']=photo_material('container-white',texture_dir/'container-white.jpg',(.72,.70,.63))
mat['tarp-blue']=photo_material('tarp-blue',texture_dir/'tarp-blue.jpg')
mat['red-oxide']=photo_material('red-oxide',texture_dir/'rusted-corrugated-tin.jpg',(.78,.48,.38))
mat['canvas-cream']=photo_material('canvas-cream',texture_dir/'canvas-patched-cream.jpg')
mat['canvas-tan']=photo_material('canvas-tan',texture_dir/'canvas-patched-cream.jpg',(.78,.62,.44))
mat['grey-tin']=materials['galvanised-tin']
mat['paint-yellow']=materials['faded-hand-paint']
mat['blue-painted']=mat['paint-blue']
mat['canvas-blue']=mat['tarp-blue']
for material in materials.values():
    material.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=min(
        material.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value,.29)
root_obj=bpy.data.objects.new('town-homes',None);bpy.context.collection.objects.link(root_obj)
root_obj.empty_display_type='PLAIN_AXES'
homes={}

def part(parent,obj):
    world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world
    return obj
def empty(name,parent,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=town.game_vector(loc)
    if parent:part(parent,o)
    return o
def cube(name,c,size,material,bevel=.03,parent=None):
    return part(parent,town.cube(name,c,size,material,bevel)) if parent else town.cube(name,c,size,material,bevel)
def beam(name,a,b,w,material,parent=None):
    va=town.game_vector(a);vb=town.game_vector(b);axis=(vb-va).normalized()
    ref=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0))
    side=axis.cross(ref).normalized()*(w/2);up=axis.cross(side).normalized()*(w/2)
    verts=[]
    for endpoint in (va,vb):
        verts.extend((endpoint-side-up,endpoint+side-up,endpoint+side+up,endpoint-side+up))
    # Open tube ends are hidden in joins or read as hollow salvaged steel.
    # Side faces keep full thickness while saving two end-cap triangles each.
    faces=[(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    mesh=bpy.data.meshes.new(name+' welded bar');mesh.from_pydata(verts,[],faces);mesh.update();mesh.materials.append(material)
    uv=mesh.uv_layers.new(name='physical bar UV')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            point=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(point.x/2,point.z/2)
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    return part(parent,o) if parent else o
def cylinder(name,c,r,depth,material,vertices=20,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=town.game_vector(c))
    o=bpy.context.object;o.name=name;o.data.materials.append(material);return part(parent,o) if parent else o
def sphere(name,c,scale,material,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,location=town.game_vector(c));o=bpy.context.object;o.name=name;o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(material)
    return part(parent,o) if parent else o
def lamp(home,loc):
    m=bpy.data.materials.new(home.name+' lamp amber');m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.42,.12,.018,1);bsdf.inputs['Emission Color'].default_value=(1,.30,.035,1);bsdf.inputs['Emission Strength'].default_value=2.2;bsdf.inputs['Roughness'].default_value=.42
    obj=cube(home.name+':lamp',loc,(.22,.28,.16),m,.025,home)
    return obj
tent_lining=bpy.data.materials.new('Town / canvas underside');tent_lining.use_nodes=True
lining_bsdf=tent_lining.node_tree.nodes.get('Principled BSDF');lining_bsdf.inputs['Base Color'].default_value=(.30,.21,.13,1);lining_bsdf.inputs['Roughness'].default_value=.95
def create(name,foot=(1,1)):
    h=empty(name,root_obj);homes[name]=h
    # Leave >= 0.5 m on every side inside the cell footprint.
    h['footprint_cells']=list(foot);return h
def tin_wall(name,center,width,height,material,parent,axis='x'):
    # The generated material carries the fine 100 mm corrugation at true UV
    # scale. Keep walls as one formed sheet; roof ribs use real geometry.
    x,y,z=center
    if axis=='x':points=((x-width/2,y-height/2,z),(x+width/2,y-height/2,z),
                         (x+width/2,y+height/2,z),(x-width/2,y+height/2,z))
    else:points=((x,y-height/2,z-width/2),(x,y-height/2,z+width/2),
                 (x,y+height/2,z+width/2),(x,y+height/2,z-width/2))
    verts=[town.game_vector(point) for point in points];faces=[(0,1,2,3)]
    mesh=bpy.data.meshes.new(name+' folded 100mm corrugation');mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    uv=mesh.uv_layers.new(name='real-scale 2m tiling')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(v.x/2,v.z/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);return part(parent,obj)
def fabric_surface(name,points,material,parent,reverse=False):
    mesh=bpy.data.meshes.new(name+' stitched canvas')
    if 'canvas roof' in name:
        vertices=[];faces=[];steps=8;a,b,c,d=points
        for j in range(steps+1):
            v=j/steps
            for i in range(steps+1):
                u=i/steps
                p=tuple((1-u)*(1-v)*a[k]+u*(1-v)*b[k]+u*v*c[k]+(1-u)*v*d[k] for k in range(3))
                p=(p[0],p[1]-.17*math.sin(math.pi*u)*math.sin(math.pi*v),p[2])
                vertices.append(town.game_vector(p))
        for j in range(steps):
            for i in range(steps):
                q=j*(steps+1)+i;faces.append((q,q+1,q+steps+2,q+steps+1))
        mesh.from_pydata(vertices,[],faces)
    else:
        face=tuple(reversed(range(len(points)))) if reverse else tuple(range(len(points)))
        vertices=[town.game_vector(p) for p in points];mesh.from_pydata(vertices,[],[face])
    mesh.materials.append(material);mesh.update();uv=mesh.uv_layers.new(name='canvas weave')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=vertices[mesh.loops[li].vertex_index]
            second_axis=v.y if ('canvas roof' in name or 'canvas underside' in name) else v.z
            uv.data[li].uv=(v.x/2,second_axis/2)
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    return part(parent,o)
def arched_gable(name,width,z,ridge,material,parent,opening=False):
    # A filled arched cloth end with a small curved doorway. The curved outline
    # and a slight billow keep the tent from reading as a flat sign panel.
    mesh=bpy.data.meshes.new(name+' curved canvas arch');verts=[];faces=[];nx=24;ny=12;half=width*.43
    profiles=[]
    for ix in range(nx+1):
        x=-half+2*half*ix/nx;profiles.append((x,(ridge-.22)*math.sqrt(max(0,1-(x/half)**2))))
        for iy in range(ny+1):
            y=.22+profiles[-1][1]*iy/ny;billow=.10*math.sin(math.pi*ix/nx)*math.sin(math.pi*iy/ny)
            verts.append(town.game_vector((x,y,z+billow)))
    for ix in range(nx):
        x=(profiles[ix][0]+profiles[ix+1][0])*.5;top=(profiles[ix][1]+profiles[ix+1][1])*.5
        for iy in range(ny):
            y=.22+top*(iy+.5)/ny
            doorway=1.25*math.sqrt(max(0,1-(x/.62)**2)) if opening and abs(x)<.62 else 0
            if not (opening and y-.22<doorway):
                a=ix*(ny+1)+iy;faces.append((a,a+ny+1,a+ny+2,a+1))
    mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    uv=mesh.uv_layers.new(name='arched canvas weave')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(v.x/2,v.z/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);part(parent,obj)
def arched_roof(name,width,depth,ridge,material,parent):
    mesh=bpy.data.meshes.new(name+' bowed cloth canopy');verts=[];faces=[];nx=24;nz=12;half=width*.43
    for ix in range(nx+1):
        x=-half+2*half*ix/nx;profile=(ridge-.22)*math.sqrt(max(0,1-(x/half)**2))
        for iz in range(nz+1):
            z=-depth*.4+depth*.8*iz/nz;sag=.16*math.sin(math.pi*iz/nz)*math.sqrt(max(0,1-(x/half)**2))
            verts.append(town.game_vector((x,.22+profile-sag,z)))
    for ix in range(nx):
        for iz in range(nz):
            a=ix*(nz+1)+iz;faces.append((a,a+nz+1,a+nz+2,a+1))
    mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    uv=mesh.uv_layers.new(name='arched roof weave')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(v.x/2,v.y/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);part(parent,obj)
def window(home,x,y,z,w=.58,h=.55):
    cube(home.name+' window dark glass',(x,y,z),(w,h,.055),mat['dirty-glass'],.015,home)
    for side in (-1,1):cube(home.name+' window jamb',(x+side*w*.53,y,z),(w*.12,h*1.16,.10),mat['rusted-steel'],.015,home)
    beam(home.name+' window crossbar',(x-w*.48,y,z-.055),(x+w*.48,y,z-.055),.035,mat['iron-dark'],home)
def tank(home,x,y,z,r=.48):
    base=y-.48
    for sx in (-1,1):
        for sz in (-1,1):beam(home.name+' tank stand leg',(x+sx*r*.66,base-.56,z+sz*r*.66),(x+sx*r*.66,base,z+sz*r*.66),.075,mat['iron-dark'],home)
    beam(home.name+' tank stand cross brace',(x-r*.62,base-.48,z-r*.58),(x+r*.62,base,z-r*.58),.05,mat['rusted-steel'],home)
    beam(home.name+' tank stand reverse X brace',(x+r*.62,base-.48,z-r*.58),(x-r*.62,base,z-r*.58),.05,mat['iron-dark'],home)
    beam(home.name+' tank side brace',(x-r*.62,base-.48,z+r*.58),(x+r*.62,base,z+r*.58),.05,mat['iron-dark'],home)
    cylinder(home.name+' roof water tank',(x,y,z),r,.95,mat['iron-dark'],12,home)
    cylinder(home.name+' tank top',(x,y+.49,z),r*.88,.07,mat['iron-dark'],12,home)
    for yy in (-.28,.25):cylinder(home.name+' tank band',(x,y+yy,z),r*1.03,.07,mat['iron-dark'],12,home)
    beam(home.name+' tank outlet',(x+r,y-.15,z),(x+r+.22,y-.15,z),.07,mat['iron-dark'],home)
    beam(home.name+' tank downpipe',(x+r+.22,y-.15,z),(x+r+.22,y-.4,z),.07,mat['iron-dark'],home)
def roof_dish_aerial(home,x,y,z):
    # A shallow bowl, bent support arm and thin aerial rise from the roof.
    dish=cylinder(home.name+' satellite dish bowl',(x,y,z),.52,.055,mat['galvanised-tin'],12,home)
    dish.rotation_euler[0]=-.48
    beam(home.name+' dish mount',(x,y-.34,z),(x,y-.02,z),.065,mat['rusted-steel'],home)
    beam(home.name+' dish feed arm',(x,y+.02,z-.32),(x,y+.25,z-.40),.035,mat['iron-dark'],home)
    beam(home.name+' aerial mast',(x+1.05,y-.12,z+.3),(x+1.05,y+1.12,z+.3),.035,mat['iron-dark'],home)
    beam(home.name+' aerial crossbar',(x+.75,y+.68,z+.3),(x+1.35,y+.68,z+.3),.032,mat['rusted-steel'],home)
def roof_tarp(home,x,y,z,width=2.2,depth=1.6):
    fabric_surface(home.name+' blue tarp roof',[(x-width/2,y,z-depth/2),(x+width/2,y-.08,z-depth/2),
        (x+width/2,y-.02,z+depth/2),(x-width/2,y-.06,z+depth/2)],mat['tarp-blue'],home)
    for sx in (-1,1):
        beam(home.name+' tarp tied rope',(x+sx*width*.43,y-.04,z-depth*.48),
             (x+sx*width*.52,y-.48,z-depth*.52),.022,mat['iron-dark'],home)
def roof_tyre(home,x,y,z,r=.42):
    bpy.ops.mesh.primitive_torus_add(major_radius=r*.72,minor_radius=r*.28,major_segments=12,minor_segments=6,location=town.game_vector((x,y,z)))
    obj=bpy.context.object;obj.name=home.name+' loose roof ballast tyre';obj.data.materials.append(mat['iron-dark']);part(home,obj)
def chair(home,x,y,z):
    cube(home.name+' chair seat',(x,y+.48,z),(.56,.09,.52),mat['weathered-plank'],.018,home)
    for sx in (-1,1):
        beam(home.name+' chair leg',(x+sx*.22,y,z-.18),(x+sx*.22,y+.47,z-.18),.05,mat['rusted-steel'],home)
        beam(home.name+' chair back',(x+sx*.22,y+.4,z+.20),(x+sx*.22,y+1.10,z+.20),.05,mat['weathered-plank'],home)
    cube(home.name+' chair back',(x,y+.80,z+.20),(.62,.66,.07),mat['patched-canvas'],.02,home)
def drum(home,x,y,z):
    cylinder(home.name+' cooking drum',(x,y+.48,z),.32,.90,mat['rusted-steel'],20,home)
    for yy in (.21,.75):
        bpy.ops.mesh.primitive_torus_add(major_radius=.32,minor_radius=.025,major_segments=16,minor_segments=6,location=town.game_vector((x,y+yy,z)))
        torus=bpy.context.object;torus.name=home.name+' cooking drum rolled rim';torus.data.materials.append(mat['iron-dark']);part(home,torus)
    cube(home.name+' drum stove door',(x,y+.48,z-.325),(.34,.23,.035),mat['iron-dark'],.015,home)
    beam(home.name+' drum flue',(x+.19,y+.82,z),(x+.19,y+1.32,z),.12,mat['rusted-steel'],home)
def corrugated_roof(home,width,depth,y,style='ridge',roof_material=None):
    roof_material=roof_material or mat['galvanised-tin']
    def panel(name,x0,x1,z0,z1,y0,y1,material,bend=0):
        # Folded tin has 100 mm ridges running from ridge to eave, not stripes
        # laid across the slope. The picture UV repeats at the same real scale.
        pitch=.10;segments=max(2,math.ceil((x1-x0)/pitch)*2);verts=[];faces=[]
        for iz,z in enumerate((z0,z1)):
            for ix in range(segments+1):
                x=x0+(x1-x0)*ix/segments
                fold=(.032 if ix%2==0 else -.012)
                sag=bend*math.sin(math.pi*ix/segments)
                yy=y0+(y1-y0)*(abs(z-z0)/max(.001,abs(z1-z0)))+fold+sag
                verts.append(town.game_vector((x,yy,z)))
        for ix in range(segments):faces.append((ix,ix+1,segments+2+ix,segments+1+ix))
        mesh=bpy.data.meshes.new(name+' 100mm roof ribs');mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
        uv=mesh.uv_layers.new(name='true 100mm tin scale')
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                v=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(v.x/2,v.z/2)
        obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);part(home,obj)
    if style=='shed':
        panel(home.name+' single sloping tin',-width*.52,width*.52,-depth*.51,depth*.51,y-.14,y-.52,roof_material,.08)
    else:
        for side in (-1,1):
            xsets=((-width*.52,-width*.16),(-width*.18,width*.18),(width*.15,width*.52)) if style=='bent' else ((-width*.52,width*.52),)
            for k,(x0,x1) in enumerate(xsets):
                material=roof_material if k!=1 else (mat['red-oxide'] if style=='bent' else roof_material)
                panel(home.name+f' sloped tin roof {side} panel {k+1}',x0,x1,0,side*depth*.51,y, y-.38-(.05*k),material,.04 if k==1 else 0)
        beam(home.name+' uneven ridge cap',(-width*.52,y+.02,.01),(width*.52,y-.04,.01),.06,mat['rusted-steel'],home)
        # Small off-colour repairs break the long parapet and catch rain.
        x,z=-width*.29,-depth*.34
        patch=cube(home.name+' overlapping roof repair',(x,y-.31,z),(.76,.045,.62),mat['rusted-steel'],.018,home)
        patch.rotation_euler[1]=-.035
def door(home,x,y,z,w=.88,h=1.95):
    finish=(mat['rusted-steel'],mat['paint-yellow'],mat['paint-blue'],mat['weathered-plank'],mat['red-oxide'])[
        sum(ord(char) for char in home.name)%5]
    cube(home.name+' individually patched door',(x,y+h/2,z),(w,h,.12),finish,.025,home)
    if sum(ord(char) for char in home.name)%2:
        for offset in (-.22,.22):cube(home.name+' inset door board',(x+offset,y+h*.52,z-.07),(.06,h*.78,.025),mat['weathered-plank'],.01,home)
    else:cube(home.name+' welded door plate',(x-w*.31,y+h*.57,z-.073),(w*.36,h*.34,.035),mat['rusted-steel'],.012,home)
    cube(home.name+' dark door latch',(x+w*.34,y+h*.52,z-.095),(.07,.14,.06),mat['iron-dark'],.015,home)

def lean_to(home,x,wall_z,width,depth,high,eave,material):
    outer_z=wall_z-depth
    roof=cube(home.name+' attached lean-to roof',(x,(high+eave)/2,(wall_z+outer_z)/2),
              (width,.075,depth),material,.012,home)
    roof.rotation_euler[0]=.13
    for side in (-1,1):
        px=x+side*width*.46
        beam(home.name+' lean-to support post',(px,.22,outer_z),(px,eave,outer_z),.075,mat['weathered-plank'],home)
        beam(home.name+' lean-to wall bracket',(px,high,wall_z),(px,eave,outer_z),.055,mat['rusted-steel'],home)

# TENTS: patched canvas has seams and hanging flaps, not a single primitive.
def tent_roof_panel(name,side,width,depth,ridge,material,parent):
    nx=16;ny=8;verts=[];faces=[]
    for ix in range(nx+1):
        u=ix/nx;x=-width*.43+width*.86*u
        for iy in range(ny+1):
            t=iy/ny;z=side*(.02+depth*.43*t)
            sag=.13*math.sin(math.pi*u)*math.sin(math.pi*t)+.045*math.sin(2*math.pi*u)*t
            y=ridge-.12-.80*t-sag
            verts.append(town.game_vector((x,y,z)))
    for ix in range(nx):
        for iy in range(ny):
            q=ix*(ny+1)+iy;faces.append((q,q+ny+1,q+ny+2,q+1))
    mesh=bpy.data.meshes.new(name+' sagging pitched canvas');mesh.from_pydata(verts,[],faces);mesh.materials.append(material);mesh.update()
    uv=mesh.uv_layers.new(name='canvas sewn at real scale')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            v=verts[mesh.loops[li].vertex_index];uv.data[li].uv=(v.x/2,v.z/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);part(parent,obj)

for idx,name in enumerate(('tent-a','tent-b')):
    h=create(name);w,d=5.9,5.6;ridge=2.45 if idx==0 else 2.62;polemat=mat['rusted-steel']
    # A real ridge-pole tent: straight ridge, pitched cloth, separate end posts,
    # and a low eave. The cloth hangs between frames instead of forming a barrel.
    for x in (-w*.43,w*.43):
        beam(name+' ridge end post',(x,.15,0),(x,ridge,0),.085,polemat,h)
        for side in (-1,1):beam(name+' eave post',(x,.12,side*d*.43),(x,ridge-.92,side*d*.43),.07,polemat,h)
    beam(name+' ridge pole',(-w*.45,ridge,0),(w*.45,ridge,0),.095,mat['weathered-plank'],h)
    for side in (-1,1):
        fabric=mat['canvas-cream'] if (idx+side)%2 else mat['patched-canvas']
        tent_roof_panel(name+' pitched patched canvas '+str(side),side,w,d,ridge,fabric,h)
        # Tan repair patches are stitched onto the cloth at the same slope.
        x=-1.15 if side<0 else .82
        patch=cube(name+' sewn canvas repair',(x,ridge-.43,side*1.35),(.90,.035,.72),mat['canvas-tan'],.012,h)
        patch.rotation_euler[0]=side*.31
        beam(name+' dirt weighted canvas hem',(-w*.43,.66,side*d*.43),(w*.43,.66,side*d*.43),.085,mat['canvas-tan'],h)
    for front in (-1,1):
        z=front*d*.43
        if front>0:
            end=bpy.data.meshes.new(name+' patched triangular end');end.from_pydata(
                [town.game_vector((-w*.43,.70,z)),town.game_vector((w*.43,.70,z)),town.game_vector((0,ridge-.10,z))],[],[(0,1,2)])
            end.materials.append(mat['canvas-cream']);end.update();obj=bpy.data.objects.new(name+' rear gable canvas',end);bpy.context.collection.objects.link(obj);part(h,obj)
        for i in range(11):
            x=-w*.42+i*w*.084;y=ridge-.14-.82*abs(x/(w*.43))
            if front==-1 and abs(x)<.88:continue
            beam(name+' triangular end canvas seam',(x,.75,z),(x,y,z),.025,mat['canvas-cream'],h)
        for x in (-w*.40,w*.40):
            top=ridge-.10-.82*abs(x/(w*.43))
            beam(name+' end wall canvas edge',(x,.72,z),(x,top,z),.035,mat['canvas-cream'],h)
    # The road-facing flap is tied up, showing the unlit dark interior.
    cube(name+' open tent dark interior',(0,1.05,-d*.415),(1.52,1.70,.06),mat['iron-dark'],.01,h)
    flap=cube(name+' tied-open side flap',(.02,1.82,-d*.48),(1.60,.10,.85),mat['canvas-tan'],.025,h);flap.rotation_euler[0]=-.38
    for x in (-.80,.80):
        beam(name+' flap tie cord',(x,1.76,-d*.45),(x*1.26,1.28,-d*.39),.025,mat['weathered-plank'],h)
    for x in (-w*.43,w*.43):
        for side in (-1,1):
            peg=(x*1.15,.10,side*d*.56)
            beam(name+' guy rope',(x,ridge-.08,side*.04),peg,.025,mat['iron-dark'],h)
            beam(name+' ground peg',(peg[0],.02,peg[2]),(peg[0],.22,peg[2]),.045,polemat,h)
    cube(name+' ground cloth',(0,.14,0),(w*.82,.10,d*.80),mat['canvas-tan'],.02,h)
    lean_to(h,0,-d*.43,1.55,.78,1.85,1.55,mat['canvas-tan'])
    drum(h,-.72,0,-1.82);chair(h,.82,0,-2.08);lamp(h,(-2.25,1.42,-d*.42))

# ONE-STOREY SHACKS: distinct roof lines and lean-tos, each sheet roof is formed.
for idx,name in enumerate(('shack-a','shack-b','shack-c')):
    h=create(name);w,d=6.1,5.9;wall=2.55;roof_y=3.08
    # A legible dark sill and mismatched welded frame hold the tin clear of the sand.
    for x in (-w*.44,w*.44):
        for z in (-d*.42,d*.42):beam(name+' frame post',(x,.24,z),(x,roof_y-.15,z),.105,mat['rusted-steel'] if x<0 else mat['weathered-plank'],h)
    for z in (-d*.42,d*.42):beam(name+' sill rail',(-w*.44,.3,z),(w*.44,.3,z),.12,mat['iron-dark'],h)
    facade=(mat['paint-blue'],mat['paint-yellow'],mat['grey-tin'])[idx]
    for side in (-1,1):tin_wall(name+' corrugated front-back',(0,1.5,side*d*.41),w*.90,2.48,facade if side<0 else mat['grey-tin'],h)
    for side in (-1,1):tin_wall(name+' corrugated side',(side*w*.44,1.5,0),d*.83,2.48,mat['rusted-steel'] if side>0 else mat['galvanised-tin'],h,'z')
    for px,py,pw,ph,finish,tilt in ((-2.28,1.48,1.12,1.42,'faded-hand-paint',-.08),
                                    (2.18,2.04,1.32,.83,'weathered-plank',.06),
                                    (-.95,2.26,.72,.52,'rusted-steel',-.04)):
        patch=cube(name+' overlapped salvage wall patch',(px,py,-d*.455),(pw,ph,.055),mat[finish],.018,h);patch.rotation_euler[1]=tilt
    door(h,0,.27,-d*.45);window(h,1.85,1.72,-d*.45-.04)
    # Rust falls below fasteners in visible bands; bars are deliberately irregular.
    for x,y in ((-2.7,.78),(2.62,2.30)):
        cube(name+' visible fixing',(x,y,-d*.45-.06),(.07,.07,.045),mat['iron-dark'],.02,h)
    beam(name+' welded repair seam',(-2.6,1.85,-d*.45-.08),(-2.42,1.13,-d*.45-.08),.035,mat['rusted-steel'],h)
    corrugated_roof(h,w,d,roof_y,('ridge','shed','bent')[idx],(mat['red-oxide'],mat['paint-blue'],mat['paint-yellow'])[idx])
    if idx>0:roof_tyre(h,2.18,roof_y+.03,1.42,.36)
    if idx==0:roof_tarp(h,-1.0,roof_y+.18,.9,1.7,1.15)
    elif idx==1:roof_dish_aerial(h,1.15,roof_y+.05,.65)
    else:roof_tarp(h,1.25,roof_y+.18,-.75,1.55,1.1)
    if idx==0:
        roof_dish_aerial(h,1.15,roof_y+.05,.65);cube(name+' chimney collar',(2.3,3.2,.9),(.48,.24,.48),mat['iron-dark'],.03,h);cylinder(name+' stove vent',(2.3,3.54,.9),.11,.54,mat['rusted-steel'],12,h)
    elif idx==1:
        # low lean-to awning ties into the wall with real braces
        for x in (-3.08,-1.68):beam(name+' lean-to post',(x,.18,-3.05),(x,1.92,-3.05),.075,mat['weathered-plank'],h)
        awning=cube(name+' lean-to sheet',(-2.38,2.0,-2.75),(2.1,.07,1.45),mat['rusted-steel'],.02,h);awning.rotation_euler[0]=.16
        for x in (-3.08,-1.68):beam(name+' awning brace',(x,1.86,-3.02),(x,2.48,-2.25),.055,mat['iron-dark'],h)
    else:
        # leaning wall extension and two unequal patched plates
        panel=cube(name+' attached sloped lean',(2.7,1.35,-.1),(1.15,2.18,4.2),mat['rusted-steel'],.035,h);panel.rotation_euler[2]=.09
        for x in (-2.0,-.2,1.9):cube(name+' roof scrap patch',(x,3.31,.5),(.58,.04,.77),mat['faded-hand-paint'],.015,h)
        # A low salvaged porch awning makes this entry distinct from the roofed lean-to.
        for x in (1.65,3.15):beam(name+' porch awning post',(x,.18,-3.15),(x,2.05,-3.15),.07,mat['weathered-plank'],h)
        awning=cube(name+' porch awning',(2.40,2.10,-2.78),(2.08,.08,1.2),mat['rusted-steel'],.025,h);awning.rotation_euler[0]=.12
    if idx==0:lean_to(h,2.12,-d*.41,1.45,.78,1.85,1.52,mat['red-oxide'])
    lamp(h,(-2.75,2.18,-d*.46))

# STACKS: scaffold frame, accessible ladder, wash line and roof tanks distinguish tiers.
for idx,name in enumerate(('stack-a','stack-b')):
    h=create(name);w,d=6.75,6.75;floors=idx+2;storey=2.35;ground=.32
    for floor in range(floors):
        base=ground+floor*(storey+.25);top=base+storey
        offset=.12*(-1 if floor%2 else 1)
        for x in (-w*.43,w*.43):
            for z in (-d*.40,d*.40):beam(name+' scaffold post',(x+offset,ground,z),(x+offset,top+.18,z),.14,mat['rusted-steel'],h)
        for z in (-d*.40,d*.40):
            beam(name+' scaffold rail',( -w*.46,base+.48,z),(w*.46,base+.48,z),.08,mat['iron-dark'],h)
            beam(name+' diagonal brace',(-w*.42,base+.42,z),(w*.42,top-.08,z),.07,mat['rusted-steel'],h)
            beam(name+' crossed scaffold brace',(w*.42,base+.42,z),(-w*.42,top-.08,z),.07,mat['iron-dark'],h)
        # tin room is a rectangle with cutout dark window and a visible repair panel
        finish=(mat['paint-blue'],mat['paint-yellow'])[idx]
        for side in (-1,1):tin_wall(name+f' floor {floor+1} front back',(offset,base+1.28,side*d*.40),w*.84,2.20,finish if side<0 else mat['grey-tin'],h)
        for side in (-1,1):tin_wall(name+f' floor {floor+1} side',(offset+side*w*.43,base+1.28,0),d*.79,2.20,mat['galvanised-tin'],h,'z')
        cube(name+' thick load deck',(offset,base+.10,0),(w-.08,.30,d-.08),mat['weathered-plank'],.025,h)
        door(h,offset-.60,base+.19,-d*.42-.04,.86,1.98);window(h,offset+1.7,base+1.55,-d*.43-.07,.53,.5)
    # Long ladder with rails and ten or fourteen welded rungs.
    for x in (2.48,3.15):beam(name+' ladder rail',(x,.22,-3.05),(x,ground+floors*(storey+.25)+.55,-3.05),.07,mat['rusted-steel'],h)
    for r in range(floors*5+1):beam(name+' ladder rung',(2.48,.37+r*.49,-3.10),(3.15,.37+r*.49,-3.10),.06,mat['iron-dark'],h)
    # washing line and heavy mismatched cloth patches above the alley side.
    clothes_y=ground+floors*(storey+.25)+.17
    beam(name+' laundry wire',(-3.15,clothes_y,2.45),(-.5,clothes_y+.09,2.45),.024,mat['iron-dark'],h)
    for j in range(4 if idx==0 else 2):
        x=-2.8+j*.58;cube(name+' hanging laundry',(x,clothes_y-.4,2.45),(.48,.74,.035),mat[('patched-canvas','faded-hand-paint','rusted-steel','weathered-plank')[j]],.012,h)
    corrugated_roof(h,w*.94,d*.94,clothes_y-.04,'bent' if idx==0 else 'ridge',mat['paint-blue'] if idx==0 else mat['red-oxide'])
    if idx==0:
        roof_tyre(h,.65,clothes_y-.08,1.85,.38)
    else:
        # The line ends at the plot edge; in the street it hangs between homes.
        beam(name+' line anchor mast',(3.20,clothes_y-.35,2.42),(3.20,clothes_y+.25,2.42),.04,mat['iron-dark'],h)
        beam(name+' line wire',(3.20,clothes_y+.23,2.42),(3.48,clothes_y+.20,2.42),.022,mat['iron-dark'],h)
    lean_to(h,offset-.60,-d*.40,1.65,.72,2.12,1.78,mat['rusted-steel'] if idx==0 else mat['faded-hand-paint'])
    lamp(h,(-2.7,ground+1.8,-d*.43))

# BLOCKS: paired two-storey containers with ribbed corrugation, stairs and roof tyres.
for idx,name in enumerate(('block-a','block-b')):
    h=create(name,(2,2));
    # 7.25 x 6.7 m modules sit inside a 2x2 cell footprint with >0.5m clearance.
    # Keep every container, stair and roof garden inside its 8 m grid plot.
    xoff=(-.68 if idx==0 else -.35);zoff=(.42 if idx==0 else -.52)
    for floor in range(2):
        bx=xoff+(.22 if floor==1 else 0);bz=zoff+(.44 if floor==1 else -.22);base=.25+floor*2.68
        bw,bd=7.15,6.4
        for sx in (-1,1):
            for sz in (-1,1):beam(name+' container corner cast',(bx+sx*bw*.48,base+.12,bz+sz*bd*.48),(bx+sx*bw*.48,base+2.48,bz+sz*bd*.48),.15,mat['rusted-steel'],h)
        container_finish=(mat['container-white'],mat['red-oxide'])[idx]
        for side in (-1,1):tin_wall(name+' cut-side container',(bx,base+1.33,bz+side*bd*.48),bw*.94,2.20,container_finish if side<0 else mat['grey-tin'],h)
        for side in (-1,1):tin_wall(name+' container end',(bx+side*bw*.48,base+1.33,bz),bd*.90,2.20,mat['paint-blue'] if idx==0 else mat['paint-yellow'],h,'z')
        # Heavy corner castings, top edge rails and closure rods make a real container silhouette.
        for z in (-bd*.48,bd*.48):beam(name+' top edge rail',(bx-bw*.50,base+2.48,bz+z),(bx+bw*.50,base+2.48,bz+z),.12,mat['iron-dark'],h)
        if floor==0:
            # The next room sits on a braced deck carried by the lower box frame.
            cube(name+' upper floor thick steel deck',(bx,3.00,bz),(bw,.24,bd),mat['rusted-steel'],.035,h)
            for sx in (-1,1):
                for sz in (-1,1):beam(name+' deck bearing post',(bx+sx*bw*.47,2.44,bz+sz*bd*.47),(bx+sx*bw*.47,3.12,bz+sz*bd*.47),.17,mat['iron-dark'],h)
            for z in (-bd*.47,bd*.47):
                beam(name+' lower X brace one',(bx-bw*.46,2.48,bz+z),(bx+bw*.46,3.06,bz+z),.10,mat['rusted-steel'],h)
                beam(name+' lower X brace two',(bx+bw*.46,2.48,bz+z),(bx-bw*.46,3.06,bz+z),.10,mat['iron-dark'],h)
        for r in range(18):
            x=bx-bw*.46+r*bw*.92/17
            if r%6==0:beam(name+' container rust seam',(x,base+.25,bz-bd*.50-.06),(x,base+2.40,bz-bd*.50-.06),.035,mat['rusted-steel'],h)
        # Windows appear cut into the upper road-facing wall with steel lintels.
        if floor==1:
            for wx in (bx-1.7,bx+.65):
                cube(name+' cut window',(wx,base+1.44,bz-bd*.50-.05),(.82,.72,.07),mat['dirty-glass'],.018,h)
                cube(name+' window lintel',(wx,base+1.84,bz-bd*.50-.11),(.98,.09,.10),mat['rusted-steel'],.02,h)
                beam(name+' window grille',(wx,base+1.1,bz-bd*.50-.11),(wx,base+1.78,bz-bd*.50-.11),.035,mat['iron-dark'],h)
        else:
            door(h,bx+.4,base+.2,bz-bd*.50-.09,.90,1.95)
    # Old tyres weight the roof sheet; sparse dirt sits inside the black rubber.
    for x,z in (((-2.1,-1.35),(2.05,-1.35)) if idx==0 else ((-.35,-1.2),)):
        center=(x+xoff+.22,5.35,z+zoff+.44)
        bpy.ops.mesh.primitive_torus_add(major_radius=.47,minor_radius=.17,major_segments=20,minor_segments=8,location=town.game_vector(center))
        tire=bpy.context.object;tire.name=name+' roof garden tyre';tire.data.materials.append(mat['iron-dark']);part(h,tire)
        cylinder(name+' tyre soil',(center[0],center[1]+.11,center[2]),.34,.11,mat['sand'],16,h)
        for b in range(2):
            angle=b*math.pi;x1=center[0]+math.cos(angle)*.13;z1=center[2]+math.sin(angle)*.13
            top_x=x1+math.cos(angle)*.20;top_z=z1+math.sin(angle)*.20
            beam(name+' low roof garden scrub',(x1,center[1]+.16,z1),(top_x,center[1]+.38,top_z),.035,mat['weathered-plank'],h)
    beam(name+' roof catchment gutter',(xoff-3.1,5.28,zoff+3.17),(xoff+3.1,5.28,zoff+3.17),.085,mat['rusted-steel'],h)
    beam(name+' roof catchment downpipe',(xoff+2.8,5.25,zoff+3.17),(xoff+2.8,.42,zoff+3.17),.075,mat['iron-dark'],h)
    corrugated_roof(h,7.05,6.42,5.43,'bent',mat['paint-blue'] if idx==0 else mat['red-oxide'])
    # Exterior stairs have steel stringers, handrails and a landing at the upper door.
    for i in range(9):
        t=i/8;y=.34+t*2.68;x=2.10-t*2.20;z=-3.10
        cube(name+' steel stair tread',(x,y,z),(.93,.105,.56),mat['rusted-steel'],.025,h)
    for side in (-1,1):
        beam(name+' stair steel stringer',(2.55,.30,-3.10),(-.28,3.05,-3.10),.11,mat['iron-dark'],h)
        for i in range(9):
            t=i/8;x=2.55-t*2.83;rail_y=.65+t*2.68+side*.34
            beam(name+' stair handrail post',(x,.38+t*2.68,-3.10+side*.38),(x,rail_y,-3.10+side*.38),.06,mat['rusted-steel'],h)
        beam(name+' stair handrail',(2.55,.98,-3.10+side*.38),(-.28,3.66,-3.10+side*.38),.06,mat['rusted-steel'],h)
    cube(name+' upper door landing',(-.08,3.22,-2.72),(1.55,.22,1.05),mat['weathered-plank'],.025,h)
    for side in (-1,1):beam(name+' landing rail',(-.78,3.33,-3.22),(.62,3.33,-3.22),.055,mat['iron-dark'],h)
    if idx==0:tank(h,xoff-2.48,5.80,zoff+1.90,.56);roof_tyre(h,xoff+1.8,5.52,zoff+1.3,.36)
    else:roof_dish_aerial(h,xoff+1.20,5.48,zoff-1.85);roof_tyre(h,xoff-2.1,5.52,zoff+1.2,.38)
    lean_to(h,bx-2.65,bz-bd*.48-.02,1.45,.85,2.02,1.68,mat['rusted-steel'] if idx==0 else mat['red-oxide'])
    lamp(h,(xoff+2.65,2.15,zoff-3.38))

# TERRACE: broad brick and steel house, shutters, real porch and an asymmetrical hip roof.
h=create('terrace-a',(2,1));w,d=13.9,5.8
cube(h.name+' brick plinth',(0,.33,0),(w,.62,d),mat['salvaged-brick'],.08,h)
for z in (-d*.48,d*.48):
    for y in (.75,1.34,1.93,2.52):
        for i in range(13):
            x=-w*.47+i*w*.078+(0 if int(y*10)%2 else .21)
            if abs(x)>w*.49:continue
            cube(h.name+' hand-set brick',(x,y,z),(.88,.46,.12),mat['salvaged-brick'] if i%4 else mat['rusted-steel'],.025,h)
for side in (-1,1):
    for y in (.9,1.72,2.54):
        for i in range(6):cube(h.name+' side brick',(side*w*.48,y,-d*.42+i*d*.168),(.12,.65,.94),mat['salvaged-brick'],.025,h)
door(h,0,.62,-d*.51,.96,2.0)
for x in (-4.5,-1.9,2.0,5.1):
    window(h,x,1.9,-d*.51-.04,.91,.9)
    for s in (-1,1):
        sh=cube(h.name+' steel shutter',(x+s*.62,1.9,-d*.52),(.28,1.05,.11),mat['rusted-steel'],.03,h);sh.rotation_euler[1]=s*.06
        for yy in (1.52,1.9,2.28):beam(h.name+' shutter horizontal rib',(x+s*.72,yy,-d*.59),(x+s*.52,yy,-d*.59),.035,mat['iron-dark'],h)
for x in (-5.6,-3.4,3.4,5.6):beam(h.name+' porch column',(x,.55,-d*.46),(x,2.57,-d*.46),.16,mat['weathered-plank'],h)
cube(h.name+' porch deck',(0,.64,-d*.54),(w*.82,.18,.70),mat['weathered-plank'],.03,h)
corrugated_roof(h,w,d,3.5,'bent',mat['paint-blue'])
for x,z in ((-5,-1.4),(-1.8,1.3),(2.7,-1.0),(5.4,1.45)):
    cube(h.name+' roof patch',(x,3.33,z),(.82,.055,.68),mat['rusted-steel'],.02,h)
flap=cube(h.name+' bent roof edge salvage',(4.7,3.43,.15),(1.25,.08,.34),mat['rusted-steel'],.02,h);flap.rotation_euler[1]=-.16
for side in (-1,1):beam(h.name+' roof ridge seam',(-w*.53,3.34,side*.05),(w*.53,3.34,side*.05),.065,mat['rusted-steel'],h)
tank(h,-5.4,3.55,1.45,.53);roof_dish_aerial(h,1.9,3.5,-1.2);roof_tarp(h,1.0,3.35,1.15,2.1,1.25);lamp(h,(-.58,1.95,-d*.55))

# Stay clear of the game grid at every point; homes are centered on their plots.
for name,h in homes.items():
    footprint=h.get('footprint_cells');assert footprint,name
    extents=[8*footprint[0]/2-.5,8*footprint[1]/2-.5]
    points=[]
    for obj in h.children_recursive:
        if obj.type!='MESH':continue
        points.extend((obj.matrix_world @ Vector(corner),obj.name) for corner in obj.bound_box)
    assert points,(name,'has no mesh geometry')
    min_x=min(points,key=lambda item:item[0].x);max_x=max(points,key=lambda item:item[0].x)
    min_z=min(points,key=lambda item:-item[0].y);max_z=max(points,key=lambda item:-item[0].y)
    assert max(abs(min_x[0].x),abs(max_x[0].x))<=extents[0]+1e-4,(name,'width',min_x[0].x,min_x[1],max_x[0].x,max_x[1],extents[0])
    assert max(abs(-min_z[0].y),abs(-max_z[0].y))<=extents[1]+1e-4,(name,'depth',-min_z[0].y,min_z[1],-max_z[0].y,max_z[1],extents[1])

def merge_surfaces():
    # Leave each home and each emissive lamp named, but join like-finish static parts
    # within that home to keep the GLB compact. Semantic home parents remain stable.
    edge_detail=('roof','door','awning','lean-to','shutter','porch')
    for name,h in homes.items():
        groups={}
        for obj in list(h.children_recursive):
            if obj.type!='MESH' or obj.name==name+':lamp':continue
            # Bevel and normal modifiers are applied before joining so authored
            # roof and entry edges survive in glTF. Small repeated salvage
            # plates stay sharp so they do not consume the per-plot budget.
            for mod in list(obj.modifiers):
                bpy.context.view_layer.objects.active=obj
                if mod.type=='BEVEL' and any(token in obj.name.casefold() for token in edge_detail):
                    bpy.ops.object.modifier_apply(modifier=mod.name)
                else:obj.modifiers.remove(mod)
            key=obj.data.materials[0].name if obj.data.materials else 'unpainted';groups.setdefault(key,[]).append(obj)
        for key,objs in groups.items():
            if len(objs)<2:continue
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objs:obj.select_set(True)
            active=objs[0];bpy.context.view_layer.objects.active=active;bpy.ops.object.join()
            active.name=name+' surface '+key.split('/')[-1].strip().replace(' ','-')
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.remove_doubles(threshold=.0001);bpy.ops.object.mode_set(mode='OBJECT')

merge_surfaces()
# Separate repeating pictures keep glTF materials game-safe; 256 px covers
# 2 m per repeat, which still resolves the 100 mm metal ribs and paint chips.
for image in list(bpy.data.images):
    if image.source=='FILE' and max(image.size)>256:
        image.scale(256,256)
        image.pack()
bpy.ops.object.select_all(action='DESELECT');root_obj.select_set(True)
for h in homes.values():
    h.select_set(True)
    for child in h.children_recursive:child.select_set(True)
for obj in list(bpy.context.scene.objects):
    if obj.type=='LIGHT':bpy.data.objects.remove(obj,do_unlink=True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
town.export_glb(out)
blob=out.read_bytes();json_len=struct.unpack_from('<I',blob,12)[0];gltf=json.loads(blob[20:20+json_len])
tris=sum(gltf['accessors'][prim['indices']]['count']//3 for mesh in gltf.get('meshes',[]) for prim in mesh['primitives'])
node_names={node.get('name') for node in gltf.get('nodes',[])}
for name in homes:
    assert name in node_names and name+':lamp' in node_names,(name,'missing exported node')
assert tris<60000,f'{tris} triangles exceeds family limit';assert out.stat().st_size<=3_000_000,f'{out.stat().st_size} exceeds 3 MB'
if a.render:
    # Judge exactly what the game receives: discard the construction scene,
    # import the exported GLB into a new empty scene, then render that model.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(out))
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
    scene.render.resolution_x=960;scene.render.resolution_y=680;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0
    scene.world=bpy.data.worlds.new('Plain overcast daylight');scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(.64,.63,.60,1);bg.inputs['Strength'].default_value=.82
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.06));ground=bpy.context.object;ground.name='render-only midtone ground'
    ground_mat=bpy.data.materials.new('render-only neutral ground');ground_mat.diffuse_color=(.32,.30,.27,1);ground_mat.use_nodes=True
    ground_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.32,.30,.27,1)
    ground_mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95;ground.data.materials.append(ground_mat)
    for loc,power,size in [((0,72,8),42000,90),((-55,60,40),28000,85),((55,60,-30),28000,85)]:
        bpy.ops.object.light_add(type='AREA',location=town.game_vector(loc));light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.data.use_shadow=False
        light.rotation_euler=(town.game_vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
    camdata=bpy.data.cameras.new('fresh-scene review camera');cam=bpy.data.objects.new('fresh-scene review camera',camdata);scene.collection.objects.link(cam);scene.camera=cam
    def aim(loc,target,lens):
        cam.location=town.game_vector(loc);cam.data.lens=lens
        cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    by_name={obj.name:obj for obj in scene.objects if obj.type=='EMPTY'}
    homes_loaded={name:by_name[name] for name in homes}
    render.mkdir(parents=True,exist_ok=True)
    for name,h in homes_loaded.items():
        for other in homes_loaded.values():
            visible=other==h;other.hide_render=not visible
            for child in other.children_recursive:child.hide_render=not visible
        footprint=h.get('footprint_cells',[1,1]);span=max(footprint)*8-1
        height={'tent-a':3.2,'tent-b':3.4,'shack-a':3.9,'shack-b':3.9,'shack-c':4.1,
                'stack-a':5.8,'stack-b':8.2,'block-a':5.9,'block-b':5.9,'terrace-a':4.0}[name]
        distance=max(span,height)*1.72;target=(0,height*.52,0)
        loc=(distance*.60,target[1]+distance*.85,-distance*.60)
        aim(loc,target,52);scene.render.filepath=str(render/f'{name}-above-45.png');bpy.ops.render.render(write_still=True)
    for i,(name,h) in enumerate(homes_loaded.items()):h.location=town.game_vector((-39.6+8.8*i,0,0))
    for h in homes_loaded.values():
        h.hide_render=False
        for child in h.children_recursive:child.hide_render=False
    aim((0,54,-76),(0,2,0),28);scene.render.resolution_x=1800;scene.render.resolution_y=600;scene.render.filepath=str(render/'street-overhead.png');bpy.ops.render.render(write_still=True)
    aim((0,8,-82),(0,3,0),28);scene.render.filepath=str(render/'street-road.png');bpy.ops.render.render(write_still=True)
print(json.dumps({'glb':str(out),'triangles':tris,'bytes':out.stat().st_size,'nodes':sorted(node_names),'render':str(render) if a.render else None}))
