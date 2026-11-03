"""Western mountains common raven: an original recipe (shared bird rig in bird.py).

About 0.63 m long with a 1.2 m span: glossy blue-black plumage, shaggy
throat, a long heavy black bill with a curved top, a wedge-shaped tail and
long fingered wing tips. Idle: perched, wings folded, looks round.
Fly: a slow, deep, looping wingbeat.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'raven'
BLACK = (.011, .011, .014)

P = {'body': .25, 'width': .062, 'height': .068, 'neck': (.040, .060), 'head': .040,
     'bill': (.074, .028, .019, .20), 'tail': (.23, .072, 'wedge'), 'span': .60,
     'primaries': (5, .20, .036, 44, True), 'chord': (.21, .13), 'leg': .075, 'stance': .028, 'toe': .0055,
     'toes': [(0, .052), (28, .045), (-28, .045), (180, .036)], 'tilt': 28, 'beat': 24,
     'shag': .035, 'flap': .70, 'roughness': .42, 'specular': .55}


def gloss(f, p):
    import original as o
    # Black with a faint blue-purple cast that varies feather to feather.
    return o.mix(BLACK, (.014, .014, .024), o.speckle(p, .7))


PAINT = {'body': gloss, 'head': gloss, 'wing': gloss, 'tail': gloss,
         'bill': lambda f, p: (.007, .007, .008), 'leg': lambda f, p: (.008, .008, .009)}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
