"""Europe black stork: an original recipe (shared bird rig in bird.py).

About 1 m tall standing, 0.95 m long, 1.85 m span: a wader that stands on
the ground on long red legs, with a long neck, a long straight red bill,
red skin round the eye, glossy black plumage with a green and purple sheen
on head, neck, back and wings, and a white belly. Broad fingered wings.
Idle: standing, wings folded, looks round. Fly: slow, deep wingbeats.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'black-stork'
BLACK = (.012, .013, .012)
SHEEN = (.016, .024, .020)
WHITE = (.62, .62, .59)
RED = (.40, .030, .020)

P = {'body': .38, 'width': .10, 'height': .11, 'neck': (.10, .26), 'head': .045,
     'bill': (.19, .032, .022, 0), 'tail': (.20, .10, 'round'), 'span': .92,
     'primaries': (6, .28, .075, 45, True), 'chord': (.32, .18), 'leg': .52, 'stance': .07, 'toe': .009,
     'toes': [(0, .09), (30, .08), (-30, .08), (180, .04)], 'tilt': 15, 'beat': 26, 'flap': .55,
     'roughness': .50, 'specular': .45}


def gloss(f, p):
    import original as o
    return o.mix(BLACK, SHEEN, o.speckle(p, .7))


def body(f, p):
    import original as o
    q = f.b(p)
    # White belly and under the tail; glossy black above.
    return o.mix(gloss(f, p), WHITE, o.smooth((-q.z - .30 * P['height']) / .03) * o.smooth((.30 * P['body'] - q.x) / .05))


PAINT = {'body': body, 'head': gloss, 'wing': gloss, 'tail': gloss,
         'bill': lambda f, p: RED, 'leg': lambda f, p: RED, 'eyering': lambda f, p: RED}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
