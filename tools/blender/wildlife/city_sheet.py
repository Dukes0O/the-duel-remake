"""WILD-ART-CITY review: waste_sheet.py's two steps with the city animals' views and photographs.

Blender renders the views of the actual GLB, then plain Python composes the sheet:

  blender -b --factory-startup --python tools/blender/wildlife/city_sheet.py -- --root . --round 1 --candidate --render pigeon owl
  python tools/blender/wildlife/city_sheet.py --root . --round 1 --candidate --sheet pigeon owl

The ground is worn asphalt, as on the city courses. Every bird is shown standing, in
flight from below, from a car at 10 m and 30 m, and overhead (25 m up, 30 m ahead). The
pigeon and the street cat, which the town uses, are also shown from the town's camera.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import waste_sheet as ws

ws.CARD, ws.LOOKS, ws.REFS = 'WILD-ART-CITY', 'wild-art-city', 'city-references.json'
ws.GROUND = ((.120, .120, .122, 1), (.235, .230, .220, 1))
ws.FOOT = 'Street cat from the CC0 Quaternius wolf; the six others are original recipes.'

BIRD = [('side', 'Idle', 0, 'close', (0, -1, .10)), ('front', 'Idle', .20, 'close', (.72, -.70, .22)),
        ('below', 'Fly', .25, 'sky', (.10, -.25, -1)), ('flight', 'Fly', .60, 'sky', (.55, -.80, -.25)),
        ('car-10', 'Idle', 0, 'car', (10, 20)), ('car-30', 'Idle', 0, 'car', (30, 20)),
        ('overhead', 'Fly', .25, 'overhead', (30, 25)), ('town-60', 'Idle', 0, 'town', (60, 35))]
GROUND_ANIMAL = [('side', 'Idle', 0, 'close', (0, -1, .10)), ('front', 'Walk', .30, 'close', (.72, -.70, .22)),
                 ('rear', 'Idle', .50, 'close', (-.62, -.76, .30)), ('car-10', 'Idle', 0, 'car', (10, 20)),
                 ('car-30', 'Walk', .30, 'car', (30, 20)), ('town-60', 'Idle', 0, 'town', (60, 35)),
                 ('gait', 'Walk', .65, 'close', (0, -1, .10))]
ws.VIEWS.update({species: BIRD for species in ('black-kite', 'little-egret', 'black-faced-spoonbill', 'pigeon', 'owl')})
ws.VIEWS.update({'raccoon': GROUND_ANIMAL, 'street-cat': GROUND_ANIMAL})

TWO_PHOTOS = (('photo', 'side', 'front', 'photo2'), ('below', 'car-10', 'car-30', 'overhead'))
ws.LAYOUT.update({
    'black-kite': TWO_PHOTOS, 'little-egret': TWO_PHOTOS, 'owl': TWO_PHOTOS,
    'black-faced-spoonbill': (('photo', 'side', 'front', 'flight'), ('below', 'car-10', 'car-30', 'overhead')),
    'pigeon': (('photo', 'side', 'below', 'photo2'), ('car-10', 'car-30', 'overhead', 'town-60')),
    'raccoon': (('photo', 'photo2', 'side', 'front'), ('car-10', 'car-30', 'gait', 'rear')),
    'street-cat': (('photo', 'side', 'front', 'rear'), ('car-10', 'car-30', 'town-60', 'gait')),
})
ws.CAPTIONS.update({'flight': 'Model: Fly, from the side', 'side': 'Model: side, Idle'})

if __name__ == '__main__':
    ws.main()
