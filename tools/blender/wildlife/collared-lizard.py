"""Collared lizard (Crotaphytus collaris): an original recipe with its own rig.

A large male, 0.40 m from snout to tail tip (the biggest reach about 0.35
m): a big blunt head on a narrow neck, a stout body held high at the front
on straight forelegs, long hind legs with long toes, and a round tail
nearly twice the body's length. Two black collars cross the neck with
white between and beside them. The body is blue-green crossed by yellow
bands and sprinkled with pale spots; the head is pale grey-buff, the feet
yellow, the tail pale grey with dark spots, the belly whitish (the
reference photographs in desert-references.json).
Idle: head up, looks about, bobs its head twice, throat pumps.
Walk: the lizard's trot in place, diagonal legs together, the body and
tail bending from side to side. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'collared-lizard'
GREEN = (.085, .270, .190)
TEAL = (.070, .215, .230)
YELLOW = (.56, .42, .045)
HEAD = (.40, .36, .28)
BELLY = (.56, .53, .44)
WHITE = (.66, .64, .58)
BLACK = (.012, .011, .010)
TAIL = (.34, .31, .25)
DARK = (.070, .060, .048)
SPOT = (.62, .62, .44)

# (x, centre height, half width, half depth) from the tail tip to the snout.
SPINE = [(-.262, .005, .0022, .0022), (-.215, .007, .0040, .0040), (-.160, .010, .0060, .0060), (-.105, .015, .0085, .0085),
         (-.058, .022, .0120, .0118), (-.028, .031, .0170, .0150), (-.008, .037, .0220, .0175), (.012, .044, .0270, .0200),
         (.034, .051, .0295, .0215), (.054, .058, .0280, .0205), (.070, .064, .0235, .0180), (.082, .069, .0180, .0150),
         (.092, .074, .0160, .0140), (.101, .079, .0195, .0160), (.110, .083, .0225, .0170), (.122, .085, .0215, .0160),
         (.133, .084, .0175, .0130), (.142, .081, .0120, .0090), (.149, .079, .0060, .0050), (.152, .078, .0020, .0020)]


def profile(x):
    """Centre height, half width and half depth at x, smoothly between the stations."""
    for (x0, *a), (x1, *b) in zip(SPINE, SPINE[1:]):
        if x <= x1:
            t = max(0, min(1, (x - x0) / (x1 - x0)))
            t = t * t * (3 - 2 * t) * .5 + t * .5
            return [p + (q - p) * t for p, q in zip(a, b)]
    return list(SPINE[-1][1:])


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .02))
    a.bone('hips', (.012, 0, .044), (-.028, 0, .031), 'root')
    a.bone('chest', (.012, 0, .044), (.082, 0, .069), 'root')
    a.bone('neck', (.082, 0, .069), (.101, 0, .079), 'chest')
    a.bone('head', (.101, 0, .079), (.152, 0, .078), 'neck')
    a.bone('tail1', (-.028, 0, .031), (-.090, 0, .017), 'hips')
    a.bone('tail2', (-.090, 0, .017), (-.170, 0, .009), 'tail1')
    a.bone('tail3', (-.170, 0, .009), (-.262, 0, .005), 'tail2')

    def up_of(p):
        z, w, h = profile(p.x)
        return (p.z - z) / max(h, .002)                     # -1 belly .. 1 back

    def along(p):
        """Where a vertex's ring crosses the spine. The rings lean where the back climbs to the head, so
        bands drawn by a vertex's own x come out as a checker."""
        z = profile(p.x)[0]
        slope = (profile(p.x + .002)[0] - profile(p.x - .002)[0]) / .004
        return p.x + (p.z - z) * slope

    def skin(p):
        up = up_of(p)
        back = o.smooth((up + .30) / .5)
        x = along(p)
        if x > .099:
            # Pale grey-buff head, darker on the crown, white lips and throat.
            colour = o.mix(HEAD, (.26, .23, .18), .5 * o.smooth((up - .3) / .5) * o.mottle(p, 9))
            return o.mix(WHITE, colour, o.smooth((up + .45) / .35))
        if x > .080:
            # The collar: white, black, white, black, white, from the head back to the shoulders.
            band = (x - .080) / .019
            black = (.14 < band < .44) or (.60 < band < .90)
            return o.mix(o.mix(WHITE, BELLY, .5), BLACK if black else WHITE, o.smooth((up + .55) / .25))
        if x > -.020:
            # Blue-green body crossed by narrow yellow bands.
            wave = math.cos(2 * math.pi * (x + .006) / .0185)
            colour = o.mix(o.mix(GREEN, TEAL, o.mottle(p, 6)), YELLOW, .85 * o.smooth((wave - .62) / .2))
            return o.mix(BELLY, colour, back)
        # Tail: pale grey, greener at its root, whitish below.
        colour = o.mix(TAIL, GREEN, .7 * o.smooth((x + .060) / .04))
        return o.mix(BELLY, colour, back)

    def marks(p):
        up = o.smooth((up_of(p) + .25) / .4)
        x = along(p)
        if x > .099:
            return DARK + (.55 * up * o.smooth((x - .099) / .01),)         # fine dark flecks on the head
        if x > .080:
            return SPOT + (0,)
        if x > -.040:
            return SPOT + (.95 * up,)                                      # pale spots over the green
        return DARK + (.85 * up,)                                          # dark spots down the tail

    sections, x = [], -.262
    while x < .1521:
        z, w, h = profile(x)
        sections.append(((x, 0, z), w, h))
        x += .0120 if x < -.060 else .0044 if x < .078 else .0024 if x < .100 else .0050
    body = o.near(a, ['tail3', 'tail2', 'tail1', 'hips', 'chest', 'neck', 'head'])
    a.mark = marks
    a.fur(sections, skin, body, 14, .010)
    a.mark = None
    for s in (1, -1):
        a.oval((.127, s * .0185, .0915), (.0042, .0022, .0036), BLACK, 'head', 3, 6)                 # eye
        a.oval((.126, s * .0170, .0955), (.0090, .0045, .0030), o.mix(HEAD, DARK, .35), 'head', 3, 6)   # brow ridge

    def limb(name, hip, knee, ankle, toe, radii, parent, s, colour, foot, toes):
        """One bent limb from inside the body to the wrist, a small palm, five long clawed toes."""
        upper, lower, hand = name + '.upper', name + '.lower', name + '.foot'
        a.bone(upper, hip, knee, parent)
        a.bone(lower, knee, ankle, upper)
        a.bone(hand, ankle, toe, lower)
        h, k, w, t = Vector(hip), Vector(knee), Vector(ankle), Vector(toe)
        r0, r1, r2 = radii
        a.mark = lambda p: SPOT + (.9,)
        a.tube3([h, h.lerp(k, .5), k.lerp(h, .12), k, k.lerp(w, .12), k.lerp(w, .55), w],
                [r0, r0 * .92, r1 * 1.05, r1, r1 * .98, r1 * .80, r2], colour, o.near(a, [upper, lower, hand, parent]), 8)
        a.mark = None
        ahead = (t - w)
        ahead.z = 0
        reach = ahead.length
        ahead.normalize()
        a.tube3([w + Vector((0, 0, -.0015)), w + ahead * reach * .40 + Vector((0, 0, -.004))], [r2 * 1.05, r2 * 1.20],
                foot, o.near(a, [hand, lower]), 6, .50)
        for k5 in range(5):
            angle = math.radians((k5 - 2) * 20 + 8 * s)
            d = Vector((ahead.x * math.cos(angle) - ahead.y * math.sin(angle), ahead.x * math.sin(angle) + ahead.y * math.cos(angle), 0))
            length = reach * toes[k5]
            base = w + ahead * reach * .30 + Vector((0, 0, -.004))
            tip = Vector((base.x, base.y, .0015)) + d * length
            a.tube3([base, base.lerp(tip, .55) + Vector((0, 0, .0025)), tip], [r2 * .42, r2 * .30, r2 * .07],
                    lambda p, tip=tip, length=length: BLACK if (Vector(p) - tip).length < length * .18 else foot, hand, 4)

    arm = lambda p: o.mix(TEAL, GREEN, o.mottle(p, 8))
    thigh = lambda p: o.mix(o.mix(GREEN, YELLOW, .30), TAIL, .4 * o.mottle(p, 8))
    for side, s in (('L', 1), ('R', -1)):
        # Straight forelegs that hold the chest high; the feet yellow.
        limb('front.' + side, (.066, s * .020, .058), (.058, s * .046, .040), (.070, s * .052, .0075),
             (.092, s * .058, .003), (.0092, .0070, .0048), 'chest', s, arm, YELLOW, (.80, .95, 1.0, .95, .70))
        # Long hind legs: the fourth toe is far the longest.
        limb('rear.' + side, (-.006, s * .018, .036), (.020, s * .058, .034), (-.014, s * .074, .0085),
             (.030, s * .094, .003), (.0135, .0092, .0056), 'hips', s, thigh, o.mix(YELLOW, TAIL, .45), (.60, .78, .95, 1.25, .80))

    o.finish(a, c, output, [('Idle', 150, idle), ('Walk', 24, walk)], roughness=.85, specular=.35)


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    # Two quick head-bobs a third of the way round the loop: the collared lizard's signal.
    bob = 0
    for start in (.30, .38):
        u = (t - start) / .07
        if 0 < u < 1:
            bob = math.sin(math.pi * u)
    o.turn(obj, 'neck', -.12 + .03 * math.sin(2 * w) + .22 * bob)
    o.turn(obj, 'head', .06 + .12 * bob)
    o.turn(obj, 'neck', .25 * math.sin(w) ** 3 * (1 - bob), (0, 0, 1))
    o.turn(obj, 'head', .30 * math.sin(w) ** 3 * (1 - bob), (0, 0, 1))
    o.stretch(obj, 'chest', (1, 1 + .035 * math.sin(7 * w), 1 + .035 * math.sin(7 * w)))
    # The tail lies in a lazy curve and its tip shifts.
    o.turn(obj, 'tail1', .14, (0, 0, 1))
    o.turn(obj, 'tail2', .30 + .05 * math.sin(w), (0, 0, 1))
    o.turn(obj, 'tail3', .45 + .12 * math.sin(2 * w + 1), (0, 0, 1))


def walk(obj, t):
    import original as o
    w = 2 * math.pi * t
    # Diagonal pairs step together; the body bends towards the hind foot that reaches forward.
    for name, s, offset, swing in (('front.L', 1, 0, .42), ('rear.R', -1, .04, .50), ('front.R', -1, .5, .42), ('rear.L', 1, .54, .50)):
        o.sprawl_step(obj, name + '.upper', s, (t + offset) % 1, swing, .30)
    bend = math.sin(w + .9)
    o.turn(obj, 'chest', .12 * bend, (0, 0, 1))
    o.turn(obj, 'hips', -.14 * bend, (0, 0, 1))
    o.turn(obj, 'neck', -.10 * bend, (0, 0, 1))
    o.turn(obj, 'head', -.06 * bend, (0, 0, 1))
    o.turn(obj, 'neck', -.06)
    # The tail is carried off the ground and swings.
    o.turn(obj, 'tail1', -.18 * math.sin(w + .2), (0, 0, 1))
    o.turn(obj, 'tail2', -.28 * math.sin(w - .9), (0, 0, 1))
    o.turn(obj, 'tail3', -.34 * math.sin(w - 2.0), (0, 0, 1))


if __name__ == '__main__':
    cli(ID, build)
