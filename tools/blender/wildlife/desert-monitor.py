"""Wasteland desert monitor (Varanus griseus): an original recipe with its own rig.

A big one, 1.4 m from snout to tail tip: a long flat head on a long thick
neck, a low body wider than it is deep and carried clear of the ground on
sprawled legs with long clawed toes, and a tail longer than the body that
thins to a whip. Sandy grey-tan with dark crossbands over the back, rows of
yellow spots between them, a strongly ringed tail with a dark tip, dark
streaks behind the eye, a pale speckled throat and belly (the reference
photograph in waste-references.json).
Idle: head up, looks about, throat pumps, tail tip shifts. Walk: the
lizard's trot in place, diagonal legs together, the body and tail bending
from side to side. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'desert-monitor'
SAND = (.265, .225, .165)
DARK = (.038, .034, .030)
YELLOW = (.42, .34, .15)
BELLY = (.50, .44, .34)
BLACK = (.012, .011, .010)

# (x, centre height, half width, half depth) from the tail tip to the snout.
SPINE = [(-.80, .010, .004, .004), (-.70, .012, .008, .008), (-.58, .016, .013, .013), (-.45, .024, .020, .021),
         (-.32, .046, .030, .032), (-.20, .086, .045, .043), (-.11, .112, .066, .051), (0, .124, .081, .057),
         (.10, .128, .085, .058), (.19, .131, .075, .054), (.27, .138, .058, .046), (.35, .150, .042, .037),
         (.42, .159, .036, .031), (.47, .163, .039, .029), (.52, .160, .034, .024), (.565, .154, .023, .016),
         (.592, .150, .012, .009), (.602, .148, .004, .004)]


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
    a.bone('root', (0, 0, 0), (0, 0, .05))
    a.bone('hips', (0, 0, .124), (-.11, 0, .112), 'root')
    a.bone('chest', (0, 0, .124), (.27, 0, .138), 'root')
    a.bone('neck', (.27, 0, .138), (.44, 0, .160), 'chest')
    a.bone('head', (.44, 0, .160), (.60, 0, .148), 'neck')
    a.bone('tail1', (-.11, 0, .112), (-.30, 0, .050), 'hips')
    a.bone('tail2', (-.30, 0, .050), (-.52, 0, .018), 'tail1')
    a.bone('tail3', (-.52, 0, .018), (-.80, 0, .010), 'tail2')

    def skin(p):
        z, w, h = profile(p.x)
        up = (p.z - z) / max(h, .004)                       # -1 belly .. 1 back
        back = o.smooth((up + .25) / .5)
        grain = o.speckle(p)
        on_tail = o.smooth((-.14 - p.x) / .08)
        period = .078 - .022 * on_tail
        wave = math.cos(2 * math.pi * (p.x + .012 * math.sin(p.y * 40)) / period)
        band = o.smooth((wave - .30 + .5 * (o.mottle(p, 4) - .5)) / .30) * (1 - .9 * o.smooth((p.x - .30) / .06))
        ground = o.mix(SAND, (.33, .29, .21), o.mottle(p, 3))
        colour = o.mix(ground, DARK, band * (.82 if grain < .82 else .25))
        # Rows of yellow spots across the pale spaces and scattered on the bands.
        spots = (1 - band) * (grain > .72) + band * (grain > .90)
        colour = o.mix(colour, YELLOW, .70 * min(1, spots) * (1 - on_tail * .5))
        colour = o.mix(colour, DARK, .45 * (1 - band) * (grain < .16))                  # dark flecks in the pale spaces
        # Dark streaks from the eye back along the neck.
        if .30 < p.x < .50 and up > -.2:
            streak = o.smooth((.012 - abs(abs(p.y) - (.020 + .05 * (.50 - p.x)))) / .008)
            colour = o.mix(colour, DARK, .8 * streak)
        if p.x > .50:
            colour = o.mix(o.mix(SAND, (.20, .17, .13), .5), DARK, .30 * (grain > .6))   # plain greyer snout
        tip = o.smooth((-.66 - p.x) / .06)
        colour = o.mix(colour, DARK, .85 * tip)
        belly = o.mix(BELLY, DARK, .55 * (grain > .86))
        return o.mix(belly, colour, back)

    sections, x = [], -.80
    while x < .6021:
        z, w, h = profile(x)
        sections.append(((x, 0, z), w, h))
        x += .0160 if x < -.14 else .0120 if x < .30 else .0125
    body = o.near(a, ['tail3', 'tail2', 'tail1', 'hips', 'chest', 'neck', 'head'])
    a.fur(sections, skin, body, 18, .012)
    for s in (1, -1):
        a.oval((.505, s * .029, .172), (.0075, .004, .006), BLACK, 'head', 3, 6)          # eye
        a.oval((.505, s * .026, .178), (.016, .008, .005), o.mix(SAND, DARK, .4), 'head', 3, 6)   # brow

    def limb(p):
        return o.mix(o.mix(DARK, SAND, .62), YELLOW, .8 * (o.speckle(p) > .62))
    for side, s in (('L', 1), ('R', -1)):
        o.small_leg(a, 'front.' + side, (.250, s * .058, .132), (.222, s * .128, .092), (.256, s * .152, .022),
                    (.306, s * .168, .009), (.030, .023, .016), limb, o.mix(SAND, DARK, .25), False, 'chest', claws=5)
        o.small_leg(a, 'rear.' + side, (-.090, s * .056, .112), (-.040, s * .138, .084), (-.086, s * .164, .022),
                    (-.030, s * .196, .009), (.038, .027, .018), limb, o.mix(SAND, DARK, .25), True, 'hips', claws=5)

    o.finish(a, c, output, [('Idle', 150, idle), ('Walk', 30, walk)])


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    o.turn(obj, 'neck', -.16 + .03 * math.sin(2 * w))
    o.turn(obj, 'head', .10)
    o.turn(obj, 'neck', .22 * math.sin(w) ** 3, (0, 0, 1))
    o.turn(obj, 'head', .30 * math.sin(w) ** 3, (0, 0, 1))
    o.stretch(obj, 'chest', (1, 1 + .03 * math.sin(6 * w), 1 + .03 * math.sin(6 * w)))
    # The tail lies in a lazy curve and its tip shifts.
    o.turn(obj, 'tail1', .16, (0, 0, 1))
    o.turn(obj, 'tail2', .34 + .05 * math.sin(w), (0, 0, 1))
    o.turn(obj, 'tail3', .50 + .12 * math.sin(2 * w + 1), (0, 0, 1))


def walk(obj, t):
    import original as o
    w = 2 * math.pi * t
    # Diagonal pairs step together; the body bends towards the hind foot that reaches forward.
    for name, s, offset in (('front.L', 1, 0), ('rear.R', -1, .04), ('front.R', -1, .5), ('rear.L', 1, .54)):
        o.sprawl_step(obj, name + '.upper', s, (t + offset) % 1, .46, .28)
    bend = math.sin(w + .9)
    o.turn(obj, 'chest', .12 * bend, (0, 0, 1))
    o.turn(obj, 'hips', -.12 * bend, (0, 0, 1))
    o.turn(obj, 'neck', -.10 * bend, (0, 0, 1))
    o.turn(obj, 'head', -.06 * bend, (0, 0, 1))
    o.turn(obj, 'neck', -.08)
    o.turn(obj, 'tail1', -.20 * math.sin(w + .2), (0, 0, 1))
    o.turn(obj, 'tail2', -.30 * math.sin(w - .9), (0, 0, 1))
    o.turn(obj, 'tail3', -.36 * math.sin(w - 2.0), (0, 0, 1))


if __name__ == '__main__':
    cli(ID, build)
