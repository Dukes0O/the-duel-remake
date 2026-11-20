"""City little egret: an original recipe (shared bird rig in bird.py).

A small white heron of harbours and river walls, about 0.6 m long and 0.58 m
tall standing, with a 0.95 m span: all white, a long thin neck, a slender
black dagger of a bill with grey-yellow skin before the eye, long black legs
and bright yellow feet, a short tail, and loose plumes on the lower back.
Broad rounded wings. Idle: stands on its long legs and looks round.
Fly: slow, deep wingbeats with the neck drawn back onto the shoulders and
the legs trailing behind, as herons fly.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'little-egret'
WHITE = (.97, .97, .93)
SHADE = (.72, .74, .77)
BLACK = (.014, .014, .015)
LORE = (.34, .36, .22)
YELLOW = (.58, .46, .05)

P = {'body': .26, 'width': .058, 'height': .070, 'neck': (.082, .215), 'head': .023, 'neck_r': .60,
     'bill': (.085, .0065, .005, .04), 'tail': (.07, .045, 'round'), 'span': .49,
     'primaries': (5, .17, .058, 30, False), 'body_sides': 14, 'fold_sides': 8, 'chord': (.25, .16), 'fold': .05,
     'leg': .27, 'stance': .034, 'toe': .0052, 'toes': [(0, .072), (30, .062), (-30, .062), (180, .034)],
     'tilt': 22, 'beat': 22, 'flap': .60, 'shag': .02, 'roughness': .9, 'specular': .3, 'refine': 1950}


def white(f, p):
    import original as o
    return o.mix(WHITE, SHADE, .16 * o.mottle(p, 3.0))


def head(f, p):
    import original as o
    import city_parts as cp
    d = (p - cp.head_centre(P, f)) / P['head']
    # Bare grey-yellow skin between the bill and the eye.
    lore = o.smooth((d.x - .30) / .25) * o.smooth((.45 - abs(d.z - .10)) / .2)
    return o.mix(white(f, p), LORE, .9 * lore)


def leg(f, p):
    return YELLOW


def plumes(a, f, head_c, hr):
    """Loose aigrettes over the lower back and tail, and two fine head plumes."""
    import city_parts as cp
    from mathutils import Vector
    bl, bh = P['body'], P['height']
    cp.fan(a, f, (-.20 * bl, 0, .88 * bh), 5, .15, .020, 34, lambda p: white(f, p), weight='body', droop=.20, root_half=.018)
    for side in 'LR':
        # Black shanks down to the yellow feet.
        cp.stocking(a, f, P, side, BLACK, .90, (P['toe'] * 1.7, P['toe'] * 1.25, P['toe'] * 1.15))
    up = (0, 0, 1)
    for s in (1, -1):
        root = head_c + Vector((-hr * .7, s * hr * .15, hr * .35))
        tip = root + Vector((-.085, s * .008, -.050))
        a.blade([(tuple(root + Vector((0, .004, 0))), tuple(root - Vector((0, .004, 0))), .002, up),
                 (tuple(tip + Vector((0, .0015, 0))), tuple(tip - Vector((0, .0015, 0))), .001, up)], WHITE, 'head')


def fly_pose(obj, t):
    import original as o
    # A heron flies with its neck folded: the neck is drawn in to two fifths
    # (the head is given its own size back), leaving the head on the shoulders.
    o.stretch(obj, 'neck', (.40, .40, .40))
    o.stretch(obj, 'head', (2.5, 2.5, 2.5))
    o.turn(obj, 'neck', -.55)
    o.turn(obj, 'head', .70)
    for side in 'LR':
        o.turn(obj, 'leg.' + side, .20)     # legs trail straight out behind


P['extra'] = plumes
P['fly_pose'] = fly_pose
PAINT = {'body': white, 'head': head, 'wing': white, 'tail': white, 'bill': lambda f, p: BLACK, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
