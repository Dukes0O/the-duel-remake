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
canvas_bsdf=materials['patched-canvas'].node_tree.nodes.get('Principled BSDF')
atlas=bpy.data.images.get('Scablands shared town wear atlas 1K')
# Keep the photo's corrosion and rivets, but bring its clean steel base into
# the warmer, darker range of the accepted Scablands town materials.
import numpy as np
pixels=np.empty(1024*1024*4,dtype=np.float32);atlas.pixels.foreach_get(pixels)
pixels=pixels.reshape((1024,1024,4));pixels[:256,256:512,:3]*=np.array([1.22,1.18,1.08],dtype=np.float32)[None,None,:]
pixels[:256,:256,:3]*=np.array([.62,.61,.58],dtype=np.float32)[None,None,:]
pixels[:256,512:768,:3]*=np.array([.42,.42,.40],dtype=np.float32)[None,None,:]
yellow=pixels[256:512,768:1024,:3].copy();luma=yellow[:,:,0:1]*.30+yellow[:,:,1:2]*.59+yellow[:,:,2:3]*.11
pixels[256:512,768:1024,:3]=np.clip(yellow*.45+luma*.55,0,1)
# Darken the canvas swatch so desert light does not wash the tents to cream.
pixels[:256,768:1024,:3]*=np.array([.72,.70,.67],dtype=np.float32)[None,None,:]
atlas.pixels.foreach_set(pixels.reshape(-1))
atlas.filepath_raw=str(root/'.qa-dist/town-homes-atlas.jpg');atlas.file_format='JPEG';atlas.save();atlas.pack()
mat=materials
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
    faces=[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
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
    # The atlas carries 100 mm pressed ridges; a shallow, UV-mapped box gives
    # each panel edge thickness and exports with the same stable town mapping.
    size=(width,height,.08) if axis=='x' else (.08,height,width)
    return cube(name,center,size,material,.012,parent)
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
def window(home,x,y,z,w=.58,h=.55):
    cube(home.name+' window dark glass',(x,y,z),(w,h,.055),mat['dirty-glass'],.015,home)
    for side in (-1,1):cube(home.name+' window jamb',(x+side*w*.53,y,z),(w*.12,h*1.16,.10),mat['rusted-steel'],.015,home)
    beam(home.name+' window crossbar',(x-w*.48,y,z-.055),(x+w*.48,y,z-.055),.035,mat['iron-dark'],home)
def tank(home,x,y,z,r=.48):
    cylinder(home.name+' roof water tank',(x,y,z),r,.95,mat['rusted-steel'],24,home)
    cylinder(home.name+' tank top',(x,y+.49,z),r*.88,.07,mat['galvanised-tin'],24,home)
    for yy in (-.28,.25):cylinder(home.name+' tank band',(x,y+yy,z),r*1.03,.07,mat['iron-dark'],24,home)
    beam(home.name+' tank outlet',(x+r,y-.15,z),(x+r+.22,y-.15,z),.07,mat['iron-dark'],home)
    beam(home.name+' tank downpipe',(x+r+.22,y-.15,z),(x+r+.22,y-.4,z),.07,mat['iron-dark'],home)
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
def corrugated_roof(home,width,depth,y,style='ridge'):
    x=z=0
    if style=='ridge':
        for s in (-1,1):
            panel=cube(home.name+' roof leaf '+str(s),(0,y-.28,s*depth*.22),(width*1.08,.09,depth*.60),mat['galvanised-tin'],.02,home);panel.rotation_euler[0]=s*.22
            for i in range(3):cube(home.name+' rust patch '+str(s)+' '+str(i),(x+(i-1)*width*.28,y-.22,s*depth*.26),(.52,.035,.48),mat['rusted-steel'] if (i+s)%2 else mat['faded-hand-paint'],.01,home)
        beam(home.name+' roof ridge weld',(-width*.55,y,0),(width*.55,y,0),.055,mat['rusted-steel'],home)
    elif style=='shed':
        panel=cube(home.name+' sloping single roof',(0,y-.15,.06),(width*1.13,.10,depth*1.16),mat['galvanised-tin'],.025,home);panel.rotation_euler[0]=.18
        for i in range(4):beam(home.name+' folded roof hem',(-width*.5+i*width/3,y+.01,-depth*.5),(-width*.5+i*width/3,y-.29,depth*.5),.03,mat['rusted-steel'] if i==0 else mat['iron-dark'],home)
        cube(home.name+' roof salvage patch',(-width*.27,y-.2,depth*.24),(1.0,.05,.72),mat['rusted-steel'],.02,home)
    else:
        for s in (-1,1):
            panel=cube(home.name+' bent roof panel '+str(s),(s*width*.20,y-.24,s*depth*.17),(width*.62,.08,depth*.62),mat['galvanised-tin'],.018,home);panel.rotation_euler[0]=s*.31;panel.rotation_euler[1]=(-1 if s<0 else 1)*.08
        cube(home.name+' roof hole dark patch',(width*.26,y-.32,-depth*.22),(.68,.035,.62),mat['iron-dark'],.01,home)
        beam(home.name+' raised torn seam',(-width*.51,y+.1,0),(width*.51,y-.05,0),.07,mat['rusted-steel'],home)
def door(home,x,y,z,w=.88,h=1.95):
    cube(home.name+' patched door',(x,y+h/2,z),(w,h,.11),mat['weathered-plank'],.025,home)
    cube(home.name+' welded door plate',(x-w*.31,y+h*.57,z-.065),(w*.36,h*.34,.035),mat['rusted-steel'],.012,home)
    cube(home.name+' latch',(x+w*.34,y+h*.52,z-.09),(.07,.14,.06),mat['galvanised-tin'],.015,home)

# TENTS: patched canvas has seams and hanging flaps, not a single primitive.
for idx,name in enumerate(('tent-a','tent-b')):
    h=create(name);w,d=5.9,5.6;ridge=2.65 if idx==0 else 3.0
    for x in (-w*.43,w*.43):
        for z in (-d*.4,d*.4):beam(name+' forked pole',(x,0,z),(x,.18,z),.09,mat['weathered-plank'],h);beam(name+' pole',(x,.18,z),(x,ridge*.73,z),.075,mat['rusted-steel'],h)
    beam(name+' ridge pole',(-w*.43,ridge,0),(w*.43,ridge,0),.09,mat['weathered-plank'],h)
    for s in (-1,1):
        # A peaked end and two broad slopes make a complete tent, not open
        # frames with fabric only across the ends.
        if s<0:
            # Leave a broad road-facing opening so the cooking drum and chair
            # read as lived-in props instead of disappearing behind canvas.
            fabric_surface(name+' left door flap',[(-w*.43,.22,s*d*.4),(-1.4,.22,s*d*.4),(-1.4,1.8,s*d*.4),(0,ridge,s*d*.4)],mat['patched-canvas'],h)
            fabric_surface(name+' right door flap',[(1.4,.22,s*d*.4),(w*.43,.22,s*d*.4),(0,ridge,s*d*.4),(1.4,1.8,s*d*.4)],mat['patched-canvas'],h)
            fabric_surface(name+' gable header',[(-1.4,1.8,s*d*.4),(1.4,1.8,s*d*.4),(0,ridge,s*d*.4)],mat['patched-canvas'],h)
        else:
            fabric_surface(name+' canvas gable '+str(s),[(-w*.43,.22,s*d*.4),(w*.43,.22,s*d*.4),(0,ridge,s*d*.4)],mat['patched-canvas'],h)
        roof_points=[(-w*.43,ridge,0),(w*.43,ridge,0),(w*.43,.22,s*d*.4),(-w*.43,.22,s*d*.4)]
        fabric_surface(name+' canvas roof '+str(s),roof_points,mat['patched-canvas'],h)
        inner_points=[(x,y-.025,z) for x,y,z in roof_points]
        fabric_surface(name+' canvas underside '+str(s),inner_points,tent_lining,h,reverse=True)
        # patched canvas rectangles and stitched rope lacing
        if s>0:
            for j in range(3):cube(name+' canvas repair',( (-1+j)*w*.24,.83+(j%2)*.52,s*d*.405),(1.03,.57,.035),mat['faded-hand-paint'] if (idx+j)%2==0 else mat['rusted-steel'],.012,h)
        for j,t in enumerate((.20,.42,.65)):
            x=(-.58+j*.58)*w*.34;lo=t;hi=t+.16
            def slope_point(px,step):return (px,ridge*(1-step)+.22*step+.024,s*d*.4*step)
            patch_material=mat['faded-hand-paint'] if (j+idx)%2==0 else mat['rusted-steel']
            fabric_surface(name+' sloped canvas repair',[
                slope_point(x-.38,lo),slope_point(x+.38,lo),slope_point(x+.38,hi),slope_point(x-.38,hi)],patch_material,h)
        for j in range(7):beam(name+' guy line',(s*w*.43,.16,s*d*.4),(s*w*.43+(.75 if j%2 else -.6),.08+j*.018,s*d*.4+(j-3)*.24),.022,mat['iron-dark'],h)
    for x,z in ((-w*.43,-d*.44),(w*.43,-d*.44),(-w*.43,d*.44),(w*.43,d*.44)):
        beam(name+' tied guy rope',(x,ridge*.73,z),(x*1.12,.12,z*1.12),.035,mat['iron-dark'],h)
        cube(name+' rope ground stake',(x*1.12,.12,z*1.12),(.12,.24,.12),mat['rusted-steel'],.02,h)
    cube(name+' ground tarp',(0,.13,0),(w,.12,d),mat['patched-canvas'],.02,h)
    for x in (-w*.28,w*.28):beam(name+' tarp stake',(x,.15,d*.44),(x,.05,d*.58),.045,mat['rusted-steel'],h)
    drum(h,-.72,0,-1.82);chair(h,.82,0,-2.08);lamp(h,(-2.25,1.42,-d*.42))
    # Sewn canvas repairs on the street-facing gable break up the broad flap.
    patch_y=1.08 if idx==0 else 1.28
    cube(name+' entrance canvas patch',(2.02,patch_y,-d*.405),(.72,.38,.045),
         mat['faded-hand-paint'] if idx==0 else mat['rusted-steel'],.025,h)
    beam(name+' flap patch seam',(1.58,patch_y-.25,-d*.414),(2.46,patch_y-.25,-d*.414),.026,mat['weathered-plank'],h)

# ONE-STOREY SHACKS: distinct roof lines and lean-tos, each sheet roof is formed.
for idx,name in enumerate(('shack-a','shack-b','shack-c')):
    h=create(name);w,d=6.1,5.9;wall=2.55;roof_y=3.08
    # A legible dark sill and mismatched welded frame hold the tin clear of the sand.
    for x in (-w*.44,w*.44):
        for z in (-d*.42,d*.42):beam(name+' frame post',(x,.24,z),(x,roof_y-.15,z),.105,mat['rusted-steel'] if x<0 else mat['weathered-plank'],h)
    for z in (-d*.42,d*.42):beam(name+' sill rail',(-w*.44,.3,z),(w*.44,.3,z),.12,mat['iron-dark'],h)
    for side in (-1,1):tin_wall(name+' corrugated front-back',(0,1.5,side*d*.41),w*.90,2.48,mat['galvanised-tin'],h)
    for side in (-1,1):tin_wall(name+' corrugated side',(side*w*.44,1.5,0),d*.83,2.48,mat['rusted-steel'] if side>0 else mat['galvanised-tin'],h,'z')
    for px,py,pw,ph,finish,tilt in ((-2.28,1.48,1.12,1.42,'faded-hand-paint',-.08),
                                    (2.18,2.04,1.32,.83,'weathered-plank',.06),
                                    (-.95,2.26,.72,.52,'rusted-steel',-.04)):
        patch=cube(name+' overlapped salvage wall patch',(px,py,-d*.455),(pw,ph,.055),mat[finish],.018,h);patch.rotation_euler[1]=tilt
    door(h,0,.27,-d*.45);window(h,1.85,1.72,-d*.45-.04)
    # Rust falls below fasteners in visible bands; bars are deliberately irregular.
    for x in (-2.7,-1.05,1.24,2.62):
        for y in (.78,1.96,2.61):cube(name+' visible fixing',(x,y,-d*.45-.06),(.07,.07,.045),mat['iron-dark'],.02,h)
    for x in (-2.6,-.45,2.42):beam(name+' welded repair seam',(x,1.85,-d*.45-.08),(x+.18,1.13,-d*.45-.08),.035,mat['rusted-steel'],h)
    corrugated_roof(h,w,d,roof_y,('ridge','shed','bent')[idx])
    if idx==0:
        tank(h,-2.12,3.48,1.42,.40);cube(name+' chimney collar',(2.3,3.2,.9),(.48,.24,.48),mat['iron-dark'],.03,h);cylinder(name+' stove vent',(2.3,3.54,.9),.11,.54,mat['rusted-steel'],12,h)
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
        # tin room is a rectangle with cutout dark window and a visible repair panel
        for side in (-1,1):tin_wall(name+f' floor {floor+1} front back',(offset,base+1.28,side*d*.40),w*.84,2.20,mat['galvanised-tin'] if (floor+side)%2 else mat['rusted-steel'],h)
        for side in (-1,1):tin_wall(name+f' floor {floor+1} side',(offset+side*w*.43,base+1.28,0),d*.79,2.20,mat['galvanised-tin'],h,'z')
        cube(name+' floor landing',(offset,base+.16,0),(w-.08,.18,d-.08),mat['weathered-plank'],.02,h)
        door(h,offset-.60,base+.19,-d*.42-.04,.86,1.98);window(h,offset+1.7,base+1.55,-d*.43-.07,.53,.5)
    # Long ladder with rails and ten or fourteen welded rungs.
    for x in (2.48,3.15):beam(name+' ladder rail',(x,.22,-3.05),(x,ground+floors*(storey+.25)+.55,-3.05),.07,mat['rusted-steel'],h)
    for r in range(floors*5+1):beam(name+' ladder rung',(2.48,.37+r*.49,-3.10),(3.15,.37+r*.49,-3.10),.06,mat['iron-dark'],h)
    # washing line and heavy mismatched cloth patches above the alley side.
    clothes_y=ground+floors*(storey+.25)+.17
    beam(name+' laundry wire',(-3.15,clothes_y,2.45),(-.5,clothes_y+.09,2.45),.024,mat['iron-dark'],h)
    for j in range(4):
        x=-2.8+j*.58;cube(name+' hanging laundry',(x,clothes_y-.4,2.45),(.48,.74,.035),mat[('patched-canvas','faded-hand-paint','rusted-steel','weathered-plank')[j]],.012,h)
    tank(h,(-1.75 if idx==0 else 2.20),clothes_y-.22,(.8 if idx==0 else 1.35),(.45 if idx==0 else .50));lamp(h,(-2.7,ground+1.8,-d*.43))

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
        for side in (-1,1):tin_wall(name+' cut-side container',(bx,base+1.33,bz+side*bd*.48),bw*.94,2.20,mat['galvanised-tin'] if side<0 else mat['rusted-steel'],h)
        for side in (-1,1):tin_wall(name+' container end',(bx+side*bw*.48,base+1.33,bz),bd*.90,2.20,mat['galvanised-tin'],h,'z')
        # Heavy corner castings, top edge rails and closure rods make a real container silhouette.
        for z in (-bd*.48,bd*.48):beam(name+' top edge rail',(bx-bw*.50,base+2.48,bz+z),(bx+bw*.50,base+2.48,bz+z),.12,mat['iron-dark'],h)
        for r in range(18):
            x=bx-bw*.46+r*bw*.92/17
            beam(name+' 100mm corrugation', (x,base+.25,bz-bd*.50),(x,base+2.40,bz-bd*.50),.045,mat['rusted-steel'] if r%7==0 else mat['galvanised-tin'],h)
        # Windows appear cut into the upper road-facing wall with steel lintels.
        if floor==1:
            for wx in (bx-1.7,bx+.65):
                cube(name+' cut window',(wx,base+1.44,bz-bd*.50-.05),(.82,.72,.07),mat['dirty-glass'],.018,h)
                cube(name+' window lintel',(wx,base+1.84,bz-bd*.50-.11),(.98,.09,.10),mat['rusted-steel'],.02,h)
                beam(name+' window grille',(wx,base+1.1,bz-bd*.50-.11),(wx,base+1.78,bz-bd*.50-.11),.035,mat['iron-dark'],h)
        else:
            door(h,bx+.4,base+.2,bz-bd*.50-.09,.90,1.95)
    # Roof garden: old tyres hold thorn scrub and dark soil. Tires are annular forms.
    for x,z in ((-2.1,-1.35),(0,-1.42),(2.05,-1.35)):
        center=(x+xoff+.22,5.35,z+zoff+.44)
        bpy.ops.mesh.primitive_torus_add(major_radius=.47,minor_radius=.17,major_segments=20,minor_segments=8,location=town.game_vector(center))
        tire=bpy.context.object;tire.name=name+' roof garden tyre';tire.data.materials.append(mat['iron-dark']);part(h,tire)
        cylinder(name+' tyre soil',(center[0],center[1]+.11,center[2]),.34,.11,mat['sand'],16,h)
        for b in range(4):
            angle=b*math.pi/2;x1=center[0]+math.cos(angle)*.12;z1=center[2]+math.sin(angle)*.12
            top_x=x1+math.cos(angle)*.28;top_z=z1+math.sin(angle)*.28
            beam(name+' crooked roof scrub branch',(x1,center[1]+.16,z1),(top_x,center[1]+.78,top_z),.045,mat['weathered-plank'],h)
            leaf=cube(name+' thorn leaf',(top_x,center[1]+.78,top_z),(.26,.055,.11),mat['dirty-glass'],.015,h);leaf.rotation_euler[2]=angle+.6
            leaf=cube(name+' lower thorn leaf',(x1+math.cos(angle+.8)*.18,center[1]+.48,z1+math.sin(angle+.8)*.18),
                      (.22,.05,.09),mat['dirty-glass'],.012,h);leaf.rotation_euler[2]=angle-.5
    beam(name+' roof catchment gutter',(xoff-3.1,5.28,zoff+3.17),(xoff+3.1,5.28,zoff+3.17),.085,mat['rusted-steel'],h)
    beam(name+' roof catchment downpipe',(xoff+2.8,5.25,zoff+3.17),(xoff+2.8,.42,zoff+3.17),.075,mat['iron-dark'],h)
    # Exterior stairs and rails zig from ground to the upper container deck.
    for i in range(9):
        t=i/8;y=.34+t*2.68;x=2.10-t*2.20;z=-3.10
        cube(name+' steel stair tread',(x,y,z),(.93,.105,.56),mat['rusted-steel'],.025,h)
    for side in (-1,1):beam(name+' stair rail',(2.55,.55,-3.18),(-.28,3.32,-3.18),.07,mat['iron-dark'],h)
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
for side in (-1,1):
    roof=cube(h.name+' pitched roof slope '+str(side),(0,3.2,side*d*.24),(w*1.06,.12,d*.64),mat['galvanised-tin'],.025,h)
    roof.rotation_euler[0]=side*.19
    for i in range(10):
        x=-w*.52+i*w*.115
        beam(h.name+' roof corrugation',(x,3.27,side*.1),(x,2.90,side*d*.52),.036,mat['rusted-steel'] if i%4==0 else mat['galvanised-tin'],h)
for x,z in ((-5,-1.4),(-1.8,1.3),(2.7,-1.0),(5.4,1.45)):
    cube(h.name+' roof patch',(x,3.33,z),(.82,.055,.68),mat['rusted-steel'],.02,h)
flap=cube(h.name+' bent roof edge salvage',(4.7,3.43,.15),(1.25,.08,.34),mat['rusted-steel'],.02,h);flap.rotation_euler[1]=-.16
for side in (-1,1):beam(h.name+' roof ridge seam',(-w*.53,3.34,side*.05),(w*.53,3.34,side*.05),.065,mat['rusted-steel'],h)
tank(h,-5.4,3.55,1.45,.53);lamp(h,(-.58,1.95,-d*.55))

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

if a.render:
    render.mkdir(parents=True,exist_ok=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
    scene.render.resolution_x=960;scene.render.resolution_y=680;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-.18
    scene.world=bpy.data.worlds.new('Bright overcast Scablands');scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(.32,.30,.27,1);bg.inputs['Strength'].default_value=1.0
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.06));ground=bpy.context.object;ground.name='render only sand';ground.data.materials.append(mat['sand'])
    for loc,power,size in [((2,14,21),6000,22),((-18,2,13),3800,22),((0,15,18),2800,20),((0,12,13),1200,14)]:
        bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
    # A temporary upward fill lets the review judge canvas undersides and props.
    bpy.ops.object.light_add(type='AREA',location=(0,0,1.1));inside=bpy.context.object;inside.data.energy=2500;inside.data.shape='DISK';inside.data.size=2.4;inside.data.use_shadow=False
    inside.rotation_euler=(Vector((0,0,2.6))-inside.location).to_track_quat('-Z','Y').to_euler()
    camera_data=bpy.data.cameras.new('Homes review camera');cam=bpy.data.objects.new('Homes review camera',camera_data);bpy.context.collection.objects.link(cam);scene.camera=cam
    def aim(loc,target,lens):
        cam.location=town.game_vector(loc);cam.data.lens=lens
        cam.rotation_euler=(town.game_vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    # True distances match card, telephoto lens keeps each home judgeable in frame.
    for name,h in homes.items():
        for other in homes.values():
            visible=other==h;other.hide_render=not visible
            for child in other.children_recursive:child.hide_render=not visible
        for label,loc,target,lens in (
            ('above-45',(0,44,-44),(0,1.3,0),100),
            ('driver-seat',(0,1.65,-25),(0,1.65,0),62)):
            aim(loc,target,lens);scene.render.filepath=str(render/f'{name}-{label}.png');bpy.ops.render.render(write_still=True)
        if name=='shack-a':
            aim((12,4.5,-18),(0,1.4,0),48);scene.render.filepath=str(render/'shack-a-three-quarter.png');bpy.ops.render.render(write_still=True)
    # One establishing view shows all tier silhouettes and different roof clutter.
    for h in homes.values():
        h.hide_render=False
        for child in h.children_recursive:child.hide_render=False
    placements=[(-39.6+8.8*i,0,0) for i in range(10)]
    for h,pos in zip(homes.values(),placements):h.location=town.game_vector(pos)
    aim((0,54,-76),(0,2,0),35);scene.render.resolution_x=1600;scene.render.resolution_y=950;scene.render.filepath=str(render/'street-overhead.png');bpy.ops.render.render(write_still=True)
    aim((0,8,-82),(0,3,0),28);scene.render.filepath=str(render/'street-road.png');bpy.ops.render.render(write_still=True)
    for h in homes.values():h.location=(0,0,0)
    bpy.data.objects.remove(cam,do_unlink=True);bpy.data.objects.remove(ground,do_unlink=True)

merge_surfaces()
bpy.ops.object.select_all(action='DESELECT');root_obj.select_set(True)
for h in homes.values():
    h.select_set(True)
    for child in h.children_recursive:child.select_set(True)
for obj in list(bpy.context.scene.objects):
    if obj.type=='LIGHT':bpy.data.objects.remove(obj,do_unlink=True)
bpy.context.view_layer.objects.active=root_obj
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
blob=out.read_bytes();json_len=struct.unpack_from('<I',blob,12)[0];gltf=json.loads(blob[20:20+json_len])
tris=sum(gltf['accessors'][prim['indices']]['count']//3 for mesh in gltf.get('meshes',[]) for prim in mesh['primitives'])
node_names={node.get('name') for node in gltf.get('nodes',[])}
for name in homes:
    assert name in node_names and name+':lamp' in node_names,(name,'missing exported node')
assert tris<60000,f'{tris} triangles exceeds family limit';assert out.stat().st_size<=3_000_000,f'{out.stat().st_size} exceeds 3 MB'
print(json.dumps({'glb':str(out),'triangles':tris,'bytes':out.stat().st_size,'nodes':sorted(node_names),'render':str(render) if a.render else None}))
