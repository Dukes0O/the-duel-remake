"""City black kite: an original recipe (shared bird rig in bird.py).

About 0.58 m long with a 1.5 m span, the scavenging kite of Asian harbours:
dark earth-brown, a paler grey-buff streaked head with a dark patch behind
the eye, a rufous-brown streaked breast, a pale band across the upper wing,
a small black hooked bill with a yellow cere, short yellow legs, and a long
tail with a shallow fork (fanned from separate feathers in city_parts.py).
Long, angled wings ending in six separated "fingers"; from below the wing is
dark with a pale patch at the base of the primaries.
Idle: stands with wings folded and looks round. Fly: glides on flat, angled
wings with slow, loose beats.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'black-kite'
DARK = (.034, .023, .016)
BROWN = (.105, .066, .037)
RUFOUS = (.400, .235, .100)
BUFF = (.36, .28, .18)
HEAD = (.440, .330, .200)
WINDOW = (.48, .43, .34)
YELLOW = (.50, .36, .05)
BLACK = (.012, .011, .010)

P = {'body': .28, 'width': .076, 'height': .084, 'neck': (.022, .036), 'head': .034, 'merged': True, 'head_reach': 1.6, 'head_detail': (8, 16), 'nape': (.30, 1.20),
     'bill': (.030, .018, .012, .70), 'tail': (.24, .004, 'wedge'), 'span': .75,
     'primaries': (6, .29, .058, 54, True), 'body_sides': 14, 'fold_sides': 10, 'chord': (.34, .22), 'fold': .20,
     'leg': .148, 'stance': .045, 'toe': .007, 'toes': [(0, .045), (30, .040), (-30, .040), (180, .030)],
     'tilt': 30, 'beat': 40, 'flap': .22, 'dihedral': .02, 'shag': .03, 'roughness': 1, 'specular': .25, 'refine': 1950}


def streaked(f, p, base, dark, amount):
    import original as o
    from mathutils import Vector
    q = f.b(p)
    # Dark shaft streaks: blotches a few centimetres long, coarse enough for the mesh to carry.
    streak = o.smooth((o.mottle(Vector((q.x * .5, q.y * .5, q.z * .5)), 4) - .50) / .12) * amount
    return o.mix(base, dark, streak)


def body(f, p):
    import original as o
    q = f.b(p)
    upper = o.mix(o.mix(BROWN, DARK, .5 * o.mottle(p, 2.2)), BUFF, .28 * o.smooth((o.mottle(p, 8) - .60) / .1))
    under = streaked(f, p, o.mix(RUFOUS, BROWN, .25 * o.mottle(p, 2.5)), BROWN, .45)
    # Tawny below and over the whole breast; dark brown above and behind.
    above = o.smooth((q.z + .10 * P['height']) / (.5 * P['height'])) * o.smooth((.34 * P['body'] - q.x) / (.14 * P['body']))
    return o.mix(under, upper, above)


def head(f, p):
    import original as o
    import city_parts as cp
    d = (p - cp.head_centre(P, f)) / P['head']
    pale = streaked(f, p, o.mix(HEAD, BUFF, .35 * o.mottle(p, 5)), BROWN, .40)
    # Dark patch through and behind the eye; the neck shades into the body.
    patch = (o.smooth((.42 - abs(d.z - .12)) / .25) * o.smooth((.55 - d.x) / .3) * o.smooth((d.x + .55) / .3)
             * o.smooth((abs(d.y) - .45) / .2))
    colour = o.mix(pale, DARK, .85 * patch)
    return o.mix(colour, body(f, p), o.smooth((-d.z - .55) / .60))


def wing(f, p):
    import original as o
    import city_parts as cp
    u, back, below, folded = cp.wing_zones(P, f, p)
    upper = o.mix(BROWN, DARK, .45 * o.mottle(p, 2.5))
    band = o.mix(BUFF, BROWN, .45 + .3 * o.mottle(p, 6))
    if folded:
        q = f.b(p)
        # Pale coverts over the shoulder and fore wing; the flight feathers behind are dark, the tips blackish.
        colour = o.mix(upper, band, .80 * o.smooth((q.x + .12 * P['body']) / (.16 * P['body'])))
        return o.mix(colour, DARK, o.smooth((-q.x - .42 * P['body']) / .04))
    flight = u > .66 or back > .45
    if below:
        if .55 < u < .90:
            return o.mix(WINDOW, BROWN, .35 * (math.sin(u * 160) > .3))     # the pale patch at the base of the primaries
        if flight:
            return o.mix((.10, .085, .07), DARK, .5 * (math.sin(abs(f.b(p).y) * 120) > .4))
        return streaked(f, p, o.mix(RUFOUS, BROWN, .5), DARK, .4)           # wing lining
    if flight:
        return o.mix(DARK, BROWN, .25 * o.mottle(p, 3))
    return o.mix(upper, band, .85 * o.smooth((.20 - abs(back - .30)) / .12) * o.smooth((.62 - u) / .1))


def tail_feather(f, p):
    import original as o
    q = f.b(p)
    bars = math.sin(q.x * 150) > .55
    upper = o.mix(o.mix(BROWN, RUFOUS, .35), DARK, .45 * bars)
    return o.mix(upper, (.20, .16, .12), .5 * (q.z < 0))


def bill(f, p):
    import city_parts as cp
    # Yellow cere at the base, the hooked outer part black.
    # The bill hooks down more than it reaches forward, so the cere is told by height.
    return YELLOW if p.z > cp.head_centre(P, f).z - P['head'] * .12 - .006 else BLACK


def leg(f, p):
    # Feathered thighs, bare yellow shanks and toes.
    return YELLOW


def extra(a, f, head_c, hr):
    import city_parts as cp
    from mathutils import Vector
    bl, bh = P['body'], P['height']
    cp.fan(a, f, (-.40 * bl, 0, .04 * bh), 9, .29, .036, 32, lambda p: tail_feather(f, p), fork=.34, root_half=.016)
    for s in (1, -1):
        # The brow ridge of a bird of prey, over each eye.
        a.oval(tuple(head_c + Vector((hr * .46, s * hr * .74, hr * .40))), (hr * .36, hr * .16, hr * .10), BROWN, 'head', 2, 6)
    for side in 'LR':
        # Feathered thighs down to the short yellow shank.
        cp.stocking(a, f, P, side, lambda p: body(f, p), .52, (.034, .026, .011), 8)


P['extra'] = extra
PAINT = {'body': body, 'head': head, 'wing': wing, 'tail': tail_feather, 'bill': bill, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
