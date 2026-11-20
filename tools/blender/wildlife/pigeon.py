"""City pigeon (feral rock dove): an original recipe (shared bird rig in bird.py).

The street pigeon of every city, about 0.32 m long with a 0.66 m span: a
plump body carried level on short red legs, a small round head on a thick
neck, a short dark bill with a white cere at its base, an orange eye. The
"blue bar" plumage of the photograph: dark blue-grey head, neck and breast
with a green and purple sheen on the neck, pale grey wings crossed by two
black bars, a dark grey tail with a black band at its end, a pale rump.
The two bars are strips on the folded wing (city_parts.fold_bar).
Idle: stands and looks round. Fly: fast, deep wingbeats; the wing is pale
below and dark along its trailing edge.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'pigeon'
SLATE = (.085, .095, .115)
BLUE = (.150, .165, .195)
PALE = (.36, .37, .39)
RUMP = (.46, .47, .48)
BAR = (.016, .016, .018)
GREEN = (.030, .200, .110)
PURPLE = (.220, .060, .200)
RED = (.42, .085, .070)
CERE = (.62, .60, .56)
ORANGE = (.55, .20, .03)
UNDERWING = (.50, .51, .52)

P = {'body': .175, 'width': .050, 'height': .055, 'neck': (.020, .058), 'head': .0195, 'neck_r': 1.10,
     'bill': (.017, .0050, .0045, .30), 'tail': (.085, .004, 'wedge'), 'span': .33,
     'primaries': (5, .115, .034, 20, False), 'body_sides': 14, 'fold_sides': 10, 'chord': (.150, .10), 'fold': .075,
     'leg': .050, 'stance': .026, 'toe': .0036, 'toes': [(0, .028), (30, .025), (-30, .025), (180, .014)],
     'tilt': 26, 'beat': 9, 'flap': .80, 'shag': .02, 'roughness': .85, 'specular': .35, 'refine': 1950}


def body(f, p):
    import original as o
    q = f.b(p)
    bl, bh = P['body'], P['height']
    colour = o.mix(BLUE, SLATE, .35 * o.mottle(p, 3))
    # Darker breast and shoulders, paler belly, a pale rump above the tail.
    colour = o.mix(colour, SLATE, .55 * o.smooth((q.x - .15 * bl) / (.2 * bl)))
    colour = o.mix(colour, PALE, .45 * o.smooth((-q.z - .25 * bh) / (.4 * bh)) * o.smooth((.15 * bl - q.x) / (.2 * bl)))
    return o.mix(colour, RUMP, .8 * o.smooth((q.z - .35 * bh) / (.3 * bh)) * o.smooth((-q.x - .22 * bl) / (.10 * bl)))


def head(f, p):
    import original as o
    import city_parts as cp
    d = (p - cp.head_centre(P, f)) / P['head']
    # Green on the nape and sides of the neck, purple lower on the breast side.
    sheen = o.smooth((-d.z - .55) / .5) * o.smooth((1.2 - abs(d.x)) / .6)
    shine = o.mix(GREEN, PURPLE, o.smooth((-d.z - 1.5) / .7))
    colour = o.mix(SLATE, shine, .85 * sheen * (.55 + .45 * o.speckle(p)))
    return o.mix(colour, body(f, p), o.smooth((-d.z - 2.6) / .6))


def wing(f, p):
    import original as o
    import city_parts as cp
    u, back, below, folded = cp.wing_zones(P, f, p)
    q = f.b(p)
    grey = o.mix(PALE, (.30, .31, .33), .35 * o.mottle(p, 4))
    if folded:
        # Pale grey shield; the primaries crossing over the rump are dark.
        return o.mix(grey, SLATE, o.smooth((-q.x - .40 * P['body']) / (.08 * P['body'])))
    if below:
        return o.mix(UNDERWING, SLATE, o.smooth((u - .72) / .12) + .8 * o.smooth((back - .80) / .1))
    # Above: pale inner wing with a dark bar towards the trailing edge, dark primaries.
    colour = o.mix(grey, BAR, .9 * o.smooth((back - .55) / .12) * (u < .62))
    return o.mix(colour, SLATE, o.smooth((u - .60) / .10))


def tail_feather(f, p):
    import original as o
    q = f.b(p)
    reach = (-q.x - .40 * P['body']) / .090
    return o.mix(o.mix(BLUE, SLATE, .5), BAR, .9 * o.smooth((reach - .70) / .08))


def extra(a, f, head_c, hr):
    import city_parts as cp
    from mathutils import Vector
    bl, bh = P['body'], P['height']
    cp.fan(a, f, (-.40 * bl, 0, .03 * bh), 7, .090, .022, 22, lambda p: tail_feather(f, p), fork=-.10, root_half=.010)
    for side in 'LR':
        cp.fold_bar(a, f, P, side, -.120, -.215, BAR, lean=.22, rise=(.45, -.70))
        cp.fold_bar(a, f, P, side, -.275, -.365, BAR, lean=.20, rise=(.50, -.60))
    # The white cere, a swelling over the base of the bill.
    a.oval(tuple(head_c + Vector((hr * .88, 0, -hr * .02))), (hr * .22, hr * .20, hr * .14), CERE, 'head', 3, 6)


P['extra'] = extra
PAINT = {'body': body, 'head': head, 'wing': wing, 'tail': tail_feather, 'bill': lambda f, p: (.030, .028, .030),
         'leg': lambda f, p: RED, 'eyering': lambda f, p: ORANGE}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
