"""DEEP-ART-SRC and DEEP-ART-FINAL: fit Claude's licensed donors and the authored models.

Authored here with no donor file: moray, giant clam (DEEP-ART-SRC) and the sardine,
sea lion, sea otter and gray whale (DEEP-ART-FINAL). Every other model fits a donor.

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
AUTHORED=['moray','giant-clam','silver-school','sea-lion','otter','whale']

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

# ---- DEEP-ART-FINAL: sardine, sea lion, sea otter and gray whale, authored here ----
# Original geometry, no donor files. Every model is one joined mesh with one
# material and vertex colours, so the game can instance it (sardine, sea lion,
# otter) or play it as a single mesh (whale). Blender -Y is the nose, +Z is up.

def smoothstep(a,b,x):
    t=min(1,max(0,(x-a)/(b-a)));return t*t*(3-2*t)

def mix(a,b,t):return tuple(a[i]+(b[i]-a[i])*t for i in range(3))

def hash_noise(x,y,z):
    return (math.sin(x*127.1+y*311.7+z*74.7)*43758.5453)%1.0

def value_noise(p,scale):
    x,y,z=p.x*scale,p.y*scale,p.z*scale
    ix,iy,iz=math.floor(x),math.floor(y),math.floor(z)
    fx,fy,fz=[t*t*(3-2*t) for t in (x-ix,y-iy,z-iz)]
    def c(a,b,d):return hash_noise(ix+a,iy+b,iz+d)
    def lerp(a,b,t):return a+(b-a)*t
    return lerp(lerp(lerp(c(0,0,0),c(1,0,0),fx),lerp(c(0,1,0),c(1,1,0),fx),fy),
                lerp(lerp(c(0,0,1),c(1,0,1),fx),lerp(c(0,1,1),c(1,1,1),fx),fy),fz)

def spline(table,s):
    # Catmull-Rom through table rows (s, a, b, ...), one curve per column.
    n=len(table);i=0
    while i<n-2 and s>table[i+1][0]:i+=1
    t=min(1,max(0,(s-table[i][0])/(table[i+1][0]-table[i][0])));out=[]
    for c in range(1,len(table[0])):
        p0=table[max(i-1,0)][c];p1=table[i][c];p2=table[i+1][c];p3=table[min(i+2,n-1)][c]
        out.append(.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t**3))
    return out

def fix_normals(o):
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()

def loft(name,stations,sides,mat,power=2.2,radial=None,xform=None):
    """Rings along +Y. station = (y, half width, height above, depth below, centre z, centre x).
    Each ring is a superellipse; the first and last rings are closed with a small cap.
    Returns the object and (station, side) for every vertex, for painting."""
    verts=[];info=[];faces=[];expo=2.0/power
    rows=[tuple(st)+(0,)*(6-len(st)) for st in stations]
    for si,(y,w,ht,hb,cz,cx) in enumerate(rows):
        for k in range(sides):
            a=2*math.pi*k/sides;c=math.cos(a);s=math.sin(a);r=radial(si,k) if radial else 1.0
            verts.append(Vector((cx+w*r*math.copysign(abs(s)**expo,s),y,cz+(ht if c>=0 else hb)*r*math.copysign(abs(c)**expo,c))));info.append((si,k))
    for si in range(len(rows)-1):
        for k in range(sides):
            a=si*sides+k;b=si*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
    for si in (0,len(rows)-1):
        y,w,ht,hb,cz,cx=rows[si];centre=len(verts);verts.append(Vector((cx,y,cz)));info.append((si,None))
        for k in range(sides):faces.append((centre,si*sides+(k+1)%sides,si*sides+k))
    if xform:verts=[xform@v for v in verts]
    o=mesh(name,[tuple(v) for v in verts],faces,mat);fix_normals(o)
    return o,info

def blade(name,origin,direction,length,table,mat,sides=10,up=Vector((0,0,1))):
    """A flat blade (flipper, fluke): table rows are (u, half width, half thickness), u from 0 to 1
    along `direction`; a negative u starts inside the body."""
    y=Vector(direction).normalized();x=y.cross(up)
    if x.length<.01:x=y.cross(Vector((1,0,0)))
    x.normalize();z=x.cross(y)
    m=Matrix(((x.x,y.x,z.x,origin[0]),(x.y,y.y,z.y,origin[1]),(x.z,y.z,z.z,origin[2]),(0,0,0,1)))
    o,info=loft(name,[(u*length,w,t,t,0,0) for u,w,t in table],sides,mat,2.6,xform=m)
    return o,info

def ribbon(name,points,half_width,mat,across=Vector((0,1,0))):
    verts=[];faces=[]
    for i,p in enumerate(points):
        w=half_width(i/(len(points)-1)) if callable(half_width) else half_width
        verts.extend([tuple(Vector(p)+across*w),tuple(Vector(p)-across*w)])
    for i in range(len(points)-1):faces.append((i*2,i*2+1,i*2+3,i*2+2))
    return mesh(name,verts,faces,mat)

def paint(o,fn):
    me=o.data;attr=me.color_attributes.get('DeepPaint') or me.color_attributes.new(name='DeepPaint',type='BYTE_COLOR',domain='CORNER')
    me.color_attributes.active_color=attr
    for loop in me.loops:attr.data[loop.index].color=(*fn(loop.vertex_index,me.vertices[loop.vertex_index].co.copy()),1)

def paint_flat(o,colour):paint(o,lambda i,p:colour)

def ball(name,at,scale,mat,colour,segments=10,rings=6):
    o=sphere(name,at,scale,mat,segments,rings);paint_flat(o,colour);return o

def whisker(name,start,end,bend,mat,colour):
    s=Vector(start);e=Vector(end);mid=(s+e)*.5+Vector(bend)
    o=pipe(name,[s,mid,e],[.0032,.0024,.0008],mat,4);paint_flat(o,colour);return o

def join_authored(role,parts,mat):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
    o=bpy.context.object;o.name=role
    for p in o.data.polygons:p.use_smooth=True
    node=mat.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='DeepPaint'
    mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    lo,hi=bounds([o]);o.data.transform(Matrix.Translation(-(lo+hi)*.5));o.data.update()
    return o

def looping_key(o,name,transform,seconds,amount=1.0):
    # One shape key swung from -amount to +amount over a seamless loop: a swim or float cycle.
    basis=o.shape_key_add(name='Basis');key=o.shape_key_add(name=name);key.slider_min=-1.0
    for i,v in enumerate(basis.data):key.data[i].co=transform(v.co.copy())
    n=int(seconds*24)
    for frame,value in [(1,0),(1+n//4,amount),(1+n//2,0),(1+3*n//4,-amount),(1+n,0)]:
        key.value=value;key.keyframe_insert('value',frame=frame)
    o.data.shape_keys.animation_data.action.name=name

# --- sardine: 0.32 m, slim and silver, one mesh a school can instance ------------------------
def build_sardine():
    mat=material('sardine / silver skin',(.5,.5,.5),.34,.35)
    L=.32;sides=8
    table=[(0,.001,.001,.001),(.025,.009,.011,.010),(.08,.016,.021,.018),(.18,.020,.029,.026),(.32,.020,.030,.027),(.48,.017,.026,.023),
           (.64,.013,.020,.017),(.78,.008,.012,.011),(.86,.005,.007,.007),(.90,.0035,.005,.005)]
    stations=[(-L/2+t*L,w,h1,h2,0) for t,w,h1,h2 in table]
    body,info=loft('sardine / body',stations,sides,mat,2.3)
    back=(.045,.14,.165);flank=(.66,.72,.74);belly=(.88,.88,.85);gill=(.80,.76,.60)
    def colour(i,p):
        si,k=info[i]
        if k is None:return flank
        c=math.cos(2*math.pi*k/sides);t=(p.y+L/2)/L
        rgb=flank
        if c>.2:rgb=mix(flank,back,smoothstep(.2,.9,c))
        if c<-.2:rgb=mix(flank,belly,smoothstep(-.2,-.8,c))
        if .13<t<.20:rgb=mix(rgb,gill,.45*(1-abs(t-.165)/.04))       # the gill cover catches the light
        return rgb
    paint(body,colour)
    fin=(.12,.17,.19)
    def tri(name,pts,colour_):
        o=mesh(name,pts,[tuple(range(len(pts)))],mat);paint_flat(o,colour_);return o
    parts=[body]
    tail_y=-L/2+.89*L;tip=L/2
    parts.append(tri('sardine / forked tail',[(0,tail_y,.004),(0,tip,.050),(0,tail_y+.030,0),(0,tip,-.050),(0,tail_y,-.004)],fin))
    parts.append(tri('sardine / dorsal fin',[(0,-.020,.029),(0,.012,.029),(0,.002,.050)],fin))
    parts.append(tri('sardine / anal fin',[(0,.052,-.026),(0,.082,-.022),(0,.074,-.040)],fin))
    for sign in (-1,1):
        parts.append(tri('sardine / pectoral fin',[(sign*.016,-.072,-.012),(sign*.028,-.050,-.020),(sign*.017,-.056,-.006)],fin))
        parts.append(ball('sardine / eye ring',(sign*.0145,-L/2+.070,.006),(.0042,.0078,.0078),mat,(.55,.56,.50),10,6))
        parts.append(ball('sardine / eye',(sign*.0165,-L/2+.070,.006),(.0030,.0055,.0055),mat,(.01,.01,.012),10,6))
    return join_authored('silver-school',parts,mat)

# --- California sea lion: 2.3 m, a sleek glide with a real face --------------------------------
def build_sea_lion():
    mat=material('sea lion / wet fur',(.5,.5,.5),.46)
    sides=20
    rows=[(-1.00,.012,.012,.012,.010),(-.97,.036,.033,.029,.010),(-.92,.054,.052,.041,.012),(-.85,.070,.072,.054,.022),(-.78,.088,.100,.072,.036),
          (-.70,.108,.136,.090,.050),(-.62,.122,.152,.104,.056),(-.52,.145,.170,.128,.046),(-.38,.192,.192,.172,.022),(-.20,.246,.226,.206,.005),
          (-.02,.276,.248,.226,.000),(.15,.278,.252,.226,.000),(.38,.264,.240,.212,.000),(.62,.222,.206,.176,.000),(.84,.168,.158,.134,.000),
          (1.00,.120,.114,.098,.000),(1.12,.082,.078,.068,.000),(1.20,.052,.050,.044,.000),(1.25,.014,.014,.012,.000)]
    mouth_k=[round(sides*105/360)%sides,round(sides*255/360)%sides]
    def radial(si,k):
        y=rows[si][0]
        if y<-.62 and k in mouth_k:return .96           # the line of the mouth
        return 1.0
    body,info=loft('sea lion / body',rows,sides,mat,2.2,radial)
    fur=(.115,.075,.045);belly=(.20,.135,.085);crest=(.34,.235,.14);muzzle=(.23,.16,.10);gum=(.025,.016,.012)
    def colour(i,p):
        si,k=info[i]
        if k is None:return fur
        c=math.cos(2*math.pi*k/sides);y=p.y
        rgb=fur
        if c<-.35:rgb=mix(fur,belly,smoothstep(-.35,-.9,c))
        if c>.3 and -.80<y<-.30:rgb=mix(rgb,crest,smoothstep(.3,.8,c)*smoothstep(-.80,-.66,y)*smoothstep(-.30,-.50,y))
        if y<-.78:rgb=mix(rgb,muzzle,smoothstep(-.78,-.92,y))
        if k in mouth_k and -.98<y<-.62:rgb=mix(rgb,gum,.8)
        n=value_noise(p,22);rgb=tuple(v*(.88+.24*n) for v in rgb)
        return rgb
    paint(body,colour)
    parts=[body]
    flipper=(.055,.037,.028)
    front=[(-.12,.060,.040),(0,.072,.036),(.12,.088,.030),(.30,.098,.024),(.50,.088,.019),(.70,.068,.014),(.85,.044,.010),(.95,.018,.007),(1.0,.004,.003)]
    for sign in (-1,1):
        f,finfo=blade('sea lion / foreflipper',(sign*.21,-.20,-.12),(sign*.58,.80,-.24),.82,front,mat);paint_flat(f,flipper);parts.append(f)
    hind=[(-.10,.045,.034),(0,.058,.030),(.20,.085,.022),(.42,.118,.016),(.62,.132,.012),(.80,.122,.009),(.92,.082,.006),(1.0,.014,.003)]
    for sign in (-1,1):
        h,hinfo=blade('sea lion / hind flipper',(sign*.035,1.12,0),(sign*.20,.97,.04),.50,hind,mat);paint_flat(h,flipper);parts.append(h)
    # The face: nose pad, big dark eyes, ears, whiskers.
    parts.append(ball('sea lion / nose',(0,-.992,.012),(.034,.030,.026),mat,(.012,.010,.010),10,6))
    for sign in (-1,1):
        parts.append(ball('sea lion / eye',(sign*.100,-.745,.070),(.025,.030,.028),mat,(.008,.007,.007),12,8))
        ear=pipe('sea lion / ear',[Vector((sign*.126,-.585,.108)),Vector((sign*.152,-.560,.146)),Vector((sign*.162,-.520,.176))],[.026,.019,.006],mat,6)
        paint_flat(ear,(.06,.040,.026));parts.append(ear)
        for j,(spread,drop) in enumerate([(0.0,0.02),(.05,-.005),(.09,-.03),(.13,-.055)]):
            start=Vector((sign*.050,-.905-j*.010,.0-j*.010));end=start+Vector((sign*(.17+spread),.020-spread*.25,-.08-drop))
            parts.append(whisker('sea lion / whisker',start,end,Vector((sign*.01,-.03,.02)),mat,(.76,.70,.58)))
    o=join_authored('sea-lion',parts,mat)
    looping_key(o,'glide-body-wave',lambda p:p+Vector((.035*math.sin(p.y*3.2),0,.028*math.sin(p.y*3.0)*smoothstep(-1,.5,p.y))),2.8)
    return o

# --- sea otter: 1.3 m, floating on its back, wrapped in kelp ---------------------------------
# The model lies belly up (+Z is its front), as the otter floats at the surface.
def build_otter():
    mat=material('otter / dense fur',(.5,.5,.5),.7)
    sides=18
    rows=[(-.62,.010,.012,.010,.060),(-.60,.034,.034,.028,.066),(-.56,.064,.058,.048,.074),(-.50,.094,.082,.068,.082),(-.42,.120,.100,.086,.084),
          (-.33,.130,.106,.096,.078),(-.24,.126,.098,.098,.062),(-.14,.150,.108,.114,.040),(-.02,.188,.124,.132,.015),(.14,.200,.130,.142,.000),
          (.32,.188,.124,.138,.000),(.48,.152,.106,.118,.000),(.60,.106,.080,.088,.000),(.70,.078,.060,.062,.000),(.80,.056,.044,.040,.000),
          (.89,.034,.028,.022,.000),(.94,.010,.010,.009,.000)]
    body,info=loft('otter / body',rows,sides,mat,2.2)
    dark=(.19,.115,.07);chest=(.26,.175,.11);head=(.58,.47,.33);dark_nose=(.012,.010,.010)
    def colour(i,p):
        si,k=info[i]
        y=p.y;rgb=dark
        c=math.cos(2*math.pi*k/sides) if k is not None else 1
        if c>0:rgb=mix(dark,chest,smoothstep(0,.8,c)*.8)
        rgb=mix(rgb,head,smoothstep(-.10,-.26,y))
        frost=value_noise(p,70);rgb=tuple(v*(.78+.50*frost) for v in rgb)         # guard hairs catch the light
        return rgb
    paint(body,colour)
    parts=[body]
    parts.append(ball('otter / nose',(0,-.612,.082),(.032,.024,.021),mat,dark_nose,10,6))
    for sign in (-1,1):
        parts.append(ball('otter / eye',(sign*.052,-.512,.137),(.012,.013,.012),mat,(.008,.006,.006),8,5))
        parts.append(ball('otter / ear',(sign*.104,-.350,.130),(.021,.018,.018),mat,(.22,.17,.11),8,5))
        arm=pipe('otter / forearm',[Vector((sign*.150,-.04,.100)),Vector((sign*.120,-.09,.125)),Vector((sign*.090,-.135,.142))],[.034,.031,.027],mat,8)
        paint(arm,lambda i,p:tuple(v*(.8+.4*value_noise(p,60)) for v in (.24,.16,.10)));parts.append(arm)
        parts.append(ball('otter / paw',(sign*.078,-.150,.148),(.030,.032,.021),mat,(.13,.085,.055),8,5))
        for j,(sx,sy) in enumerate([(.10,.0),(.095,.05),(.085,.10)]):
            parts.append(whisker('otter / whisker',Vector((sign*.032,-.575+j*.02,.100)),Vector((sign*(.032+sx),-.62+sy,.092-j*.02)),Vector((0,-.02,.015)),mat,(.80,.74,.62)))
    flip=[(-.10,.040,.026),(0,.054,.024),(.22,.080,.017),(.46,.098,.013),(.70,.094,.010),(.88,.066,.007),(1.0,.024,.004)]
    for sign in (-1,1):
        f,finfo=blade('otter / hind flipper',(sign*.09,.54,.0),(sign*.34,.92,.10),.30,flip,mat);paint_flat(f,(.045,.030,.022));parts.append(f)
    # Kelp wound over the belly in thin loops, with loose blades trailing off one side.
    kelp=(.16,.13,.040);kelp2=(.11,.15,.050)
    def section(y0):
        i=next(i for i in range(len(rows)-1) if rows[i][0]<=y0<=rows[i+1][0]);t=(y0-rows[i][0])/(rows[i+1][0]-rows[i][0])
        return [rows[i][j]*(1-t)+rows[i+1][j]*t for j in (1,2,3,4)]
    for n_,(y0,tilt) in enumerate([(.02,.10),(.16,-.12),(.30,.08),(.42,-.10)]):
        w,ht,hb,cz=section(y0);pts=[]
        for a in [x/12*math.radians(112) for x in range(-12,13)]:
            pts.append(Vector(((w+.010)*math.sin(a),y0+tilt*math.sin(a)*.5+.012*math.sin(a*3+n_),cz+(ht+.010)*math.cos(a))))
        r=ribbon('otter / kelp wrap',pts,lambda u,n_=n_:.016+.008*math.sin(u*math.pi*2.0+n_),mat);paint_flat(r,kelp if n_%2==0 else kelp2);parts.append(r)
    for j,(y0,length,side) in enumerate([(.02,.50,1),(.30,.42,1),(.16,.34,-1)]):
        w,ht,hb,cz=section(y0);pts=[];base=Vector((side*(w*.9),y0,cz+ht*.4))
        for q in range(11):
            u=q/10;pts.append(base+Vector((side*(.03*u+.20*u*u),length*u*(.30 if j%2 else -.30)+.045*math.sin(u*6+j),-.05*u-.30*u*u)))
        r=ribbon('otter / kelp blade',pts,lambda u:.026*math.sin(math.pi*(.10+.90*u))+.004,mat,Vector((0,1,0)));paint_flat(r,kelp2);parts.append(r)
    o=join_authored('otter',parts,mat)
    looping_key(o,'float-paddle',lambda p:p+Vector((0,0,.05*smoothstep(.55,.95,p.y)*math.sin(p.x*18)+.012*smoothstep(-.3,-.1,p.y)*(1-smoothstep(.1,.4,p.y)))),3.2)
    return o

# --- gray whale: 14 m, mottled, short paddle flippers, a low hump and knuckles, no fin -------
def build_gray_whale():
    mat=material('whale / mottled grey skin',(.5,.5,.5),.62)
    sides=24;y0=-7.0;span=13.4
    table=[(0,.02,.02,.02,.04),(.02,.34,.22,.20,.0),(.05,.62,.38,.40,.0),(.10,.95,.58,.62,.0),(.18,1.20,.82,.86,.0),(.30,1.45,1.18,1.14,.0),
           (.42,1.55,1.30,1.22,.0),(.55,1.42,1.22,1.12,.0),(.66,1.14,.98,.94,.0),(.76,.80,.70,.68,.0),(.85,.50,.46,.42,.0),
           (.92,.32,.30,.27,.0),(.97,.24,.21,.19,.0),(1.0,.19,.16,.15,.0)]
    ss=[x/40 for x in range(0,24)]+[.6+x*.0125 for x in range(0,33)]
    ss=sorted(set(round(s,4) for s in ss if s<=1.0))
    rows=[]
    def hump(s):return .17*math.exp(-((s-.60)/.045)**2)
    def knuckle(s):
        # Six to eight low knuckles down the back of the tail, where a dorsal fin would be.
        return sum(.075*math.exp(-((s-c)/.0075)**2) for c in [.70,.735,.77,.805,.84,.875,.91])
    for s in ss:
        w,ht,hb,cz=spline(table,s);rows.append((y0+s*span,max(.01,w),max(.01,ht+hump(s)+knuckle(s)),max(.01,hb),cz))
    def radial(si,k):
        s=ss[si];a=360*k/sides;r=1.0
        if s<.22 and abs(a-105)<1 or s<.22 and abs(a-255)<1:r*=.975      # the long line of the mouth
        if .10<s<.34 and k in (12,):r*=.985                                  # throat grooves
        if .12<s<.32 and k in (11,13):r*=.985
        return r
    body,info=loft('whale / body',rows,sides,mat,2.4,radial)
    top=(.095,.105,.115);under=(.20,.205,.20);scar=(.36,.355,.32);lice=(.50,.46,.36);slit=(.03,.032,.036)
    def colour(i,p):
        si,k=info[i];s=ss[si]
        if k is None:return top
        a=360*k/sides;c=math.cos(math.radians(a))
        rgb=mix(top,under,smoothstep(.25,-.65,c))
        n1=value_noise(p,.9);n2=value_noise(p,2.6);n3=value_noise(p,8.0)
        # Pale mottling and old scars over slate, heaviest across the back and flanks.
        patch=smoothstep(.56,.80,n1*.55+n2*.45);rgb=mix(rgb,scar,patch*.55)
        rgb=mix(rgb,(.035,.04,.045),smoothstep(.60,.84,n2)*.55*(1-patch))
        # Whale lice and barnacles gather on the head, jaw and around the blowholes.
        if s<.30:rgb=mix(rgb,lice,smoothstep(.70,.88,n3)*.8*smoothstep(.30,.10,s))
        if abs(a-105)<1 or abs(a-255)<1:
            if s<.22:rgb=mix(rgb,slit,.85*smoothstep(.22,.14,s))
        if k in (1,sides-1) and .185<s<.225:rgb=slit
        return rgb
    paint(body,colour)
    parts=[body]
    # Tail flukes: broad, swept, with the centre notch.
    span_half=1.85;stations=[]
    for q in range(-12,13):
        v=q/12;a=abs(v)
        lead=6.20+.95*a**1.25;trail=6.78+.20*a-.20*max(0,1-a/.10)
        if a>.98:trail=lead+.03
        stations.append((v*span_half,max(.02,(trail-lead)/2),.085*(1-.6*a)+.012,.085*(1-.6*a)+.012,0,(lead+trail)/2))
    # sections have chord along local x (width) and thickness along z; centre x holds the sweep. Rotate so the span runs along world x.
    fl,finfo=loft('whale / flukes',[(st[0],st[1],st[2],st[3],0,st[5]) for st in stations],10,mat,2.6,
        xform=Matrix(((0,1,0,0),(1,0,0,0),(0,0,1,0),(0,0,0,1))))
    paint(fl,lambda i,p:mix((.075,.08,.09),(.25,.25,.24),smoothstep(6.3,7.2,p.y)*.5+.25*value_noise(p,6)))
    parts.append(fl)
    # Pectoral flippers: short, broad paddles with a rounded point, hung low behind the head.
    paddle=[(-.12,.22,.12),(0,.30,.11),(.14,.40,.09),(.34,.47,.07),(.56,.44,.05),(.76,.34,.035),(.90,.20,.022),(1.0,.05,.012)]
    for sign in (-1,1):
        f,finfo=blade('whale / flipper',(sign*1.25,y0+.31*span,-.80),(sign*.84,.46,-.22),1.9,paddle,mat,12)
        paint(f,lambda i,p:mix((.10,.11,.12),(.30,.30,.28),smoothstep(.2,.8,value_noise(p,3.4))*.8));parts.append(f)
        # eye
        e_s=.185;w,ht,hb,cz=spline(table,e_s)
        parts.append(ball('whale / eye',(sign*(w-.02),y0+e_s*span,cz+.20),(.045,.06,.055),mat,(.02,.018,.016),10,6))
    o=join_authored('whale',parts,mat)
    def swim(p):
        t=max(0,(p.y+7.0)/14.0);return p+Vector((0,0,1.3*t**2.2))
    looping_key(o,'Swim',swim,4.0)
    return o

AUTHORED_FINAL={'silver-school':build_sardine,'sea-lion':build_sea_lion,'otter':build_otter,'whale':build_gray_whale}

# Shape adaptation uses imported source topology and UVs; it never replaces a
# donor animal with a procedural whole body. Only moray and clam are authored.
DIMENSIONS={'reef-fish':.28,'turtle':1.05,'ray':1.45,'manta':4.2,
            'crab':.30,'grouper':1.20,'reef-shark':1.8,
            'jellyfish':.65,'octopus':1.5,'wreck-hull':32.0,'anchor':1.8,'sunken-boat':6.0}

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
    m=material(role+' / fitted muted skin',(.5,.5,.5),.48 if role in ['reef-fish','grouper'] else .72, 0,alpha,.07 if role=='jellyfish' else 0)
    o.data.materials.clear();o.data.materials.append(m)
    attr=o.data.color_attributes.get('DeepPaint') or o.data.color_attributes.new(name='DeepPaint',type='BYTE_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
    for p in o.data.polygons:p.material_index=0;p.use_smooth=True
    lo,hi=bounds([o]);size=hi-lo
    for loop in o.data.loops:
        p=o.data.vertices[loop.vertex_index].co;t=(p.y-lo.y)/max(.001,size.y);z=(p.z-lo.z)/max(.001,size.z);rgb=old[loop.index]
        palettes={'reef-fish':(.075,.24,.31),'turtle':(.16,.22,.095),'ray':(.12,.18,.19),'crab':(.19,.075,.035),'grouper':(.26,.185,.10),'jellyfish':(.45,.245,.32),'octopus':(.25,.087,.039),'anchor':(.22,.16,.09),'wreck-hull':(.155,.17,.15),'sunken-boat':(.14,.16,.13)}
        base=palettes[role]
        if role=='reef-fish' and t>.79:base=(.58,.45,.09)
        if role=='turtle':base=(.115,.15,.057) if z>.58 else (.18,.27,.115)
        if role=='ray' and z<.35:base=(.38,.38,.30)
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
    length_axis=0 if role in ['ray','crab','octopus'] else (2 if role=='jellyfish' else 1)
    scale=DIMENSIONS[role]/span[length_axis]
    for v in o.data.vertices:v.co=(v.co-centre)*scale
    if role=='ray':
        for v in o.data.vertices:v.co.z*=.45
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
    if role=='crab':
        morph(o,'side-scuttle-legs',lambda p:p+Vector((0,.018*math.sin(p.x*90) if abs(p.x)>.07 else 0,.012 if abs(p.x)>.09 else 0)),1.6)
        for frame,x in [(1,0),(20,.045),(40,0)]:o.location.x=x;o.keyframe_insert('location',frame=frame)
        o.animation_data.action.name='side-scuttle'
    if role=='jellyfish':morph(o,'gentle-bell-pulse',lambda p:Vector((p.x*(.91 if p.z>.08 else 1),p.y*(.91 if p.z>.08 else 1),p.z+(.025 if p.z>.08 else .01))),4)
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
    elif role in AUTHORED_FINAL:AUTHORED_FINAL[role]()
    elif role in ['manta','reef-shark']:fit_rig(role,rows[role])
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
    if role in ['manta','whale','sea-lion'] and not g.get('animations'):raise RuntimeError('Lost swim clip '+role)
    if role in ['silver-school','sea-lion','otter'] and (len(g['meshes'])!=1 or len(g['meshes'][0]['primitives'])!=1):raise RuntimeError('An instanced model must be one mesh with one primitive '+role)
    if any('uri' in x and not x['uri'].startswith('data:') for x in g.get('images',[])+g.get('buffers',[])):raise RuntimeError('External runtime dependency '+role)
    return {'id':role,'path':'assets/models/deep/'+role+'.glb','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'triangles':tris,'boundsBlender':{'min':list(lo),'max':list(hi)},'dimensionsMetres':list(hi-lo),'clips':[a.get('name') for a in g.get('animations',[])],'primitives':sum(len(m['primitives']) for m in g['meshes']),'authored':role in AUTHORED}

def main():
    a,root,evidence=arguments()
    if not (root/'docs/board/cards/DEEP-ART-SRC.md').is_file():raise RuntimeError('Not the owned game lane')
    if not (evidence.as_posix().find('/.evidence/')>=0):raise RuntimeError('Raw evidence must use ignored .evidence')
    evidence.mkdir(parents=True,exist_ok=True);rows=donors(root)
    if a.inspect:
        result=[]
        for role in ROLES:
            if role in AUTHORED or a.only and role!=a.only:continue
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
    report={'formatVersion':1,'round':3,'coordinates':'metres; glTF Y up; Blender -Y forward maps to glTF +Z','models':results,'failures':failures,
        'artStatus':'working-art','featureFlag':'the-deep','releaseAccepted':False,'heldRoles':[]}
    (evidence/('fit-report-'+(a.only or 'all')+'.json')).write_text(json.dumps(report,indent=2)+'\n')
    manifest=root/'public/assets/models/deep/manifest.json'
    if not a.only and not failures:manifest.write_text(json.dumps(report,indent=2)+'\n')
    elif a.only and not failures and manifest.is_file():
        # One role refitted: replace (or add) only its row, in recipe order.
        saved=json.loads(manifest.read_text());rows={m['id']:m for m in saved['models']};rows[a.only]=results[0]
        saved['models']=[rows[role] for role in ROLES if role in rows];manifest.write_text(json.dumps(saved,indent=2)+'\n')
    if failures:raise RuntimeError(str(failures))



if __name__=='__main__':main()
