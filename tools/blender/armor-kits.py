"""Build nine vehicle-local armor kit GLBs from the approved scrap texture.

Run Blender headless: blender -b --python tools/blender/armor-kits.py -- --root <repo>
All dimensions are metres, +Z forward. Empty nodes are the stable runtime
visibility contract; component meshes are fitted separately to each car.
"""
import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

SIZES = {
    'falcone_f42': (2.30, 4.80, 1.36),
    'stuttgart_959s': (2.30, 4.80, 1.48),
    'falcone_heritage': (2.36, 4.80, 1.36),
    'aurora_gt': (2.34, 4.80, 1.32),
    'dusthawk_rally': (2.10, 4.20, 1.68),
    'banshee_muscle': (2.26, 5.10, 1.47),
    'viper_proto': (2.20, 4.90, 1.10),
    'titan_monster': (2.80, 5.20, 3.60),
    'koenigsegg_jesko': (2.10, 4.95, 1.25),
}

if '--paths-only' in sys.argv:
    dry = argparse.ArgumentParser()
    dry.add_argument('--root', required=True)
    dry.add_argument('--cars', nargs='*', choices=SIZES.keys(), default=list(SIZES))
    dry.add_argument('--paths-only', action='store_true')
    dry_args = dry.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
    dry_root = Path(dry_args.root).resolve()
    print(json.dumps({
        'blend': [str(dry_root/'art-build/wasteland/kits'/f'{car}.blend')
                  for car in dry_args.cars],
        'glb': [str(dry_root/'public/assets/models/wasteland/kits'/f'{car}.glb')
                for car in dry_args.cars],
        'textures': [str(dry_root/'public/assets/textures/scrap-plating.png')],
        'evidence': [str(dry_root/'.evidence/gfx-03/kit-metal-256.png')],
    }))
    raise SystemExit(0)

import bpy
import bmesh
from mathutils import Vector


def weld_and_offset_shell(mesh, car, paint_rear_z=None):
    bm=bmesh.new()
    bm.from_mesh(mesh)
    before=(len(bm.verts),sum(not edge.is_manifold for edge in bm.edges))
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0005)
    bm.normal_update()
    after=(len(bm.verts),sum(not edge.is_manifold for edge in bm.edges))
    rear_z=min(vertex.co.z for vertex in bm.verts)
    rear_normals=[vertex.normal.z for vertex in bm.verts if vertex.co.z<=rear_z+.035]
    print(f'SHELL_REAR {car} z={rear_z:.4f} normals={min(rear_normals):.3f}/{max(rear_normals):.3f} count={len(rear_normals)}')
    rear_distance={vertex:vertex.co.z-rear_z for vertex in bm.verts}
    for vertex in bm.verts:
        normal=vertex.normal.copy()
        if vertex.co.z<=rear_z+.035 and normal.z>0:
            normal.z=-normal.z
        vertex.co+=normal*.02
    if paint_rear_z is not None:
        rear_current=min(vertex.co.z for vertex in bm.verts
                         if rear_distance[vertex]<=.035)
        desired=paint_rear_z-.02
        if rear_current>paint_rear_z-.002:
            correction=desired-rear_current
            for vertex in bm.verts:
                distance=rear_distance[vertex]
                weight=1 if distance<=.04 else max(0,1-(distance-.04)/.21)
                vertex.co.z+=correction*weight
            print(f'SHELL_REAR_FIT {car} {rear_current:.4f}->{desired:.4f} delta={correction:.4f}')
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    print(f'SHELL_WELD {car} vertices {before[0]}->{after[0]} nonmanifold_edges {before[1]}->{after[1]}')


def paint_shell_uv(mesh):
    uv=mesh.uv_layers.active or mesh.uv_layers.new(name='Body-painted rust')
    low=[min(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]
    high=[max(vertex.co[axis] for vertex in mesh.vertices) for axis in range(3)]
    def mapped(value,axis):
        return .02+.96*(value-low[axis])/max(.001,high[axis]-low[axis])
    for face in mesh.polygons:
        direction=max(range(3),key=lambda axis:abs(face.normal[axis]))
        axes=(2,1) if direction==0 else (0,2) if direction==1 else (0,1)
        for loop in face.loop_indices:
            p=mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv=(mapped(p[axes[0]],axes[0]),mapped(p[axes[1]],axes[1]))


def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def finish(obj, name, parent, material):
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def plate(name, parent, material, center, width, height, depth, lean=0, clipped=0.10):
    """Six-point bent sheet, with real edge thickness rather than a flat box."""
    x, y, z = center
    hw, hh, hd = width / 2, height / 2, depth / 2
    outline = [(-hw + clipped, -hh), (hw - clipped, -hh),
               (hw, -hh + clipped), (hw - lean, hh),
               (-hw - lean, hh), (-hw, -hh + clipped)]
    verts = [(px, py, -hd) for px, py in outline] + [
        (px, py, hd) for px, py in outline]
    faces = [(5, 4, 3, 2, 1, 0), (6, 7, 8, 9, 10, 11)]
    faces += [(i, (i + 1) % 6, (i + 1) % 6 + 6, i + 6) for i in range(6)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='Painted metal')
    for face in mesh.polygons:
        for loop_index in face.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = ((vertex.x * .17 + .5) % .95,
                                      (vertex.y * .25 + vertex.z * .07 + .5) % .95)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, z)
    return finish(obj, name, parent, material)


def rod(name, parent, material, start, end, radius=.045, vertices=8):
    axis = Vector(end) - Vector(start)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=axis.length)
    obj = bpy.context.object
    obj.location = (Vector(start) + Vector(end)) / 2
    obj.rotation_euler = Vector((0, 0, 1)).rotation_difference(axis).to_euler()
    return finish(obj, name, parent, material)


def tapered_tooth(name, parent, material, start, end, radius=.07):
    axis=Vector(end)-Vector(start)
    bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=radius,radius2=.005,
                                    depth=axis.length)
    obj=bpy.context.object
    obj.location=(Vector(start)+Vector(end))/2
    obj.rotation_euler=Vector((0,0,1)).rotation_difference(axis).to_euler()
    return finish(obj,name,parent,material)


def saw_disc(name,parent,material,center,radius=.18,points=12):
    x,y,z=center
    verts=[]
    for offset in [-.025,.025]:
        for index in range(points*2):
            angle=index*math.pi/points
            r=radius if index%2==0 else radius*.78
            verts.append((x+offset,y+math.sin(angle)*r,z+math.cos(angle)*r))
    faces=[tuple(range(points*2-1,-1,-1)),
           tuple(range(points*2,points*4))]
    faces += [(i,(i+1)%(points*2),(i+1)%(points*2)+points*2,i+points*2)
              for i in range(points*2)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name='Toothed steel')
    for face in mesh.polygons:
        for loop in face.loop_indices:
            p=mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv=((p.y*.7+.5)% .95,(p.z*.7+.5)% .95)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj,name,parent,material)


def arch_sheet(name, parent, material, side, axle, width, height, span=1.82):
    """Thin door/fender sheet cut above the actual axle's wheel arch."""
    wheel_z, wheel_y, radius = axle['z'], axle['y'], axle['radius']
    z0, z1 = wheel_z-span/2, wheel_z+span/2
    base = max(.32, wheel_y + radius*.18)
    crown = wheel_y + radius + .11
    top = max(crown+.22, min(height*.81, crown+.48))
    r = min(radius*.96, span*.38)
    profile = [(z0,top-.07),(z1,top),(z1,base),
               (wheel_z+r,base),(wheel_z+r*.70,crown-.06),
               (wheel_z,crown),(wheel_z-r*.70,crown-.06),
               (wheel_z-r,base),(z0,base)]
    x = side*(width/2+.055)
    verts=[(x+side*offset,y,z) for offset in (-.025,.025) for z,y in profile]
    n=len(profile)
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name='Painted sheet')
    for face in mesh.polygons:
        for loop in face.loop_indices:
            v=mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv=((v.z*.19+.5)% .95,(v.y*.27+.34)% .95)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj,name,parent,material)


def body_x(fit, side, z, default, y=None):
    key='right' if side > 0 else 'left'
    def along(samples):
        valid=[sample for sample in samples if sample[key] is not None]
        if not valid:
            return None
        if z <= valid[0]['z']:
            return valid[0][key]
        if z >= valid[-1]['z']:
            return valid[-1][key]
        for a,b in zip(valid,valid[1:]):
            if a['z']<=z<=b['z']:
                return a[key]+(b[key]-a[key])*(z-a['z'])/(b['z']-a['z'])
        return None
    if y is None:
        return along(fit['bodySide']) or side*default
    rows=[(row['y'],along(row['samples'])) for row in fit['bodyGrid']]
    rows=[(height,x) for height,x in rows if x is not None]
    if not rows:
        return side*default
    if y<=rows[0][0]:
        return rows[0][1]
    if y>=rows[-1][0]:
        return rows[-1][1]
    for a,b in zip(rows,rows[1:]):
        if a[0]<=y<=b[0]:
            return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0])
    return side*default


def conforming_sheet(name, parent, material, fit, side, z0, z1, y0, y1, width,
                     lift=.025):
    """Door skin follows sampled production body rather than a catalog box."""
    zs = [z0, (z0+z1)/2, z1]
    points=[]
    for z in zs:
        x0=body_x(fit,side,z,width/2,y0)+side*lift
        x1=body_x(fit,side,z,width/2,y1)+side*lift
        points.extend([(x0,y0,z),(x1,y1,z)])
    faces=[]
    for i in range(2):
        faces.append((i*2,i*2+1,i*2+3,i*2+2))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(points,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name='Body-following painted skin')
    for face in mesh.polygons:
        for loop in face.loop_indices:
            vertex=mesh.vertices[mesh.loops[loop].vertex_index].co
            uv.data[loop].uv=((vertex.z*.18+.5)% .95,(vertex.y*.33+.4)% .95)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj,name,parent,material)


def body_skin_from_runtime(car, root_path, parent, material):
    """Use exact production metal for cars assembled procedurally at runtime."""
    data=json.loads(subprocess.check_output(
        ['node','tools/audit-armor-kit-fit.mjs','--body-export',car],
        cwd=root_path,text=True))
    verts=[]
    faces=[]
    for source in data['meshes']:
        start=len(verts)
        values=source['positions']
        verts.extend(tuple(values[i:i+3]) for i in range(0,len(values),3))
        indices=source['indices']
        faces.extend(tuple(start+indices[i+j] for j in range(3))
                     for i in range(0,len(indices),3))
    if not faces:
        raise RuntimeError(f'{car}: no production painted metal faces')
    mesh=bpy.data.meshes.new(f'{car}-runtime-metal')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    weld_and_offset_shell(mesh,car)
    obj=bpy.data.objects.new('source-fitted-rust-shell',mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj,'source-fitted-rust-shell',parent,material)
    modifier=obj.modifiers.new('controlled-retopology','DECIMATE')
    modifier.ratio=.07 if car in ('falcone_heritage','aurora_gt') else .38
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    paint_shell_uv(mesh)
    return obj


def body_skin_from_source(car, root_path, parent, material, target_length, fit):
    """Retopologized rusty shell from the real metal body, not a size box."""
    source=root_path/'public/assets/models/classics'/f'{car}.glb'
    if not source.exists():
        source=root_path/'public/assets/models/unlocks'/f'{car}.glb'
    if not source.exists():
        return body_skin_from_runtime(car,root_path,parent,material)
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported=[obj for obj in bpy.context.scene.objects if obj not in before]
    bpy.context.view_layer.update()
    meshes=[obj for obj in imported if obj.type=='MESH']
    corners=[obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low=[min(point[axis] for point in corners) for axis in range(3)]
    high=[max(point[axis] for point in corners) for axis in range(3)]
    scale=target_length/max(.001,high[1]-low[1])
    center_x=(low[0]+high[0])/2
    center_y=(low[1]+high[1])/2
    verts=[]
    faces=[]
    for obj in meshes:
        if not any(slot.material and slot.material.name.startswith('Lacquered body')
                   for slot in obj.material_slots):
            continue
        start=len(verts)
        for vertex in obj.data.vertices:
            p=obj.matrix_world @ vertex.co
            # Imported glTF is Blender Z-up; the kit child frame is game
            # Y-up/Z-forward. Weld seams before computing the outward offset.
            verts.append(((p.x-center_x)*scale,(p.z-low[2])*scale,
                          -(p.y-center_y)*scale))
        for polygon in obj.data.polygons:
            if car=='titan_monster':
                points=[verts[start+i] for i in polygon.vertices]
                avg_y=sum(p[1] for p in points)/len(points)
                avg_z=sum(p[2] for p in points)/len(points)
                if avg_z < -target_length*.38 and avg_y > 1.75:
                    continue  # Preserve the open bed and rear lamp band.
            faces.append(tuple(start+i for i in polygon.vertices))
    for obj in reversed(imported):
        bpy.data.objects.remove(obj,do_unlink=True)
    if not faces:
        raise RuntimeError(f'{car}: no lacquered metal faces for kit skin')
    mesh=bpy.data.meshes.new(f'{car}-metal-skin')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    weld_and_offset_shell(mesh,car,fit.get('paintRearZ'))
    obj=bpy.data.objects.new('source-fitted-rust-shell',mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj,'source-fitted-rust-shell',parent,material)
    # Preserve the car shape with fewer faces than the original body.
    modifier=obj.modifiers.new('controlled-retopology','DECIMATE')
    modifier.ratio=.72 if car=='titan_monster' else .36
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    paint_shell_uv(mesh)
    return obj


def build(car, width, length, height, material, index, fit, root_path):
    front = length / 2 + .035
    roof = fit['roofSkin'] + .045
    side = width / 2 + .055
    shape = (index % 3 - 1) * .045
    # Source dimensions are game-local (+Y up, +Z forward). Blender exports
    # +Z up to glTF +Y up; rotate the authored coordinate frame once so the
    # final GLB retains the intended game-local positions.
    root = empty('kit-local-frame')
    root.rotation_euler.x = math.pi / 2
    scrapper = empty('kit-scrapper', root)
    raider = empty('kit-raider', root)
    warlord = empty('kit-warlord', root)

    bar = empty('kit-bull-bar', scrapper)
    rod('bull-bar-upper', bar, material, (-width*.39, .50, front),
        (width*.39, .50, front), .055)
    rod('bull-bar-lower', bar, material, (-width*.38, .28, front+.025),
        (width*.38, .28, front+.025), .048)
    for x in [-width*.34, width*.34]:
        rod('bull-bar-brace', bar, material, (x, .26, front+.02),
            (x, .56, front-.085), .045)
    for j, x in enumerate([-width*.39, width*.39]):
        stack = empty(f'kit-stack-{j}', scrapper)
        rod('stack-pipe', stack, material, (x, roof*.57, -length*.31),
            (x, roof*.57 + min(.7, height*.32), -length*.31), .095)
        rod('stack-cap', stack, material, (x-.11, roof*.57 + min(.7, height*.32), -length*.31),
            (x+.11, roof*.57 + min(.7, height*.32), -length*.31), .06)
    flank_y = fit['bodySide'][0]['y']
    for j in range(4):
        sign = 1 if j < 2 else -1
        part = empty(f'kit-plate-{j}', scrapper)
        axle=fit['axles'][j%2]
        # Wheel-area armor belongs to the metal body band above each wheel,
        # never the wheel's outer plane. Tall trucks and low prototypes use
        # their own sampled band height and contact x.
        start=max(-length*.42, axle['z']-.57)
        end=min(length*.42, axle['z']+.57)
        conforming_sheet('fitted-quarter-skin',part,material,fit,sign,
                         start,end,flank_y-.13,flank_y+.15,width)
        for bolt in [-.18, .18]:
            z=axle['z']+bolt
            x=body_x(fit,sign,z,width/2)+sign*.04
            rod('sheet-rivet', part, material,
                (x, flank_y+.12, z),
                (x+sign*.02, flank_y+.12, z), .025, 6)
    for sign in [-1,1]:
        # Split the door armor into overlapping contact sheets. Thin panels
        # preserve glass and wheel openings instead of filling the silhouette.
        for start,end in [(-length*.18,-.08),(-.12,length*.17)]:
            conforming_sheet('sampled-door-skin',scrapper,material,fit,sign,
                             start,end,flank_y-.16,flank_y+.14,width)
            for z in [start+.11,end-.11]:
                x=body_x(fit,sign,z,width/2)+sign*.04
                rod('door-fastener',scrapper,material,(x, flank_y+.12,z),
                    (x+sign*.018,flank_y+.12,z),.025,6)

    cage = empty('kit-cage', raider)
    for sign in [-1,1]:
        # Raider's lower overlapping band is separate from Scrapper's four
        # breakable quarters and stays below the window line.
        for z0,z1 in [(-length*.27,-length*.06),(-length*.025,length*.19)]:
            conforming_sheet('raider-overlap-door',raider,material,fit,sign,
                             z0,z1,flank_y-.25,flank_y-.025,width)
            for z in [z0+.07,z1-.07]:
                x=body_x(fit,sign,z,width/2,flank_y-.04)+sign*.03
                rod('raider-door-rivet',raider,material,
                    (x,flank_y-.04,z),(x+sign*.02,flank_y-.04,z),.027,6)
    cabin_front=length*.10
    cabin_rear=-length*.17
    rail_span=.24 if car=='viper_proto' else .31
    rail_foot=.19 if car=='viper_proto' else .26
    for sign in [-1, 1]:
        x = sign*width*rail_span
        rod('roof-rail', cage, material, (x, roof, cabin_rear),
            (x, roof+.07, cabin_front), .045)
        for z, top in [(cabin_rear,roof),(cabin_front,roof+.07)]:
            rod('roof-contact-upright', cage, material,
                (sign*width*rail_foot,fit['roofSkin']-.065,z),
                (x,top,z),.045)
        for j in range(2):
            guard = empty(f'kit-saw-{j}' if sign == 1 else f'kit-saw-{j}-guard', raider)
            saw_z=(j-.5)*length*.26
            saw_x=body_x(fit,sign,saw_z,width/2,flank_y)+sign*.08
            plate('saw-housing', guard, material,
                  (saw_x, flank_y-.06, saw_z),
                  .34, .17, .06, sign*.02, .05).rotation_euler.y = sign*math.pi/2
            saw_disc('toothed-saw-blade',guard,material,
                     (saw_x+sign*.04,flank_y-.06,saw_z),
                     radius=min(.18,height*.13))
    rod('cage-crossbar', cage, material, (-width*rail_span, roof+.07, cabin_front),
        (width*rail_span, roof+.07, cabin_front), .045)
    turret = empty('kit-turret-mount', raider)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=width*.17, depth=.10,
                                         location=(0, roof+.17, -.18))
    bpy.context.object.rotation_euler.x = math.pi/2
    finish(bpy.context.object, 'turret-ring', turret, material)
    for sign in [-1, 1]:
        rod('mount-truss', turret, material, (sign*width*.17, roof+.15, -.18),
            (sign*width*.28, roof-.08, -.38), .05)

    crown = empty('kit-crown', warlord)
    for j in range(5):
        x = (j-2)*width*rail_span*.45
        tapered_tooth('tapered-crown-tooth', crown, material,
                      (x, roof+.07, cabin_front),
                      (x+shape, roof+.31+(j%2)*.11, cabin_front+.12), .065)
    full = empty('kit-full-plating', warlord)
    body_skin_from_source(car,root_path,full,material,length,fit)
    door_lo=max(.25,flank_y-.22)
    door_hi=flank_y+.045
    door_z0,door_z1=-length*.16,length*.16
    for sign in [-1,1]:
        for y in [door_lo,door_hi-.03]:
            conforming_sheet('folded-door-edge',full,material,fit,sign,
                             door_z0,door_z1,y,y+.03,width,.065)
        for z in [door_z0,door_z1-.025]:
            conforming_sheet('folded-door-end',full,material,fit,sign,
                             z,z+.025,door_lo,door_hi,width,.066)
        for z in [door_z0+.06,door_z1-.06]:
            for y in [door_lo+.025,door_hi-.025]:
                x=body_x(fit,sign,z,width/2,y)+sign*.065
                rod('fold-rivet',full,material,(x,y,z),(x+sign*.018,y,z),.03,6)
    # Three shallow overlapping rear strips wrap the corners but leave the
    # lamp band and exhaust/bumper visible.
    for x in [-width*.28,0,width*.28]:
        plate('rear-wrap-sheet', full, material, (x, min(height*.48,flank_y), -length*.44),
              width*.30, min(.22,height*.17), .04, shape, .04)
    for sign in [-1,1]:
        skin=fit['hoodSides'][0 if sign<0 else 1]
        if skin is not None:
            xs=(sign*width*.17,sign*width*.30)
            zs=(length*.31,length*.40)
            corners=[(x,skin+.023,z) for z in zs for x in xs]
            mesh=bpy.data.meshes.new('hood-contact-skin')
            mesh.from_pydata(corners,[],[(0,1,3,2)])
            mesh.update()
            uv=mesh.uv_layers.new(name='Painted hood contact')
            for polygon in mesh.polygons:
                for loop in polygon.loop_indices:
                    vertex=mesh.vertices[mesh.loops[loop].vertex_index].co
                    uv.data[loop].uv=(.15+vertex.x*.12,.4+vertex.z*.14)
            obj=bpy.data.objects.new('hood-contact-skin',mesh)
            bpy.context.collection.objects.link(obj)
            finish(obj,'hood-contact-skin',full,material)
    mount = empty('kit-warlord-mount', warlord)
    rod('warlord-crossbar', mount, material, (-width*rail_span*.9, roof+.085, cabin_rear),
        (width*rail_span*.9, roof+.085, cabin_rear), .06)
    return [scrapper, raider, warlord]


def batch_component_meshes():
    """Join only mesh siblings inside a named component, preserving breakable roots."""
    group_names = [obj.name for obj in bpy.context.scene.objects if obj.type == 'EMPTY']
    for group_name in group_names:
        group = bpy.context.scene.objects.get(group_name)
        if group is None:
            continue
        if group.type != 'EMPTY':
            continue
        meshes = [child for child in group.children if child.type == 'MESH']
        if len(meshes) < 2:
            continue
        for mesh in meshes:
            layers=mesh.data.uv_layers
            if not layers.active:
                raise RuntimeError(f'{group.name}/{mesh.name}: painted UV layer missing')
            painted=layers.active
            for other in list(layers):
                if other != painted:
                    layers.remove(other)
            painted.name='Painted metal'
            painted.active_render=True
            layers.active_index=0
        by_material = {}
        for mesh in meshes:
            key = tuple(id(slot.material) for slot in mesh.material_slots)
            by_material.setdefault(key, []).append(mesh)
        for siblings in by_material.values():
            if len(siblings) < 2:
                continue
            bpy.ops.object.select_all(action='DESELECT')
            for mesh in siblings:
                mesh.select_set(True)
            bpy.context.view_layer.objects.active = siblings[0]
            bpy.ops.object.join()
            siblings[0].name = f'{group.name}-painted-metal'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True)
    parser.add_argument('--cars', nargs='*', choices=SIZES.keys(), default=list(SIZES))
    args = parser.parse_args(__import__('sys').argv[__import__('sys').argv.index('--')+1:])
    root = Path(args.root)
    fit_rows=json.loads(subprocess.check_output(['node','tools/audit-armor-kit-fit.mjs'],
                                                 cwd=root,text=True))
    fits={row['car']:row for row in fit_rows}
    out = root / 'public/assets/models/wasteland/kits'
    out.mkdir(parents=True, exist_ok=True)
    blends=root/'art-build/wasteland/kits'
    blends.mkdir(parents=True,exist_ok=True)
    image = bpy.data.images.load(str(root / 'public/assets/textures/scrap-plating.png'))
    image.scale(256, 256)
    intermediate = root / '.evidence/gfx-03'
    intermediate.mkdir(parents=True, exist_ok=True)
    image.filepath_raw = str(intermediate / 'kit-metal-256.png')
    image.file_format = 'PNG'
    image.save()
    material = bpy.data.materials.new('Scuffed iron · painted')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    paint = nodes.new('ShaderNodeTexImage')
    paint.image = image
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = .58
    bsdf.inputs['Roughness'].default_value = .76
    material.node_tree.links.new(paint.outputs['Color'], bsdf.inputs['Base Color'])
    for index, (car, size) in enumerate(SIZES.items()):
        if car not in args.cars:
            continue
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        parts = build(car, *size, material, index, fits[car], root)
        batch_component_meshes()
        bpy.ops.wm.save_as_mainfile(filepath=str(blends/f'{car}.blend'))
        for obj in bpy.context.scene.objects:
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(out / f'{car}.glb'),
                                  export_format='GLB', use_selection=True,
                                  export_apply=True, export_yup=True)
        print(f'KIT {car} {out / (car + ".glb")}')


if __name__ == '__main__':
    main()
