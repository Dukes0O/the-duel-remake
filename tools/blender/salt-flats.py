"""ARENA-06 private native source fitting. No runtime path is written.

The approved native originals are triangulated before fitting. Every reused
face has an inspectable source-to-world affine transform in manifest.json.
"""
import argparse
import hashlib
import json
import math
import struct
import shutil
import subprocess
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector


def arguments():
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',required=True)
    parser.add_argument('--output-dir',required=True)
    parser.add_argument('--fit-config',required=True)
    parser.add_argument('--seed',type=int,required=True)
    parser.add_argument('--source-library')
    parser.add_argument('--validate-sources',action='store_true')
    return parser.parse_args(sys.argv[sys.argv.index('--')+1:])


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_guard(root,config,override):
    catalog=json.loads((root/'tools/art/catalog.json').read_text())
    ids=list(dict.fromkeys([pick['catalogId'] for pick in config['sourcePicks']]+[config['saltPhoto']['catalogId']]))
    records={};homes={}
    for key in ids:
        row=next((record for record in catalog['assets'] if record['id']==key),None)
        if row is None or row['license']!='CC0-1.0':
            raise ValueError('Missing approved CC0 record: '+key)
        home=override/key if override else Path(row['library'])
        for pin in row['files']:
            path=home/pin['path']
            if not path.is_file() or digest(path)!=pin['sha256']:
                raise ValueError('Missing or changed approved original: '+str(path))
            if 'bytes' in pin and path.stat().st_size!=pin['bytes']:
                raise ValueError('Original byte count changed: '+str(path))
            if path.name.lower() in ('license.txt','license-evidence.txt','source-page.html'):
                text=path.read_text(encoding='utf-8',errors='strict').lower()
                if not any(word in text for word in ('cc0','creative commons zero','publicdomain/zero')):
                    raise ValueError('Cached primary source does not grant the selected CC0 use')
        records[key]=row;homes[key]=home
    expected=[
        ('sedan','kenney-car-kit','unpacked/Models/GLB format/sedan.glb'),
        ('debris-door','kenney-car-kit','unpacked/Models/GLB format/debris-door.glb'),
        ('debris-drivetrain','kenney-car-kit','unpacked/Models/GLB format/debris-drivetrain.glb'),
        ('debris-tire','kenney-car-kit','unpacked/Models/GLB format/debris-tire.glb'),
        ('shipping-container-a','kenney-city-kit-industrial','unpacked/Models/GLB format/shipping-container-a.glb'),
        ('shipping-container-b','kenney-city-kit-industrial','unpacked/Models/GLB format/shipping-container-b.glb'),
        ('crane','kenney-factory-kit','unpacked/Models/GLB format/crane.glb'),
        ('crane-magnet','kenney-factory-kit','unpacked/Models/GLB format/crane-magnet.glb'),
        ('Bus','quaternius-public-transport','blend/Bus.blend'),
    ]
    selected=[(pick['model'],pick['catalogId'],pick['path']) for pick in config['sourcePicks']]
    if selected!=expected:
        raise ValueError('The recipe accepts only Kyle\'s nine picked native source bindings and plain Bus')
    for pick in config['sourcePicks']:
        pin=next((file for file in records[pick['catalogId']]['files'] if file['path']==pick['path']),None)
        if pin is None or pin['sha256']!=pick['sha256']:
            raise ValueError('Fit input is not its pinned approved native original')
    photo=config['saltPhoto']
    if photo['tiling']!='mirrored-uv' or photo['preserveSourcePixels'] is not True:
        raise ValueError('Only the approved original photo and mirrored UV repeat are authorized')
    image=homes[photo['catalogId']]/photo['path']
    if digest(image)!=photo['sha256']:
        raise ValueError('The original salt photograph changed')
    return records,homes,image


def originals(config,homes):
    result={}
    for pick in config['sourcePicks']:
        path=homes[pick['catalogId']]/pick['path']
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if path.suffix=='.blend':
            bpy.ops.wm.open_mainfile(filepath=str(path),use_scripts=False)
        else:
            bpy.ops.import_scene.gltf(filepath=str(path))
        faces=[];roles=[];parts={}
        for obj in sorted((obj for obj in bpy.context.scene.objects if obj.type=='MESH'),key=lambda obj:obj.name):
            obj.data.calc_loop_triangles();first=len(faces)
            for face in obj.data.loop_triangles:
                points=[]
                for index in face.vertices:
                    point=obj.matrix_world@obj.data.vertices[index].co
                    points.append([point.x,point.z,-point.y])
                faces.append(points)
                material=obj.data.materials[face.material_index] if obj.data.materials else None
                roles.append(obj.name+' '+(material.name if material else ''))
            parts[obj.name]=list(range(first,len(faces)))
        if len(faces)!=pick['triangles']:
            raise ValueError('Native source topology changed: '+pick['model'])
        result[pick['model']]={'key':pick['catalogId']+'/'+pick['path'],'faces':faces,'roles':roles,'parts':parts}
    return result


def physical_geometry(root, config, seed):
    """Read the real headless Course; no generated manifest drives physics."""
    program = (
        'import {Course} from "./src/course.js";'
        'import {SALT_FLATS_VENUE} from "./src/arena/venues.js";'
        'const course=new Course(SALT_FLATS_VENUE,Number(process.argv[1]));'
        'console.log(JSON.stringify(course.saltFlatsGeometry));'
    )
    node = shutil.which('node')
    if node is None:
        raise ValueError('The installed Node runtime is needed for native Course geometry')
    result = subprocess.run([node, '--input-type=module', '-e', program, str(seed)],
                            cwd=root, capture_output=True, text=True, timeout=60,
                            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
    if result.returncode:
        raise ValueError('Actual Salt Flats Course geometry failed: ' + result.stderr)
    geometry = json.loads(result.stdout)
    if geometry['ground'] != config['targetSizeMetres'] or len(geometry['ramps']) != config['ramps']:
        raise ValueError('Actual Course geometry differs from the approved bowl or ramp count')
    return geometry

def game_to_blender(point):
    return (point[0],-point[2],point[1])


def matrix_array(matrix):
    return [float(matrix[row][column]) for column in range(4) for row in range(4)]


def fit(source,size,center,yaw=0,indices=None):
    indices=list(range(len(source['faces']))) if indices is None else list(indices)
    points=[point for index in indices for point in source['faces'][index]]
    low=Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high=Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    scale=Matrix.Diagonal(Vector(tuple(size[axis]/(high[axis]-low[axis]) for axis in range(3))+(1,)))
    return indices,Matrix.Translation(Vector(center))@Matrix.Rotation(yaw,4,'Y')@scale@Matrix.Translation(-(low+high)/2)


class Geometry:
    def __init__(self,name):
        self.name=name;self.points=[];self.faces=[];self.uvs=[];self.lineage=[]

    def triangle(self,points,uvs):
        first=len(self.points)
        self.points.extend([tuple(point) for point in points]);self.uvs.extend(uvs)
        self.faces.append((first,first+1,first+2))

    def stamp(self,source,indices,matrix,tile=0):
        start=len(self.faces)
        for index in indices:
            points=source['faces'][index]
            role=source['roles'][index].lower()
            paint=6 if 'wheel' in role or 'tire' in role else 7 if 'windows' in role else tile%6
            uvs=[]
            for point in points:
                u=((point[0]*.27+point[2]*.33)% .9+.05)/4+(paint%4)/4
                v=((point[1]*.45+point[2]*.08)% .9+.05)/2+(paint//4)/2
                uvs.append((u,v))
            self.triangle([matrix@Vector(point) for point in points],uvs)
        self.lineage.append({'sourceKey':source['key'],'node':self.name,'triangleStart':start,
                             'sourceTriangleIndices':list(indices),'matrix':matrix_array(matrix)})

    def fit_collision(self, collision):
        """Fit the actual assembled source faces to the authored Course solid."""
        low = Vector(tuple(min(point[axis] for point in self.points) for axis in range(3)))
        high = Vector(tuple(max(point[axis] for point in self.points) for axis in range(3)))
        size = [extent * 2 - .004 for extent in collision['halfExtents']]
        scale = Matrix.Diagonal(Vector(tuple(size[axis] / (high[axis] - low[axis])
                                            for axis in range(3)) + (1,)))
        placement = Matrix.Translation(Vector(collision['center'])) @ scale @ Matrix.Translation(-(low + high) / 2)
        self.points = [tuple(placement @ Vector(point)) for point in self.points]
        for row in self.lineage:
            source_matrix = Matrix([[row['matrix'][column * 4 + axis] for column in range(4)]
                                    for axis in range(4)])
            row['matrix'] = matrix_array(placement @ source_matrix)
    def build(self,material):
        data=bpy.data.meshes.new(self.name)
        data.from_pydata([game_to_blender(point) for point in self.points],[],self.faces);data.update()
        obj=bpy.data.objects.new(self.name,data);bpy.context.collection.objects.link(obj)
        data.materials.append(material);uv=data.uv_layers.new(name='Worn fitted material')
        for face in data.polygons:
            for loop in face.loop_indices:
                uv.data[loop].uv=self.uvs[data.loops[loop].vertex_index]
        return obj

    def feature(self,kind):
        low=[min(point[axis] for point in self.points) for axis in range(3)]
        high=[max(point[axis] for point in self.points) for axis in range(3)]
        row={'id':self.name,'node':self.name,'kind':kind}
        if kind in ('salvage-cover','bus','tyre-wall','container-wall','crane'):
            row['collision']={'center':[(a+b)/2 for a,b in zip(low,high)],
                              'halfExtents':[(b-a)/2+.002 for a,b in zip(low,high)],'heading':0}
        return row


def worn_material(output):
    size=1024;y,x=np.mgrid[0:size,0:size];rng=np.random.default_rng(1989)
    fields=np.array([[.29,.34,.32],[.34,.31,.25],[.38,.28,.19],[.31,.33,.32],
                     [.29,.22,.18],[.25,.27,.26],[.065,.060,.053],[.052,.065,.071]])
    tile=y//(size//2)*4+x//(size//4)
    grain=rng.uniform(-.035,.035,(size,size))
    coarse=.045*np.sin(x*.017+np.sin(y*.013)*2)+.026*np.sin(y*.035)
    rgb=fields[tile]+(grain+coarse)[:,:,None]
    rust=(np.sin(x*.083+np.sin(y*.041)*2)*np.sin(y*.055+x*.027)>.46)&(tile<6)
    rgb=np.where(rust[:,:,None],np.array([.31,.16,.078])[None,None,:]+grain[:,:,None],rgb)
    scratches=((x*5+y*3)%239<2)&(tile<6)
    rgb=np.where(scratches[:,:,None],np.array([.46,.44,.36])[None,None,:],rgb)
    scorch=np.maximum(0,np.sin(x*.023-y*.012)-.35)*.22
    rgb*=1-scorch[:,:,None]
    rgba=np.ones((size,size,4),np.float32);rgba[:,:,:3]=np.clip(rgb,.025,.7)
    image=bpy.data.images.new('Salt Flats worn salvage atlas',width=size,height=size,alpha=False)
    image.pixels.foreach_set(rgba.ravel());image.file_format='PNG';path=output/'salvage-wear.png';image.filepath_raw=str(path);image.save()
    bytes_=path.read_bytes();image.pack(data=bytes_,data_len=len(bytes_))
    material=bpy.data.materials.new('Faded paint, rust, scorch and dusty rubber');material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.88;shader.inputs['Metallic'].default_value=.24
    node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
    material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    return material


def salt_material(path):
    image=bpy.data.images.load(str(path),check_existing=False)
    source=path.read_bytes();image.pack(data=source,data_len=len(source))
    material=bpy.data.materials.new('Genuine salt photo with approved mirrored repetition');material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=1
    node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.extension='REPEAT'
    material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    return material


def mirrored_photo_sampler(path,photo_hash):
    # glTF expresses mirror repetition in the sampler. The source JPEG pixels
    # stay untouched; only this explicit exported sampler is configured.
    bytes_=path.read_bytes();json_size=struct.unpack_from('<I',bytes_,12)[0]
    document=json.loads(bytes_[20:20+json_size]);binary=bytes_[28+json_size:]
    selected=[]
    for index,image in enumerate(document.get('images',[])):
        view=document['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
        if hashlib.sha256(binary[start:start+view['byteLength']]).hexdigest()==photo_hash:
            selected.append(index)
    if len(selected)!=1:
        raise ValueError('Export must embed exactly the unchanged original salt photograph')
    for texture in document['textures']:
        if texture['source'] in selected:
            sampler=dict(document['samplers'][texture['sampler']]);sampler.update(wrapS=33648,wrapT=33648)
            texture['sampler']=len(document['samplers']);document['samplers'].append(sampler)
    encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    total=12+8+len(encoded)+8+len(binary)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,total)+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+
                     struct.pack('<II',len(binary),0x004e4942)+binary)


def main():
    args=arguments();root=Path(args.root).resolve();output=Path(args.output_dir).resolve();qa=(root/'.qa-dist').resolve()
    if qa not in output.parents or output==qa:
        raise ValueError('Native candidate output must be inside this lane .qa-dist')
    config=json.loads(Path(args.fit_config).read_text());override=Path(args.source_library).resolve() if args.source_library else None
    records,homes,photo=source_guard(root,config,override)
    if args.validate_sources:
        print('Approved source licence and byte guards pass; no geometry exported.');return
    if output.exists() and any(output.iterdir()):
        raise ValueError('Use a fresh private native output directory')
    physical=physical_geometry(root,config,args.seed)
    source=originals(config,homes);bpy.ops.wm.read_factory_settings(use_empty=True);output.mkdir(parents=True,exist_ok=True)
    metal=worn_material(output);salt=salt_material(photo)
    objects=[];features=[];lineage=[]
    solids={row['id']:row for row in physical['solids']}
    def add(geometry,kind,material=metal):
        if geometry.name in solids:
            geometry.fit_collision(solids[geometry.name]['collision'])
        objects.append(geometry.build(material));features.append(geometry.feature(kind));lineage.extend(geometry.lineage)
    ground=Geometry('salt-flats-ground');w=config['targetSizeMetres']['width']/2;d=config['targetSizeMetres']['depth']/2
    points=[(-w,0,-d),(-w,0,d),(w,0,d),(w,0,-d)];uv=[(0,0),(0,2*d/12),(2*w/12,2*d/12),(2*w/12,0)]
    ground.triangle([points[i] for i in (0,1,2)],[uv[i] for i in (0,1,2)])
    ground.triangle([points[i] for i in (0,2,3)],[uv[i] for i in (0,2,3)]);objects.append(ground.build(salt))
    for section in physical['solids']:
        layout=section['fit']
        if not layout.get('boundary'):
            continue
        wall=Geometry(section['id']);part=source[layout['source']]
        x,y,z=layout['center'];yaw=layout['heading']
        if section['kind']=='tyre-wall':
            # Three grounded rows of original vertical tyres. Their native
            # surfaces, not a hidden long rectangle, close these short spans.
            for column in range(10):
                along=-5.22+column*1.16
                for level in range(3):
                    center=(x+math.sin(yaw)*along,.59+level*1.12,z+math.cos(yaw)*along)
                    indices,matrix=fit(part,(.46,1.18,1.18),center,yaw=yaw)
                    wall.stamp(part,indices,matrix,tile=6)
        elif section['kind']=='container-wall':
            for level in range(2):
                part=source['shipping-container-a' if (int(layout['s']//10)+level)%2 else 'shipping-container-b']
                center=(x,1.30+level*2.60,z)
                indices,matrix=fit(part,(2.44,2.60,12.15),center,yaw=yaw)
                wall.stamp(part,indices,matrix,tile=(int(layout['s']//10)+level)%6)
        else:
            indices,matrix=fit(part,layout['size'],layout['center'],yaw=yaw,indices=part['parts']['body'])
            wall.stamp(part,indices,matrix,tile=int(layout['s']//10)%6)
        add(wall,section['kind'])
    for index,(x,z) in enumerate([(-53,-43),(0,-48),(55,-41),(-60,38),(0,45),(58,40)]):
        pile=Geometry('salvage-cover-'+str(index+1));yaw=0
        sedan=source['sedan'];body=sedan['parts']['body']
        # Actual missing wheels and strongly compressed source shells. Upper
        # wreck overlaps the lower roof; every loose part rests on the floor.
        for level in range(2):
            indices,matrix=fit(sedan,(2.3,.92,5.25),(x,.76+level*.85,z),yaw=yaw,indices=body)
            pile.stamp(sedan,indices,matrix,tile=(index+level)%6)
        for offset in (-1,1):
            part=source['debris-tire'];indices,matrix=fit(part,(.43,.68,.68),(x+offset*1.02,.34,z-1.3),yaw=yaw)
            pile.stamp(part,indices,matrix,tile=6)
            part=source['debris-door'];indices,matrix=fit(part,(.15,1.25,1.20),(x+offset*1.7,.625,z+.8),yaw=yaw)
            pile.stamp(part,indices,matrix,tile=index%6)
        part=source['debris-drivetrain'];indices,matrix=fit(part,(1.8,.30,2.8),(x,.15,z),yaw=yaw)
        pile.stamp(part,indices,matrix,tile=3);add(pile,'salvage-cover')
    # Genuine worn donor stacks fill the inaccessible island behind its
    # existing solid wreck boundary. One merged scenery draw adds no Course
    # obstacles and leaves the original bus, crane and driving band clear.
    island=Geometry(config['islandSalvage']['node'])
    for stack in config['islandSalvage']['stacks']:
        x,z=stack['center'];yaw=math.radians(stack['headingDegrees']);tile=stack['paintTile']
        def place(part,size,local,heading=0,indices=None,paint=tile):
            lx,y,lz=local
            center=(x+math.cos(yaw)*lx+math.sin(yaw)*lz,
                    y,z-math.sin(yaw)*lx+math.cos(yaw)*lz)
            faces,matrix=fit(part,size,center,yaw=yaw+heading,indices=indices)
            island.stamp(part,faces,matrix,tile=paint)
        # Two offset container courses sit directly on each other. They
        # anchor each pile without stretching a primitive across empty salt.
        for level in range(2):
            part=source['shipping-container-a' if level else 'shipping-container-b']
            place(part,(2.44,2.50,11.5),(level*.45,1.25+level*2.45,6.0),
                  heading=math.pi/2,paint=(tile+level)%6)
        sedan=source['sedan'];body=sedan['parts']['body']
        # Compressed wheel-less shells overlap into irregular, supported
        # heaps instead of standing as intact parked cars or floating layers.
        for index,(lx,lz,heading) in enumerate([(-7,-1,-.35),(-2.5,-2,.23),
                                                (2.5,-1,-.18),(7,-2,.31)]):
            place(sedan,(2.3,.98,5.5),(lx,.49,lz),heading=heading,
                  indices=body,paint=(tile+index)%6)
        for index,(lx,lz,heading) in enumerate([(-4.7,-1,.45),(0,-2,-.3),(4.7,-1,.4)]):
            place(sedan,(2.3,.92,5.25),(lx,1.39,lz),heading=heading,
                  indices=body,paint=(tile+index+2)%6)
        place(sedan,(2.3,.80,5.1),(0,2.18,-1.4),heading=.15,
              indices=body,paint=(tile+4)%6)
        # Real discarded donor parts break the base outline. Each rests on
        # the salt; their retained source faces are recorded in the manifest.
        for lx,lz in [(-9,1),(8.5,1.5)]:
            place(source['debris-tire'],(.46,.72,.72),(lx,.36,lz),paint=6)
        for index,(lx,lz) in enumerate([(-6,2),(1,1.6),(6,1.8)]):
            place(source['debris-door'],(1.5,.18,1.2),(lx,.09,lz),
                  heading=index*.4,paint=(tile+index)%6)
        for lx,lz in [(-7,4),(6.5,3.8)]:
            place(source['debris-drivetrain'],(1.8,.30,2.8),(lx,.15,lz),paint=3)
    add(island,'island-scenery')
    bus=Geometry('plain-derelict-bus');part=source['Bus']
    retained=[index for index,role in enumerate(part['roles']) if 'windows' not in role.lower()]
    indices,matrix=fit(part,(10.8,2.55,2.72),(-35,1.275,0),indices=retained)
    bus.stamp(part,indices,matrix,tile=1);add(bus,'bus')
    crane=Geometry('salvage-jib-crane');part=source['crane'];scale=12/3.553319215774536
    matrix=Matrix.Translation(Vector((35,0,0)))@Matrix.Diagonal(Vector((scale,scale,scale,1)))
    crane.stamp(part,list(range(len(part['faces']))),matrix,tile=2)
    # The source jib tip lies at Blender +Y, game -Z. The actual separate
    # source magnet hangs below that tip on a simple steel cable connector.
    tip=(35,12,-2.92*scale)
    part=source['crane-magnet'];indices,matrix=fit(part,(1.25,1.40,1.25),(tip[0],3.3,tip[2]))
    crane.stamp(part,indices,matrix,tile=3)
    for axis in (0,2):
        corners=[]
        for y,offset in ((4,.035),(11.5,.035),(11.5,-.035),(4,-.035)):
            point=[tip[0],y,tip[2]];point[axis]+=offset;corners.append(point)
        crane.triangle([corners[i] for i in (0,1,2)],[(0,0),(0,1),(1,1)])
        crane.triangle([corners[i] for i in (0,2,3)],[(0,0),(1,1),(1,0)])
    add(crane,'crane')
    for native_ramp in physical['ramps']:
        ramp=Geometry(native_ramp['id'])
        for indices in native_ramp['triangles']:
            points=[native_ramp['vertices'][index] for index in indices]
            uvs=[(index % 2, (index // 2) / (len(native_ramp['stations']) - 1)) for index in indices]
            ramp.triangle(points,uvs)
        add(ramp,'ramp')
        features[-1]['profile']=native_ramp['profile']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    venue=output/'venue.glb'
    bpy.ops.export_scene.gltf(filepath=str(venue),export_format='GLB',use_selection=True,export_yup=True,
                             export_animations=False,export_materials='EXPORT',export_extras=True,export_image_format='AUTO')
    mirrored_photo_sampler(venue,config['saltPhoto']['sha256'])
    native_triangles=0
    for obj in objects:obj.data.calc_loop_triangles();native_triangles+=len(obj.data.loop_triangles)
    manifest={'version':1,'card':'ARENA-06','seed':args.seed,'ground':{'node':ground.name,'targetSizeMetres':config['targetSizeMetres'],
               'photoSha256':config['saltPhoto']['sha256'],'tiling':'mirrored-uv'},'features':features,'sourceInstances':lineage,
               'nativeTriangles':native_triangles,'nativeDraws':len(objects),'geometrySha256':digest(venue),
               'scope':'Private registered Course and native boundary geometry. Launch hooks, game/art/frame and Claude review remain pending.'}
    (output/'manifest.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
    print(json.dumps({'nativeTriangles':native_triangles,'nativeDraws':len(objects),'features':len(features),'output':str(output)}))


if __name__=='__main__':
    main()
