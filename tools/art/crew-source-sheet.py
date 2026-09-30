"""Inspect CC0 crew source files; compose a sourcing sheet, never adapt assets."""
import argparse, json
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--probe',action='store_true')
p.add_argument('--output',required=True)
p.add_argument('--rook')
a=p.parse_args(__import__('sys').argv[__import__('sys').argv.index('--')+1:] if '--' in __import__('sys').argv else None)
base=Path(r'C:/Users/kyleb/dev/art-library')
if a.probe:
    import bpy
    result=[]
    for label,file in [('Kenney Survivors',base/'kenney-animated-characters-survivors/unpacked/Model/characterMedium.fbx'),('Quaternius Modular Men',base/'quaternius-modular-men/Humans_Master.fbx')]:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(file))
        meshes=[]
        for obj in bpy.context.scene.objects:
            if obj.type=='MESH':
                obj.data.calc_loop_triangles()
                meshes.append({'name':obj.name,'triangles':len(obj.data.loop_triangles),'rigged':any(m.type=='ARMATURE' for m in obj.modifiers)})
        result.append({'candidate':label,'meshes':meshes,'actions':[x.name for x in bpy.data.actions],'bones':sum(len(x.data.bones) for x in bpy.context.scene.objects if x.type=='ARMATURE')})
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
else:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    fonts=Path(r'C:/Windows/Fonts')
    font=ImageFont.truetype(str(fonts/'segoeui.ttf'),25)
    small=ImageFont.truetype(str(fonts/'segoeui.ttf'),19)
    sheet=Image.new('RGB',(1500,930),(24,26,27));d=ImageDraw.Draw(sheet)
    d.text((34,24),'CREW STARTING MODELS - KYLE PICKS BEFORE ADAPTATION',font=font,fill=(240,222,173))
    cards=[('CURRENT ROOK - IN-GAME',Path(a.rook),['Production GLB and renderer','Isolated idle; memory-only fixture','Current style: rough plates and cloth']),('A - KENNEY SURVIVORS',base/'kenney-animated-characters-survivors/unpacked/Preview.png',['CC0; Kenney; 1,604 triangles','Rig: 58 bones; idle, jump, run files','Needs: crew faces, outfits and wear','Needs: retargeting and more actions']),('B - QUATERNIUS MODULAR MEN',base/'quaternius-modular-men/Preview.jpg',['CC0; Quaternius; Punk: 5,500 tris','79 bones; 24 clips; 11 male outfits','Needs: outfits, wear and female bodies','Needs: LOD; some outfits over 8,000 tris'])]
    for i,(title,path,lines) in enumerate(cards):
        x=34+i*486
        d.rounded_rectangle((x,80,x+462,880),radius=14,fill=(43,46,47))
        d.text((x+17,100),title,font=small,fill=(255,241,204))
        im=Image.open(path).convert('RGB');im=ImageOps.contain(im,(432,576))
        sheet.paste(im,(x+15+(432-im.width)//2,146+(576-im.height)//2))
        for j,line in enumerate(lines):d.text((x+16,740+j*34),line,font=small,fill=(235,235,229))
    d.text((34,901),'Source previews show unmodified packs. Triangle and rig figures verified from cached files. No game art replaced.',font=small,fill=(178,185,184))
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    sheet.save(a.output,quality=88,optimize=True)
