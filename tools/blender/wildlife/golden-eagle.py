"""Alps golden eagle: an original recipe (shared bird rig in bird.py).

About 0.85 m long with a 2.1 m span: dark brown plumage with darker and
lighter zones, a golden crown and nape, paler wing coverts, a big hooked
bill (dark tip, yellow cere at the base), feathered legs down to yellow
feet with black talons, a long tail with faint grey bands, and broad wings
with long separated primaries. Idle: perched, wings folded, looks round.
Fly: slow, shallow wingbeats.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'golden-eagle'
BROWN = (.050, .032, .020)
DARK = (.024, .016, .010)
GOLD = (.34, .21, .075)
YELLOW = (.48, .34, .05)

P = {'body': .38, 'width': .11, 'height': .12, 'neck': (.035, .060), 'head': .064, 'merged': True, 'head_reach': 3.0, 'head_detail': (8, 16), 'nape': (.25, 1.25),
     'bill': (.082, .056, .038, .95), 'tail': (.30, .14, 'round'), 'span': 1.05,
     'primaries': (5, .34, .095, 50, True), 'body_sides': 12, 'fold_sides': 6, 'chord': (.42, .26), 'leg': .12, 'stance': .06, 'toe': .011,
     'toes': [(0, .07), (30, .065), (-30, .065), (180, .06)], 'tilt': 40, 'beat': 30, 'flap': .45}


def brow(a, f, head_c, hr):
    """A fierce bony brow ridge jutting over each eye."""
    from mathutils import Vector
    for s in (1, -1):
        a.oval(tuple(head_c + Vector((hr * .46, s * hr * .74, hr * .40))), (hr * .34, hr * .16, hr * .10), DARK, 'head', 2, 6)


P['extra'] = brow


def plumage(f, p):
    import original as o
    return o.mix(BROWN, DARK, .6 * o.mottle(p, 2.0))


def head(f, p):
    import original as o
    from mathutils import Vector
    head_c = f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))
    d = (p - head_c) / P['head']
    # Forehead, face and throat dark brown; golden-buff only on the back of
    # the crown and the nape, streaked into the brown below.
    gold = o.smooth((d.z + .35) / .35) * o.smooth((-d.x - .05) / .35)
    streaks = .55 * o.speckle(p) * o.smooth((.6 - d.z) / .6)
    return o.mix(plumage(f, p), o.mix(GOLD, BROWN, .35 * o.speckle(p)), gold * (1 - streaks))


def wing(f, p):
    import original as o
    q = f.b(p)
    coverts = o.smooth((q.x - .02) / .05) * (abs(q.y) < .45)
    return o.mix(plumage(f, p), o.mix(BROWN, GOLD, .35), .6 * coverts)


def tail(f, p):
    import original as o
    q = f.b(p)
    return o.mix(plumage(f, p), (.10, .09, .08), .35 * (math.sin(q.x * 70) > .5))


def bill(f, p):
    from mathutils import Vector
    head_c = f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))
    # Yellow cere at the base, the hooked outer half dark.
    return YELLOW if p.x < head_c.x + P['head'] * .78 + .40 * P['bill'][0] else (.020, .018, .016)


def leg(f, p):
    # Feathered "trousers" down the leg, bare yellow toes, black talons.
    return BROWN if p.z > .035 else YELLOW


PAINT = {'body': lambda f, p: plumage(f, p), 'head': head, 'wing': wing, 'tail': tail, 'bill': bill, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
