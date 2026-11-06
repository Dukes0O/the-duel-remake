"""Build the photo-proportioned Rattler pickup and its round-four sheet.

Run: blender -b -t 4 --python-exit-code 1 --python tools/blender/rattler.py -- --root .
Model coordinates are metres, +Y up and +Z forward. Review-only objects never export.
"""
import argparse
import json
import math
import struct
import sys
from datetime import date
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', required=True)
parser.add_argument('--paths-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(args.root).resolve()
out = root / 'public/assets/models/wasteland/cars/rattler.glb'
textures = root / 'public/assets/models/wasteland/cars/textures'
blend = root / 'art-build/cars/rattler.blend'
sheet = root / 'docs/board/looks/car-art-rattler/round-4.jpg'
evidence = root / '.evidence' / date.today().isoformat() / 'CAR-ART-RATTLER' / 'round-4'
reference = root / '.qa-dist/rattler-round-4/reference.jpg'
if args.paths_only:
    print(json.dumps({'blend':[str(blend)], 'glb':[str(out)], 'evidence':[str(evidence)], 'summary':[str(sheet)]}))
    raise SystemExit(0)

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 900
scene.render.resolution_y = 620
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 91
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
world = bpy.data.worlds.new('Bright neutral overcast')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.62, .63, .64, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .9
scene.world = world
out.parent.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True)

def material(name, color, rough=.82, metal=.18, image=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = min(.3, metal)
    if image:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(textures / image), check_existing=True)
        tex.image.pack()
        tex.interpolation = 'Linear'
        tex.extension = 'REPEAT'
        uv = m.node_tree.nodes.new('ShaderNodeTexCoord')
        m.node_tree.links.new(uv.outputs['UV'], tex.inputs['Vector'])
        m.node_tree.links.new(tex.outputs['Color'], bs.inputs['Base Color'])
    return m

paint = material('Photo: faded primer, chips and dark brown rust', (.09,.09,.085), .96,.10,'faded-paint-rust.jpg')
steel = material('Photo: blackened oily steel', (.09,.085,.075), .88,.25,'blackened-steel.jpg')
rubber = material('Photo: dusty vintage tire rubber', (.025,.028,.026), .98,.02,'dusty-rubber.jpg')
dust = material('Groundward road dust over dark steel', (.12,.11,.095), .99,.02,'ground-dust.jpg')
dark = material('Dark recess and wheel arch', (.018,.021,.020), .96,.02)
glass = material('Smoky dusty glass', (.035,.052,.052), .42,.08)
lampglass = material('Clouded headlamp glass', (.18,.17,.14), .48,.02)
edge = material('Scuffed exposed metal at rolled edges', (.14,.13,.115), .78,.28)
leather = material('Cracked dark seat hide', (.075,.050,.036), .95,.01)
groundmat = material('Plain mid grey studio ground', (.25,.26,.26), .99,.0)

vehicle = bpy.data.objects.new('rattler | chopped 1930s pickup, metres', None)
scene.collection.objects.link(vehicle)
vehicle['vehicle_id']='rattler'; vehicle['units']='metres'; vehicle['forward']='+Z'; vehicle['up']='+Y'
parts = []

def adopt(obj, name, mat, parent=True):
    obj.name = name
    obj.data.materials.append(mat)
    if parent:
        obj.parent = vehicle
        parts.append(obj)
    return obj

def cube(name, loc, dims, mat, bevel=.025, parent=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    adopt(o,name,mat,parent)
    if bevel:
        b=o.modifiers.new('thin rolled sheet edges','BEVEL'); b.width=bevel; b.segments=2
        o.modifiers.new('weighted metal panel normals','WEIGHTED_NORMAL')
    return o

def beam(name, a, b, radius, mat=steel, sides=10):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=d.length, location=(a+b)/2)
    o=bpy.context.object; o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return adopt(o,name,mat)

def bent_pipe(name, points, radius, mat=steel):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=2
    cu.bevel_depth=radius;cu.bevel_resolution=2
    sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,cu);scene.collection.objects.link(o);o.data.materials.append(mat);o.parent=vehicle;parts.append(o)
    return o

def cylinder(name, loc, radius, depth, mat, axis='X', verts=16):
    rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    return adopt(bpy.context.object,name,mat)

def panel(name, coords, x, mat, thickness=.035, bulge=0.0, uv_origin_y=None):
    """A thin custom-UV steel sheet with optional shallow convex shaping."""
    verts=[(x,y,z) for y,z in coords]
    faces=[]
    if bulge:
        cy=sum(y for y,z in coords)/len(coords); cz=sum(z for y,z in coords)/len(coords)
        centre=len(verts); verts.append((x+math.copysign(bulge,x),cy,cz))
        faces=[(i,(i+1)%len(coords),centre) for i in range(len(coords))]
    else: faces=[tuple(range(len(verts)))]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.materials.append(mat); mesh.update()
    for face in mesh.polygons: face.use_smooth=True
    uv=mesh.uv_layers.new(name='metre-scaled material picture')
    for poly in mesh.polygons:
        for li,vi in zip(poly.loop_indices,poly.vertices):
            y,z=verts[vi][1],verts[vi][2]
            v=(y-(uv_origin_y or 0.0))/.35 if uv_origin_y is not None else y/.35
            uv.data[li].uv=(z/.35,v)
    o=bpy.data.objects.new(name,mesh); scene.collection.objects.link(o); o.parent=vehicle; parts.append(o)
    sol=o.modifiers.new('real sheet thickness','SOLIDIFY'); sol.thickness=thickness
    bev=o.modifiers.new('creased rolled perimeter','BEVEL'); bev.width=.018; bev.segments=2
    return o

def torus(name, loc, major, minor, mat, axis='X', maj=36, minr=10):
    rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
    bpy.ops.mesh.primitive_torus_add(major_segments=maj,minor_segments=minr,major_radius=major,minor_radius=minor,location=loc,rotation=rot)
    o=bpy.context.object
    for p in o.data.polygons:p.use_smooth=True
    return adopt(o,name,mat)

def tyre(name, center, radius, width):
    """One closed carcass mesh with its shallow tread lugs grown into it."""
    cx,cy,cz=center; around=48; rings=8; verts=[]; faces=[]; uvs=[]
    for i in range(around):
        theta=2*math.pi*i/around
        for j in range(rings):
            phi=2*math.pi*j/rings
            shoulder=math.sin(phi)
            lugzone=max(0.0, min(1.0,(abs(shoulder)-.17)/.40))
            pitch=2*math.pi/24
            delta=abs((theta+pitch/2)%pitch-pitch/2)
            lug=.028*(.5+.5*math.cos(theta*24))*lugzone
            rr=radius-.115 + .115*shoulder + lug
            verts.append((cx+width*.5*math.cos(phi),cy+rr*math.sin(theta),cz+rr*math.cos(theta)))
    for i in range(around):
        ni=(i+1)%around
        for j in range(rings):
            nj=(j+1)%rings
            faces.append((i*rings+j,ni*rings+j,ni*rings+nj,i*rings+nj))
            uvs.append(((i/around*3.8,j/rings*1.5),((i+1)/around*3.8,j/rings*1.5),((i+1)/around*3.8,(j+1)/rings*1.5),(i/around*3.8,(j+1)/rings*1.5)))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.materials.append(rubber); mesh.update()
    uv=mesh.uv_layers.new(name='tire texture, repeated in real scale')
    for poly,coords in zip(mesh.polygons,uvs):
        for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
        i,j=divmod(poly.index,rings)
        theta=(i+.5)*2*math.pi/around; delta=abs((theta+math.pi/24)%(math.pi/12)-math.pi/24)
        if delta<.012:poly.use_smooth=False
    o=bpy.data.objects.new(name,mesh); scene.collection.objects.link(o); o.parent=vehicle; parts.append(o)
    return o

# A 4.55 m long, 2.12 m wide pickup. Roof is 2.08 m high; rear/front tires
# are 1.08/0.90 m across. Rear axle sits 1.42 m behind the front axle.
# The reference shows a long open-engine nose, a short cab and a stubby bed.
for x in (-.56,.56):
    cube('boxed ladder chassis rail',(x,.49,-.05),(.105,.15,3.65),steel,.022)
for z in (-1.50,-.62,.30,1.17):
    cube('crossmember with flanged ends',(0,.48,z),(1.25,.12,.10),steel,.018)
cube('pressed floor pan',(0,.60,-.18),(1.30,.08,2.70),steel,.022)

# Rounded cab lower body, separate doors and formed rear cab panel.
for side in (-1,1):
    x=side*.83
    panel('curved cab quarter skin',[ (.66,-1.56),(1.00,-1.58),(1.28,-1.43),(1.40,-1.16),(1.40,-.28),(1.30,.18),(.83,.25),(.74,-.28) ],x,paint,.04,.09)
    panel('door lower skin with real thin edge',[ (.69,-1.17),(1.34,-1.17),(1.40,-.31),(1.32,.08),(.73,.12) ],x,paint,.035,.08)
    # Doors have two upright rolled seams, separate hinges and body fasteners.
    beam('door front rolled seam',(x*1.012,.76,.08),(x*1.012,1.31,.08),.012,edge,6)
    beam('door rear rolled seam',(x*1.012,.73,-1.13),(x*1.012,1.32,-1.13),.012,edge,6)
    for z in (-.89,-.54):
        cube('separate hinge leaf',(x*1.02,1.20,z),(.035,.12,.09),steel,.009)
        cylinder('hinge pin',(x*1.04,1.20,z),.025,.11,edge,'Y',10)
    cube('worn door pull',(x*1.02,1.18,-.36),(.035,.045,.17),edge,.018)
    for z in (-1.45,-1.31,-.12,.04):
        cylinder('cab skin rivet',(x*1.025,1.12,z),.018,.035,edge,'X',10)
    # Swept sheet-metal pillars and a short rounded glass opening shape the cab.
    panel('narrow swept A pillar sheet',[(1.36,.20),(1.94,.07),(1.90,-.04),(1.42,.10)],x*.99,paint,.045,.022)
    panel('rounded rear cab pillar',[(1.38,-1.48),(1.94,-1.39),(1.91,-1.24),(1.47,-1.30)],x*.99,paint,.05,.025)
    panel('roof drip edge over side glass',[(1.80,-1.03),(1.89,-1.01),(1.89,-.20),(1.80,-.17)],x*.99,paint,.03,.012)
    panel('small rounded dark side window',[(1.53,-.92),(1.53,-.34),(1.59,-.25),(1.70,-.20),(1.77,-.28),(1.79,-.78),(1.72,-.91),(1.61,-.95)],side*.91,glass,.008)
    side_window=[(1.53,-.92),(1.53,-.34),(1.59,-.25),(1.70,-.20),(1.77,-.28),(1.79,-.78),(1.72,-.91),(1.61,-.95)]
    for i,a in enumerate(side_window):
        b=side_window[(i+1)%len(side_window)]
        beam('formed rounded side-window lip',(side*.92,a[0],a[1]),(side*.92,b[0],b[1]),.014,edge,8)
    # Three pressed channel ribs below the window and small chipped patch plates.
    for yy in (.80,.91,1.02): beam('pressed door bead',(x*1.02,yy,-1.10),(x*1.02,yy,.02),.018,edge,6)
    panel('welded irregular repair patch',[ (.83,-.85),(.96,-.94),(1.08,-.88),(1.10,-.60),(.98,-.53),(.83,-.61) ],x*1.018,steel,.018)
    # The lowest folded edge carries a separate, darker road-dust coat.
    panel('road-dusted lower cab folded hem',[(.65,-1.49),(.76,-1.48),(.78,-.14),(.68,-.12)],side*.93,dust,.018,uv_origin_y=.65)

# Curved roof crown: tapered stations keep the profile narrow at the gutters.
stations=[]
for q in range(13):
    t=q/12; z=-1.62+1.62*t
    top=1.78+.30*math.sqrt(max(0,1-((z+.75)/.87)**2))
    width=.80*(.95+.05*math.sin(math.pi*t))
    stations.append((z,width,top))
verts=[]
for z,w,top in stations:
    for k in range(13):
        a=-math.pi/2 + math.pi*k/12
        verts.append((w*math.sin(a),top-.22*(1-math.cos(a)),z))
faces=[]
for q in range(len(stations)-1):
    for k in range(12):
        a=q*13+k; faces.append((a,a+1,a+14,a+13))
mesh=bpy.data.meshes.new('hand crowned roof sheet');mesh.from_pydata(verts,[],faces);mesh.materials.append(paint);mesh.update()
for face in mesh.polygons: face.use_smooth=True
uv=mesh.uv_layers.new(name='physical scale paint map')
for p in mesh.polygons:
    for li,vi in zip(p.loop_indices,p.vertices):uv.data[li].uv=(verts[vi][0]/.35,verts[vi][2]/.35)
roof=bpy.data.objects.new('curved chopped pickup roof skin',mesh);scene.collection.objects.link(roof);roof.parent=vehicle;parts.append(roof)
solid=roof.modifiers.new('thin roof sheet','SOLIDIFY');solid.thickness=.035
roof.modifiers.new('roof creased shoulders','BEVEL').width=.018

# A low, narrow sloped windshield sits beneath the rounded roof brow.
wind_verts=[(-.58,1.70,.15),(0,1.70,.15),(.58,1.70,.15),(-.53,1.86,.015),(0,1.86,.015),(.53,1.86,.015)]
wind_mesh=bpy.data.meshes.new('two sloped windshield glass panes')
wind_mesh.from_pydata(wind_verts,[],[(0,1,4,3),(1,2,5,4)]);wind_mesh.materials.append(glass);wind_mesh.update()
wind_uv=wind_mesh.uv_layers.new(name='windshield UV')
for p in wind_mesh.polygons:
    for li,vi in zip(p.loop_indices,p.vertices):wind_uv.data[li].uv=((wind_verts[vi][0]+.7)/1.4,(wind_verts[vi][1]-1.45)/.5)
wind=bpy.data.objects.new('split smoky windshield glass',wind_mesh);scene.collection.objects.link(wind);wind.parent=vehicle;parts.append(wind)
beam('windscreen centre post',(0,1.69,.13),(0,1.87,.02),.012,edge,8)
beam('curved lower windshield frame',(-.59,1.69,.15),(.59,1.69,.15),.016,edge)
beam('curved upper windshield frame',(-.54,1.87,.015),(.54,1.87,.015),.018,paint)
# Dark inset side panes reproduce the deep window shadow in the reference.
panel('rear window smoky glass',[(1.48,-1.48),(1.80,-1.46),(1.80,-1.43),(1.49,-1.40)],0,glass,.012)
cube('rear cab bulkhead behind bench',(0,.96,-1.43),(1.49,.69,.075),paint,.06)

# Short pickup bed behind the cab: folded metal sides, ribs, seams and tailgate.
cube('short pickup bed floor',(0,.79,-1.88),(1.34,.075,.62),steel,.025)
for side in (-1,1):
    x=side*.70
    panel('rolled pickup bed side',[ (.80,-2.20),(1.10,-2.18),(1.15,-1.56),(.83,-1.54) ],x,paint,.035)
    for z in (-2.05,-1.88,-1.71):beam('bed side pressed channel',(x, .87,z),(x,1.08,z),.018,edge,6)
    for z in (-2.10,-1.65):cylinder('bed side bolt',(x*1.02,.98,z),.022,.04,edge,'X',10)
cube('tailgate formed sheet',(0,.97,-2.22),(1.40,.36,.06),paint,.025)
for x in (-.47,-.23,0,.23,.47):
    cube('bed floor steel rib',(x,.84,-1.88),(.028,.025,.56),edge,.006)
for side in (-1,1):
    beam('tailgate hinge',(side*.54,.81,-2.24),(side*.54,1.00,-2.24),.024,steel)

# Genuine narrow sheet fenders and open arches stay clear of the outside tires.
# Wheels measured against the photo: front 0.90 m, rear 1.08 m diameter.
for x in (-.90,.90):
    for z,rad,width in ((-1.40,.54,.28),(1.57,.45,.20)):
        tyre('continuous rubber carcass with molded tread lugs',(x,rad,z),rad,width)
        inner=x-math.copysign(width*.58,x)
        cylinder('black dished rim',(inner,rad,z),rad*.70,width*.48,steel,'X',24)
        face=inner+math.copysign(width*.26,x)
        cylinder('stamped wheel centre',(face,rad,z),rad*.57,.055,edge,'X',24)
        cylinder('grease-dark hub',(face+math.copysign(.04,x),rad,z),rad*.23,.09,steel,'X',20)
        for k in range(10):
            a=2*math.pi*k/10
            cylinder('individual wheel bolt',(face+math.copysign(.045,x),rad+math.sin(a)*rad*.42,z+math.cos(a)*rad*.42),.021,.035,steel,'X',8)
        # Rear semi-elliptic spring packs have stacked leaves, hangers and shackles.
        if z < 0:
            for n in range(4):
                drop=.025*n
                beam('separate leaf spring steel strip',(x*.62,rad-.10-drop,z-.62+n*.035),(x*.62,rad-.10-drop,z+.62-n*.035),.019,steel,8)
            for dz in (-.59,.59):
                beam('leaf spring hanger',(x*.62,rad-.17,z+dz),(x*.62,rad-.24,z+dz),.035,edge,8)
        # Exposed telescopic shocks and their bolted clevises.
        shockx=x*.66
        beam('shock lower mount',(shockx,rad-.08,z-.22),(shockx,rad+.20,z-.18),.045,steel)
        beam('shock polished piston',(shockx,rad+.05,z-.18),(shockx,rad+.55,z-.18),.022,edge,8)
        beam('shock barrel',(shockx,rad+.12,z-.18),(shockx,rad+.47,z-.18),.043,steel,10)

# Open, recognizable longitudinal V8 engine in the exposed long bonnet gap.
cube('V8 cast iron crankcase',(0,.91,.83),(.72,.56,.83),steel,.065)
for side in (-1,1):
    x=side*.30
    head=cube('angled cast cylinder head',(x,.88,.79),(.31,.50,.70),steel,.045)
    head.rotation_euler.z=side*.13
    cube('ribbed rocker cover',(x,1.18,.80),(.21,.10,.48),steel,.025)
    for row in range(5):beam('individual rocker fin',(x-.105,1.24,.60+row*.09),(x+.105,1.24,.60+row*.09),.012,edge,6)
    for q in range(4):
        z=.54+q*.17
        beam('curved exhaust header',(x,.77,z),(side*.50,.65,z-.09),.032,edge,10)
    beam('side stub exhaust pipe',(side*.53,.62,.32),(side*.53,.62,1.22),.065,steel,12)
    cylinder('dark open exhaust lip',(side*.53,.62,1.24),.072,.045,dark,'Z',24)
cube('intake manifold',(0,1.12,.88),(.40,.18,.43),edge,.035)
cylinder('carburettor base',(0,1.23,.88),.15,.10,steel,'Y',24)
cylinder('four barrel carburettor',(0,1.30,.88),.12,.08,edge,'Y',24)
cylinder('air cleaner lower lip',(0,1.36,.88),.25,.035,edge,'Y',24)
cylinder('dark air cleaner lid',(0,1.39,.88),.23,.035,steel,'Y',24)
# The engine has two readable four-cylinder banks, plug wires and bent headers.
for side in (-1,1):
    for q,z in enumerate((.53,.70,.87,1.04)):
        cylinder('individual cast V8 cylinder boss',(side*.505,.91,z),.078,.10,steel,'X',20)
        cylinder('spark plug hex',(side*.55,1.01,z),.024,.055,edge,'X',10)
        bent_pipe('visible ignition lead',[(side*.55,1.02,z),(side*.49,1.15,z+.025),(side*.20,1.19,z+.05)],.010,dark)
        bent_pipe('separate curved V8 exhaust header',[(side*.36,.77,z-.025),(side*.43,.68,z-.08),(side*.53,.61,z-.15)],.022,edge)
    cover=cube('long ribbed rocker cover outside cylinder bank',(side*.49,1.13,.79),(.085,.13,.66),steel,.026)
    for q in range(5):
        beam('rocker cover raised rib',(side*.54,1.20,.53+q*.13),(side*.54,1.20,.59+q*.13),.010,edge,6)
    bent_pipe('long side exhaust collector',[(side*.54,.61,.37),(side*.55,.61,.70),(side*.54,.61,1.10)],.043,steel)
# A shallow formed scuttle joins the foot of the windshield to the firewall.
cowl_points=[(-.70,1.36),(-.68,1.53),(-.50,1.62),(0,1.65),(.50,1.62),(.68,1.53),(.70,1.36)]
cowl_verts=[(x,y,.20) for x,y in cowl_points]
cowl_mesh=bpy.data.meshes.new('curved pressed cowl sheet');cowl_mesh.from_pydata(cowl_verts,[],[tuple(range(len(cowl_verts)))]);cowl_mesh.materials.append(paint);cowl_mesh.update()
cowl_uv=cowl_mesh.uv_layers.new(name='cowl UV')
for p in cowl_mesh.polygons:
    for li,vi in zip(p.loop_indices,p.vertices):cowl_uv.data[li].uv=(cowl_verts[vi][0]/.35,cowl_verts[vi][1]/.35)
cowl=bpy.data.objects.new('rounded scuttle under windscreen',cowl_mesh);scene.collection.objects.link(cowl);cowl.parent=vehicle;parts.append(cowl)
cowl_solid=cowl.modifiers.new('thin cowl sheet','SOLIDIFY');cowl_solid.thickness=.035
# Separate pulleys and a real curved fan belt sit at the front of the block.
for z,r in ((1.20,.19),(1.07,.095)):
    cylinder('front V8 pulley',(0,.91,z),r,.10,steel,'X',32)
    torus('machined pulley groove',(0,.91,z),r*.78,.014,edge,'X',32,8)
beam('fan belt straight run',(-.16,.95,1.20),(.16,.95,1.07),.018,dark,8)
for side in (-1,1):
    beam('spark lead from plug',(side*.22,1.20,.63),(side*.20,1.39,.76),.012,edge,6)
    cylinder('spark plug ceramic',(side*.24,.94,.48),.026,.10,glass,'X',10)

# A narrow pressed grille shell with a real dark aperture and individual bars.
verts=[]
for k in range(40):
    a=2*math.pi*k/40
    verts.append((.255*math.cos(a),.99+.47*math.sin(a),1.47))
mesh=bpy.data.meshes.new('dark oval radiator recess');mesh.from_pydata(verts,[],[tuple(range(40))]);mesh.materials.append(dark);mesh.update()
uv=mesh.uv_layers.new(name='radiator UV')
for poly in mesh.polygons:
    for li,vi in zip(poly.loop_indices,poly.vertices):uv.data[li].uv=((verts[vi][0]+.3)/.6,(verts[vi][1]-.5)/1.0)
ob=bpy.data.objects.new('actual open radiator cavity',mesh);scene.collection.objects.link(ob);ob.parent=vehicle;parts.append(ob)
outer=[];inner=[]
for k in range(40):
    a=2*math.pi*k/40
    outer.append((.29*math.cos(a),.99+.49*math.sin(a),1.51))
    inner.append((.245*math.cos(a),.99+.435*math.sin(a),1.515))
ringmesh=bpy.data.meshes.new('rolled sheet grille surround');ringmesh.from_pydata(outer+inner,[],[(k,(k+1)%40,(k+1)%40+40,k+40) for k in range(40)]);ringmesh.materials.append(edge);ringmesh.update()
ringuv=ringmesh.uv_layers.new(name='UVMap')
for poly in ringmesh.polygons:
    for li,vi in zip(poly.loop_indices,poly.vertices):ringuv.data[li].uv=(outer[vi%40][0]/.35,outer[vi%40][1]/.35)
rim=bpy.data.objects.new('thin folded steel grille surround',ringmesh);scene.collection.objects.link(rim);rim.parent=vehicle;parts.append(rim)
for x in (-.19,-.145,-.10,-.055,-.01,.035,.08,.125,.17):
    beam('individual vertical radiator bar',(x,.61,1.515),(x,1.37,1.515),.008,steel,6)
for x in (-.70,.70):
    cylinder('round headlamp bucket',(x,1.00,1.56),.165,.13,steel,'Z',32)
    torus('headlamp rolled chrome bezel',(x,1.00,1.635),.132,.018,edge,'Z',32,8)
    cylinder('clouded lamp lens',(x,1.00,1.64),.116,.018,lampglass,'Z',32)
cube('narrow front tube bumper',(0,.51,2.20),(1.66,.08,.06),steel,.025)
for side in (-1,1):
    beam('bumper bracket',(side*.50,.55,2.05),(side*.50,.55,2.22),.045,steel)

# Cab interior is visible through the open side windows.
cube('split bench seat cushion',(0,.87,-.54),(1.28,.20,.72),leather,.09)
cube('split bench seat back',(0,1.20,-.96),(1.24,.53,.18),leather,.08)
for x in (-.28,.28):
    cube('seat back seam piping',(x,1.20,-.96),(.018,.48,.205),edge,.007)
beam('steering column',(.38,1.07,.04),(.38,1.32,.39),.025,steel,10)
torus('thin three-spoke steering wheel',(.38,1.36,.44),.21,.018,edge,'Z',32,8)
for angle in (0,2*math.pi/3,4*math.pi/3):
    beam('steering wheel spoke',(.38,1.36,.44),(.38+.18*math.cos(angle),1.36,.44+.18*math.sin(angle)),.012,edge,6)
for x in (-.34,-.12,.12,.34):
    cylinder('small analogue cab gauge',(x,1.30,.33),.047,.024,glass,'Z',20)

# Chassis tanks, brake lines, weld beads, shackles and two irregular punched holes.
for side in (-1,1):
    cube('hanging fuel tank',(side*.48,.39,-.92),(.38,.32,.74),steel,.04)
    beam('brake line following chassis',(side*.48,.46,-1.72),(side*.48,.51,1.42),.012,edge,6)
    for z in (-1.28,-.92,-.30,.42,1.18):
        cylinder('small chassis fastener',(side*.64,.50,z),.025,.04,edge,'X',10)
    # Two dark punched openings show through a torn plate, ringed by folded metal.
    for y,z in ((1.04,-.78),(1.10,-.66)):
        cylinder('dark punched-through panel hole',(side*.856,y,z),.035,.012,dark,'X',12)
        torus('ragged curled hole edge',(side*.86,y,z),.043,.009,edge,'X',16,6)
for side in (-1,1):
    for z in (-1.38,-.86,-.12,.42,1.28):
        beam('short irregular weld bead',(side*.85,1.05,z),(side*.85,1.12,z+.12),.012,edge,6)

# A restrained roll hoop follows the chopped roof and joins the chassis.
for side in (-1,1):
    bent_pipe('roll hoop swept rear upright',[(side*.55,.62,-1.58),(side*.55,1.82,-1.58),(side*.52,2.13,-1.58)],.032,steel)
bent_pipe('roll hoop curved crown',[(-.52,2.13,-1.58),(-.38,2.18,-1.58),(.38,2.18,-1.58),(.52,2.13,-1.58)],.032,edge)

def aim(obj, point):
    forward=(Vector(point)-obj.location).normalized()
    up_hint=Vector((0,0,1) if obj.name == 'review camera top' else (0,1,0))
    right=forward.cross(up_hint).normalized()
    true_up=right.cross(forward).normalized()
    from mathutils import Matrix
    basis=Matrix(((right.x,true_up.x,-forward.x),(right.y,true_up.y,-forward.y),(right.z,true_up.z,-forward.z)))
    obj.rotation_euler=basis.to_euler()
blend.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))

# Export the hierarchy only; study figure, floor and lighting stay out.
for obj in parts:
    if obj.type != 'MESH':
        continue
    layers=obj.data.uv_layers
    if not layers:
        layers.new(name='UVMap')
        for poly in obj.data.polygons:
            for li in poly.loop_indices:
                co=obj.data.vertices[obj.data.loops[li].vertex_index].co
                layers[0].data[li].uv=(co.x,co.z)
    while len(layers)>1:
        layers.remove(layers[-1])
    layers[0].name='UVMap'
    layers.active=layers[0]
    layers[0].active_render=True
bpy.ops.object.select_all(action='DESELECT')
vehicle.select_set(True)
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=vehicle
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=False,export_apply=True)
data=out.read_bytes(); jlen=int.from_bytes(data[12:16],'little')
gltf=json.loads(data[20:20+jlen].decode('utf-8').rstrip('\0 '))
bin_offset=20+jlen
bin_length=int.from_bytes(data[bin_offset:bin_offset+4],'little')
binary=data[bin_offset+8:bin_offset+8+bin_length]
for mi,mesh_data in enumerate(gltf.get('meshes',[])):
    for pi,primitive in enumerate(mesh_data.get('primitives',[])):
        attrs=primitive.get('attributes',{})
        uv_keys=[key for key in attrs if key.startswith('TEXCOORD_')]
        if uv_keys != ['TEXCOORD_0']:
            raise RuntimeError(f'mesh {mi} primitive {pi} has texture-coordinate layers {uv_keys}')
        accessor=gltf['accessors'][attrs['TEXCOORD_0']]
        view=gltf['bufferViews'][accessor['bufferView']]
        start=view.get('byteOffset',0)+accessor.get('byteOffset',0)
        stride=view.get('byteStride',8)
        coords=[struct.unpack_from('<2f',binary,start+i*stride) for i in range(accessor['count'])]
        if not any(max(row[axis] for row in coords)-min(row[axis] for row in coords)>1e-6 for axis in (0,1)):
            raise RuntimeError(f'mesh {mi} primitive {pi} has flat TEXCOORD_0 values')
for material_data in gltf.get('materials',[]):
    metallic=material_data.get('pbrMetallicRoughness',{}).get('metallicFactor',1.0)
    if metallic>.3:
        raise RuntimeError(f"material {material_data.get('name','<unnamed>')} metallicFactor {metallic} exceeds 0.3")
triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'] if 'indices' in p)
if triangles>25000:raise RuntimeError(f'{triangles} triangles exceeds 25,000')
if out.stat().st_size>8*1024*1024:raise RuntimeError(f'{out.stat().st_size} bytes exceeds 8 MB')

# Lesson 8: the review views render the exported GLB imported into a clean scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=900;scene.render.resolution_y=620;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=91;scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
world=bpy.data.worlds.new('Bright neutral overcast export review');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.42,.42,.42,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8;scene.world=world
bpy_scene_before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(out))
imported=[o for o in bpy.data.objects if o not in bpy_scene_before]
vehicle_parent=bpy.data.objects.new('review-only imported Rattler GLB',None);scene.collection.objects.link(vehicle_parent)
vehicle_parent.rotation_euler.x=-math.pi/2
roots=[o for o in imported if o.parent not in imported]
for o in roots:o.parent=vehicle_parent
before_person=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/models/wasteland/crew/cinder.glb'))
person_parts=[o for o in bpy.data.objects if o not in before_person]
person_roots=[o for o in person_parts if o.parent not in person_parts]
person_meshes=[o for o in person_parts if o.type=='MESH']
points=[o.matrix_world @ Vector(c) for o in person_meshes for c in o.bound_box]
min_z=min(p.z for p in points); height=max(p.z for p in points)-min_z; scale=1.72/max(.001,height)
person=bpy.data.objects.new('review-only 1.72 m Cinder scale figure',None);scene.collection.objects.link(person)
person.rotation_euler.x=-math.pi/2;person.scale=(scale,)*3;person.location=(-1.62,-min_z*scale,-.05)
for o in person_roots:o.parent=person
floor_mat=material('Plain mid-grey studio ground',(.15,.15,.15),.99,.0)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,-.012,0),rotation=(math.pi/2,0,0))
floor=bpy.context.object;floor.name='review-only mid-grey ground';floor.data.materials.append(floor_mat)
for loc,power,size in [((-4,7,5),1550,7),((4,6,-4),1200,7),((0,8,1),800,8)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object
    light.data.energy=power;light.data.shape='DISK';light.data.size=size;aim(light,(0,.8,0))
views=[('front-three-quarter',(-5,1.22,6),(0,.82,0),4.50),('rear-three-quarter',(5,1.22,-6),(0,.82,-.15),4.80),('side',(-8,1.22,0),(0,.82,0),4.80),('top',(0,8,0),(0,.72,0),6.8),('beside-person',(-5,1.22,6),(-.55,.82,0),5.55)]
renders=[]
for name,loc,target,scale in views:
    for o in person_parts:o.hide_render=(name!='beside-person')
    bpy.ops.object.camera_add(location=loc);camera=bpy.context.object
    camera.name='review camera '+name;camera.data.type='ORTHO';camera.data.ortho_scale=scale;aim(camera,target);scene.camera=camera
    scene.render.filepath=str(evidence/(name+'.jpg'));bpy.ops.render.render(write_still=True);renders.append(str(evidence/(name+'.jpg')))
    bpy.data.objects.remove(camera,do_unlink=True)
manifest={'id':'rattler','dimensions_m':{'width':2.12,'length':4.52,'height':2.08},'wheel_radius_m':{'front':.45,'rear':.54},'triangles':triangles,'bytes':out.stat().st_size,'forward':'+Z','up':'+Y','sockets':['front','rear','roof','hood','left','right','door','shield'],'renders':renders}
(evidence/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
