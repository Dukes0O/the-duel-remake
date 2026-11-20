"""City owl, a barn owl: an original recipe (shared bird rig in bird.py).

The pale owl of warehouses, docks and church towers the world over, about
0.34 m long with a 0.95 m span. It stands upright on long white-feathered
legs: a big round head with no ear tufts, a white heart-shaped face with a
tan rim and small dark eyes set in it, a small pale bill, white underparts
with a few dark flecks, golden-buff upperparts clouded with grey, a short
tail and long rounded wings. The face, its rim and the forward eyes are
their own flat piece on the head bone. Pale enough to be seen at night.
Idle: stands with wings folded and looks round. Fly: slow, deep, buoyant
wingbeats; white from below.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'owl'
WHITE = (.94, .92, .86)
SHADE = (.62, .62, .62)
BUFF = (.42, .25, .085)
GOLD = (.50, .32, .12)
GREY = (.24, .23, .22)
RIM = (.36, .21, .085)
FLECK = (.05, .04, .035)
BILL = (.56, .48, .40)
FOOT = (.40, .34, .30)
BLACK = (.008, .007, .007)

P = {'body': .19, 'width': .064, 'height': .070, 'neck': (.012, .048), 'head': .056, 'merged': True, 'head_reach': 1.25,
     'head_detail': (6, 12), 'nape': (.45, 1.0), 'eyes': False,
     'bill': (.030, .008, .006, .60), 'tail': (.060, .050, 'round'), 'span': .47,
     'primaries': (4, .15, .080, 32, False), 'body_sides': 10, 'fold_sides': 6, 'chord': (.25, .17), 'fold': .05,
     'leg': .108, 'stance': .034, 'toe': .0075, 'toes': [(15, .040), (-25, .038), (180, .028)],
     'tilt': 64, 'beat': 20, 'flap': .62, 'shag': .03, 'roughness': .95, 'specular': .25}
# No smoothing pass here: it would be followed by a cut back to budget that
# takes the face's rings with it. The owl is built under 2,000 triangles as it is.


def upper(f, p):
    import original as o
    colour = o.mix(GOLD, BUFF, o.mottle(p, 3))
    colour = o.mix(colour, GREY, .55 * o.smooth((o.mottle(p, 6) - .45) / .2))
    return o.mix(colour, FLECK if o.speckle(p) > .5 else WHITE, .35 * (o.speckle(p, 1.7) > .86))


def under(f, p):
    import original as o
    colour = o.mix(WHITE, SHADE, .15 * o.mottle(p, 3))
    return o.mix(colour, FLECK, .7 * (o.speckle(p, 1.3) > .93))


def body(f, p):
    import original as o
    q = f.b(p)
    return o.mix(under(f, p), upper(f, p), o.smooth((q.z - .05 * P['height']) / (.35 * P['height'])))


def head(f, p):
    import original as o
    import city_parts as cp
    d = (p - cp.head_centre(P, f)) / P['head']
    # Buff and grey over the crown and nape; white round the throat.
    return o.mix(under(f, p), upper(f, p), o.smooth((d.z + .25 - .5 * d.x) / .3))


def wing(f, p):
    import original as o
    import city_parts as cp
    u, back, below, folded = cp.wing_zones(P, f, p)
    if below and not folded:
        return o.mix(under(f, p), GREY, .25 * (math.sin(u * 60) > .6) * (back > .5))
    colour = upper(f, p)
    # Faint darker bars across the flight feathers.
    return o.mix(colour, GREY, .35 * (math.sin(u * 70) > .5) * (back > .45 or u > .66) * (not folded))


def tail(f, p):
    import original as o
    q = f.b(p)
    return o.mix(o.mix(GOLD, WHITE, .35), GREY, .4 * (math.sin(q.x * 190) > .5))


def leg(f, p):
    return WHITE if p.z > .022 else FOOT


def face(a, f, head_c, hr):
    """The heart-shaped face: a white dish with a tan rim, forward dark eyes, a ridge to the bill.

    The dish is lofted ring by ring from its middle out to the rim, so the
    white, the rim and the head behind each have their own ring of vertices.
    """
    import city_parts as cp
    import original as o
    from mathutils import Vector
    centre = head_c + Vector((hr * .30, 0, -hr * .07))
    depth, wide, tall = hr * .86, hr * .93, hr * .97
    face_white = o.mix(WHITE, (.96, .94, .88), .5)

    def dish(p):
        d = Vector(p) - centre
        r = math.hypot(d.y / wide, d.z / tall)
        notch = o.smooth((d.z / tall - .50) / .12) * o.smooth((.20 - abs(d.y) / wide) / .10)   # the dip at the top of the heart
        return o.mix(face_white, RIM, max(o.smooth((r - .80) / .06), notch))
    rings = [(1.00, .04), (.98, .30), (.92, .54), (.82, .74), (.68, .86), (.48, .95), (.24, .99), (0, 1.0)]
    a.loft([(tuple(centre + Vector((depth * x, 0, 0))), wide * r, tall * r) for x, r in rings], dish, 'head', 14)
    for s in (1, -1):
        eye = centre + Vector((depth * .955, s * wide * .30, tall * .14))
        a.oval(tuple(eye), (hr * .05, hr * .105, hr * .125), BLACK, 'head', 2, 6)
    # A narrow tan ridge between the eyes, running down to the bill.
    front = centre.x + depth
    a.loft([((front - hr * .03, 0, centre.z + tall * .40), hr * .03, hr * .03),
            ((front + hr * .02, 0, centre.z + tall * .06), hr * .07, hr * .06),
            ((front, 0, centre.z - tall * .22), hr * .06, hr * .05)], o.mix(RIM, WHITE, .35), 'head', 6)
    for side in 'LR':
        # White feathered legs.
        cp.stocking(a, f, P, side, lambda p: under(f, p), .62, (.026, .019, .011), 6)


P['extra'] = face
PAINT = {'body': body, 'head': head, 'wing': wing, 'tail': tail, 'bill': lambda f, p: BILL, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
