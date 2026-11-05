"""Shared, hand-built Scablands town materials and construction helpers.

Coordinates at this API are glTF metres: X right, Y up, front -Z.
Run the proof with town-sample.py; Blender's Y-up export is explicit.
"""
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

PALETTE = {
    'rusted-steel': ((.25,.105,.055), .62), 'galvanised-tin': ((.38,.39,.35), .78),
    'weathered-plank': ((.28,.22,.15), 0), 'patched-canvas': ((.37,.31,.22), 0),
    'cracked-concrete': ((.32,.31,.28), 0), 'salvaged-brick': ((.34,.19,.12), 0),
    'dirty-glass': ((.16,.20,.18), .12), 'faded-hand-paint': ((.43,.34,.20), 0),
    'sand': ((.38,.30,.20), 0), 'iron-dark': ((.09,.095,.085), .7),
}

def game_vector(p):
    return Vector((p[0], -p[2], p[1]))

def make_materials(texture_sources=None):
    """Build the shared 1K atlas, painting tin and sand from photo sources.

    ``texture_sources`` maps material names to image paths. Photo tiles are
    packed into the exported GLB; the original references stay outside Git.
    """
    import numpy as np
    texture_sources = texture_sources or {}
    rng = np.random.default_rng(1405)
    image = bpy.data.images.new('Scablands shared town wear atlas 1K', 1024, 1024, alpha=True)
    pixels = np.ones((1024,1024,4), dtype=np.float32)
    cell=256
    materials={}
    for i,(name,(color,metal)) in enumerate(PALETTE.items()):
        col=i%4; row=i//4; y0=row*cell; x0=col*cell
        # Broad pigment variation plus sparse chips keeps the atlas readable
        # and compact when embedded in the runtime GLB.
        base=np.array(color,dtype=np.float32)[None,None,:]
        swatch=np.broadcast_to(base,(cell,cell,3)).copy()
        source_path=texture_sources.get(name)
        if source_path:
            source=bpy.data.images.load(str(Path(source_path).resolve()),check_existing=False)
            source.scale(cell,cell)
            source_pixels=np.empty(cell*cell*4,dtype=np.float32)
            source.pixels.foreach_get(source_pixels)
            swatch=source_pixels.reshape((cell,cell,4))[:,:,:3].copy()
            bpy.data.images.remove(source)
            if name=='rusted-steel':
                swatch=np.clip(swatch*np.array([.68,.46,.28],dtype=np.float32)[None,None,:],0,1)
            elif name=='sand':
                luminance=(swatch[:,:,0:1]*.30+swatch[:,:,1:2]*.59+swatch[:,:,2:3]*.11)
                swatch=np.clip((swatch*.78+luminance*.22)*1.04,0,1)
        else:
            # Quiet pigment variation only for materials without a photo input.
            noise=rng.normal(0,.012,(cell,cell,1)).astype(np.float32)
            swatch=np.clip(swatch+noise,0,1)
        if name in ('galvanised-tin','rusted-steel'):
            if not source_path:
                yy=np.arange(cell,dtype=np.float32)[:,None]
                xx=np.arange(cell,dtype=np.float32)[None,:]
                fade=np.clip(1.12-yy/cell*.34,.72,1.10)[...,None]
                oxide=np.array([.29,.105,.025],dtype=np.float32)[None,None,:]
                streak=np.clip((yy/cell-.25)*.55,0,.46)[...,None]
                swatch=np.clip(swatch*fade*(1-streak)+oxide*streak,0,1)
                for bx in (34,91,155,219):
                    drip=np.exp(-((xx-bx)/2.5)**2)*np.clip((yy-38)/150,0,1)
                    swatch=np.clip(swatch*(1-drip[...,None]*.50)+oxide*drip[...,None]*.50,0,1)
        if name=='weathered-plank':
            stripes=(np.sin(np.arange(cell,dtype=np.float32)[None,:]*.23)*.045)[...,None]
            swatch=np.clip(swatch+stripes,0,1)
        pixels[y0:y0+cell,x0:x0+cell,:3]=swatch
    image.pixels.foreach_set(pixels.ravel()); image.pack()
    for i,(name,(color,metal)) in enumerate(PALETTE.items()):
        mat=bpy.data.materials.new('Town / '+name); mat.diffuse_color=(*color,1); mat.use_nodes=True
        nodes=mat.node_tree.nodes; bsdf=nodes.get('Principled BSDF'); bsdf.inputs['Metallic'].default_value=metal
        bsdf.inputs['Roughness'].default_value=.88
        tex=nodes.new('ShaderNodeTexImage'); tex.image=image; tex.interpolation='Linear'; tex.extension='EXTEND'
        coord=nodes.new('ShaderNodeTexCoord');split=nodes.new('ShaderNodeSeparateXYZ');combine=nodes.new('ShaderNodeCombineXYZ')
        mat.node_tree.links.new(coord.outputs['UV'],split.inputs[0])
        for axis in 'XYZ':
            wrap=nodes.new('ShaderNodeMath');wrap.operation='FRACT';mat.node_tree.links.new(split.outputs[axis],wrap.inputs[0])
            mat.node_tree.links.new(wrap.outputs[0],combine.inputs[axis])
        scale=nodes.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=.24
        mat.node_tree.links.new(combine.outputs['Vector'],scale.inputs[0])
        offset=nodes.new('ShaderNodeVectorMath'); offset.operation='ADD'
        offset.inputs[1].default_value=((i%4)*.25+.003,(i//4)*.25+.003,0)
        mat.node_tree.links.new(scale.outputs['Vector'],offset.inputs[0])
        mat.node_tree.links.new(offset.outputs['Vector'],tex.inputs['Vector'])
        # Photo detail stays crisp. Corrugated sheets provide their own depth.
        mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
        materials[name]=mat
    return materials

def cube(name, center, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=game_vector(center))
    o=bpy.context.object; o.name=name; o.dimensions=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    uv_layer=o.data.uv_layers.active or o.data.uv_layers.new(name='Physical 2m material tiling')
    for polygon in o.data.polygons:
        normal=polygon.normal
        for loop_index in polygon.loop_indices:
            vertex=o.data.vertices[o.data.loops[loop_index].vertex_index].co
            if abs(normal.x)>=abs(normal.y) and abs(normal.x)>=abs(normal.z):
                u,v=vertex.y,vertex.z
            elif abs(normal.y)>=abs(normal.z):
                u,v=vertex.x,vertex.z
            else:
                u,v=vertex.x,vertex.y
            uv_layer.data[loop_index].uv=(u/2,v/2)
    if bevel:
        mod=o.modifiers.new('worn rounded cut edge','BEVEL'); mod.width=bevel; mod.segments=1
        o.modifiers.new('weighted face normals','WEIGHTED_NORMAL')
    return o

def beam(name, a, b, width, mat):
    va=game_vector(a); vb=game_vector(b); d=vb-va
    o=cube(name,((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),(width,d.length,width),mat,.012)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); return o

def corrugated_sheet(name, center, width, height, materials, bent=0, turn=0):
    x,y,z=center
    # 100 mm pitch, formed into the sheet itself; alternating valleys and
    # crowns produce real grazing highlights rather than painted pinstripes.
    pitch=.10; count=max(5,round(width/pitch)); dx=width/count
    verts=[]; faces=[]
    for row,yy in enumerate((-height/2,height/2)):
        for i in range(count+1):
            xx=-width/2+i*dx
            wave=.035*(1 if i%2==0 else -1)
            if abs(xx-width*.47)<.075 and yy>height*.34: wave+=.095
            # Blender's Z axis is up here; Y is the wall normal.
            verts.append((xx,wave,yy))
    front_count=len(verts)
    # A second formed surface gives the sheet visible edge thickness without
    # Solidify's many edge faces multiplying every narrow ridge's triangle cost.
    verts.extend((vx,vy-.018,vz) for vx,vy,vz in tuple(verts))
    for i in range(count):
        front=(i,i+1,count+2+i,count+1+i)
        back=tuple(index+front_count for index in reversed(front))
        faces.extend((front,back))
    mesh=bpy.data.meshes.new(name+' 100mm pressed profile');mesh.from_pydata(verts,[],faces);mesh.update()
    uv_layer=mesh.uv_layers.new(name='Physical tin UV')
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            vx,_,vz=verts[mesh.loops[loop_index].vertex_index]
            uv_layer.data[loop_index].uv=(vx/2,vz/2)
    plate=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(plate)
    plate.location=game_vector((x,y,z));plate.data.materials.append(materials['galvanised-tin'])
    # Keep the folded faces flat shaded: weighted normals hide the real 100 mm
    # ridges that catch the sun and make this read as pressed tin.
    for polygon in mesh.polygons: polygon.use_smooth=False
    # Irregular exposed lap seam, fastener heads and a turned-up torn corner.
    for i in range(4):
        yy=y-height*.37+i*height*.22
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=5,radius=.027,location=game_vector((x+width*.45,yy,z-.035)))
        rivet=bpy.context.object;rivet.name=f'{name}-lap-rivet-{i+1}';rivet.scale=(1,.72,.45);rivet.data.materials.append(materials['iron-dark'])
    angle=bent+turn;plate.rotation_euler[2]+=angle
    return plate

def pitched_roof(name, center, width, depth, materials):
    x,y,z=center
    for side in (-1,1):
        p=cube(name+'-panel-'+str(side),(x,y-.25,z+side*depth*.22),(width*1.12,.075,depth*.62),materials['galvanised-tin'],.012)
        p.rotation_euler[0]=side*.23
    beam(name+'-ridge-seam',(x-width*.58,y,z),(x+width*.58,y,z),.07,materials['rusted-steel'])

def pipe_run(name, points, radius, material):
    for i,(a,b) in enumerate(zip(points,points[1:])):
        va=game_vector(a); vb=game_vector(b); d=vb-va
        mid=(va+vb)*.5
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=d.length,location=mid)
        o=bpy.context.object;o.name=f'{name}-{i+1}';o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(material)

def scaffold_bay(name, origin, width, depth, height, materials):
    x,y,z=origin
    for sx in (-1,1):
        for sz in (-1,1):
            px=x+sx*width/2;pz=z+sz*depth/2
            beam(name+'-post',(px,y,pz),(px,y+height,pz),.12,materials['weathered-plank'])
    for yy in (y+.5,y+height*.7):
        beam(name+'-front-rail',(x-width/2,yy,z-depth/2),(x+width/2,yy,z-depth/2),.09,materials['iron-dark'])
    beam(name+'-brace',(x-width/2,y+.4,z-depth/2),(x+width/2,y+height*.7,z-depth/2),.07,materials['rusted-steel'])

def weld_seam(name,a,b,mat): beam(name,a,b,.035,mat)

def rivet_strip(name,origin,count,spacing,mat):
    x,y,z=origin
    for i in range(count): cube(f'{name}-{i+1}',(x+i*spacing,y,z),(.075,.075,.075),mat,.02)

def hand_painted_sign(name,center,text,materials):
    import bpy
    x,y,z=center
    cube(name+'-board',(x,y,z),(1.9,.85,.11),materials['weathered-plank'],.025)
    font=bpy.data.curves.new(name+'-lettering','FONT');font.body=text;font.size=.33;font.extrude=.002
    obj=bpy.data.objects.new(name+'-readable-text',font);bpy.context.collection.objects.link(obj)
    obj.location=game_vector((x-.78,y-.12,z+.07));obj.rotation_euler=(-math.pi/2,0,0)
    font.materials.append(materials['faded-hand-paint'])

def washing_line(name,a,b,materials):
    beam(name+'-wire',a,b,.025,materials['iron-dark'])
    for i,matname in enumerate(('patched-canvas','faded-hand-paint','rusted-steel')):
        t=(i+1)/4;x=a[0]+(b[0]-a[0])*t; y=a[1]+(b[1]-a[1])*t;z=a[2]+(b[2]-a[2])*t
        cube(f'{name}-cloth-{i+1}',(x,y-.32,z),(.46,.62,.035),materials[matname],.01)

def sandbag_row(name,origin,count,materials):
    x,y,z=origin
    for i in range(count):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=game_vector((x+i*.48,y,z)))
        o=bpy.context.object;o.name=f'{name}-{i+1}';o.scale=(.25,.16,.17);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        o.data.materials.append(materials['patched-canvas'])

def drum(name,center,materials):
    x,y,z=center
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.32,depth=.9,location=game_vector(center))
    o=bpy.context.object;o.name=name;o.data.materials.append(materials['rusted-steel'])
    for dy in (-.27,.27):
        bpy.ops.mesh.primitive_torus_add(major_radius=.32,minor_radius=.025,major_segments=12,minor_segments=6,location=game_vector((x,y+dy,z)))
        bpy.context.object.name=name+'-rolled-rim';bpy.context.object.data.materials.append(materials['iron-dark'])

def tyre_stack(name,center,materials,count=3):
    x,y,z=center
    for i in range(count):
        bpy.ops.mesh.primitive_torus_add(major_radius=.46,minor_radius=.18,major_segments=12,minor_segments=6,location=game_vector((x,y+i*.31,z)))
        o=bpy.context.object;o.name=f'{name}-{i+1}';o.data.materials.append(materials['iron-dark'])

def footprint(objects, name='footprint'):
    points=[]
    for obj in objects:
        if obj.type=='MESH': points.extend([obj.matrix_world @ Vector(corner) for corner in obj.bound_box])
    if not points: raise ValueError('footprint needs at least one mesh')
    xs=[p.x for p in points]; ys=[p.z for p in points]; zs=[p.y for p in points]
    return {'name':name,'width':max(xs)-min(xs),'depth':max(ys)-min(ys),'height':max(zs)-min(zs),
            'center':((max(xs)+min(xs))/2,(max(zs)+min(zs))/2,-(max(ys)+min(ys))/2)}

def export_glb(path):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,
                              export_apply=True,export_materials='EXPORT')

def building_variation(seed):
    """Return a repeatable roof and clutter recipe for one town building."""
    rng=random.Random(seed)
    return {
        'roof_pitches': (rng.uniform(.22,.58), rng.uniform(.24,.62)),
        'roof_materials': (rng.choice(('galvanised-tin','rusted-steel','faded-hand-paint')),
                           rng.choice(('galvanised-tin','rusted-steel','weathered-plank'))),
        'roof_lifts': (rng.uniform(-.16,.12),rng.uniform(-.12,.18)),
        'roof_overhang': rng.uniform(1.08,1.28),
        'roof_counts': (rng.randint(1,3),rng.randint(1,3)),
        'clutter': rng.choice(('lean-to','tank','stack','awning','mast','loft')),
        'lean_side': rng.choice((-1,1)),
        'accent': rng.choice(('rusted-steel','galvanised-tin','faded-hand-paint')),
    }

def varied_roof(name, center, width, depth, materials, variation):
    """Make a roof with independently sized, sloped and coloured salvage panels."""
    x,y,z=center
    panels=[]
    rng=random.Random(variation['roof_counts'][0]*131+variation['roof_counts'][1]*17+round(width*100))
    for side in (-1,1):
        index=0 if side<0 else 1
        count=variation['roof_counts'][index];segment=width*variation['roof_overhang']/count
        for part in range(count):
            px=x-width*variation['roof_overhang']/2+segment*(part+.5)
            panel=cube(f'{name}-panel-{side}-{part+1}',
                       (px,y+variation['roof_lifts'][index]+rng.uniform(-.10,.12),z+side*depth*.20),
                       (segment*rng.uniform(.94,1.08),.08,depth*rng.uniform(.56,.72)),
                       materials[variation['roof_materials'][index]],.018)
            panel.rotation_euler[0]=side*variation['roof_pitches'][index]+rng.uniform(-.08,.08)
            panel.rotation_euler[1]=rng.uniform(-.07,.07)
            panels.append(panel)
    beam(name+'-ragged-ridge',(x-width*.57,y+.05,z),(x+width*.57,y+.05,z),.07,materials['rusted-steel'])
    return panels
