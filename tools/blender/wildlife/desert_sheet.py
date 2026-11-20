"""WILD-ART-DESERT review sheets: waste_sheet.py with this card's animals, views and photographs.

  blender -b --factory-startup --python tools/blender/wildlife/desert_sheet.py -- --root . --round 1 --candidate --render roadrunner pelican
  python tools/blender/wildlife/desert_sheet.py --root . --round 1 --candidate --sheet roadrunner pelican

Every animal is shown beside two photographs: close views of the exported
model, then 1:1 crops of a 1080p frame from a car at 10 m and 30 m. The two
soaring birds are also shown from below and 25 m overhead.
"""
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import waste_sheet as w

w.CARD.update(title='WILD-ART-DESERT', slug='wild-art-desert', references='desert-references.json',
              footer='Desert bighorn from the CC0 Quaternius deer; the other five are original recipes.')


def ground(motion, low=.10):
    return [('side', 'Idle', 0, 'close', (0, -1, low)), ('front', motion, .30, 'close', (.72, -.70, low + .12)),
            ('rear', 'Idle', .50, 'close', (-.62, -.76, low + .20)), ('car-10', 'Idle', 0, 'car', (10, 20)),
            ('car-30', motion, .30, 'car', (30, 20)), ('gait', motion, .65, 'close', (0, -1, low)),
            ('top', motion, .55, 'close', (0, -.12, 1))]


SOARER = [('side', 'Idle', 0, 'close', (0, -1, .10)), ('front', 'Idle', .20, 'close', (.72, -.70, .22)),
          ('below', 'Fly', .25, 'sky', (.25, -.10, -1)), ('soar', 'Fly', .60, 'sky', (.55, -.80, -.25)),
          ('car-30', 'Idle', 0, 'car', (30, 20)), ('overhead', 'Fly', .25, 'overhead', (30, 25))]
w.VIEWS.clear()
w.VIEWS.update({'roadrunner': ground('Run'), 'jackrabbit': ground('Walk'), 'desert-bighorn': ground('Walk'),
                'collared-lizard': ground('Walk', .16), 'pelican': SOARER, 'condor': SOARER})
GROUND = (('photo', 'side', 'front', 'photo2'), ('car-10', 'car-30', 'gait', 'rear'))
BIRD = (('photo', 'side', 'front', 'photo2'), ('below', 'soar', 'car-30', 'overhead'))
w.LAYOUT.clear()
w.LAYOUT.update({'farm': GROUND, 'collared-lizard': (('photo', 'side', 'front', 'photo2'), ('car-10', 'car-30', 'gait', 'top')),
                 'pelican': BIRD, 'condor': BIRD})
w.CAPTIONS.update({'gait': 'Model: side, moving'})

if __name__ == '__main__':
    w.main()
