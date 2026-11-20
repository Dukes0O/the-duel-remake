"""California condor: an original recipe (shared bird rig in bird.py).

The largest land bird in North America, about 1.25 m long with a 2.9 m span:
black plumage, a bare orange-pink head and neck rising out of a ruff of
black feathers, a pale hooked bill, grey-pink legs, a short square tail and
very long, very broad wings ending in seven long "fingers". From below a
long white triangle lies along the front of each inner wing, the mark that
names the bird in the air; from above and when the wing is folded a thin
white bar crosses it (the reference photographs in desert-references.json).
Idle: stands hunched, wings folded, looks round. Fly: soars on flat, steady
wings, tips a little raised, with barely a flap.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'condor'
BLACK = (.016, .015, .016)
SOOT = (.040, .036, .034)
WHITE = (.92, .91, .88)
SKIN = (.58, .25, .10)
PINK = (.50, .17, .13)
IVORY = (.56, .50, .40)
LEG = (.30, .25, .23)

P = {'body': .56, 'width': .160, 'height': .175, 'neck': (.085, .120), 'head': .039, 'neck_r': .74,
     'bill': (.056, .036, .022, .60), 'tail': (.20, .15, 'round'), 'span': 1.45, 'fold': .17,
     'primaries': (7, .50, .115, 62, True), 'body_sides': 14, 'fold_sides': 10, 'chord': (.64, .28), 'leg': .24, 'stance': .09,
     'toe': .014, 'toes': [(0, .10), (30, .085), (-30, .085), (180, .045)], 'tilt': 42, 'beat': 90, 'flap': .045,
     'dihedral': .09, 'teeter': .035, 'shag': .035, 'roughness': 1, 'specular': .22, 'refine': 1950}


def head_centre(f):
    from mathutils import Vector
    return f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))


def plumage(f, p):
    import original as o
    return o.mix(BLACK, SOOT, .7 * o.mottle(p, 1.6) * (.4 + .6 * o.speckle(p)))


def head(f, p):
    import original as o
    # Bare orange skin, pinker and darker in patches; the black ruff begins below the head.
    d = (p - head_centre(f)).length / P['head']
    skin = o.mix(SKIN, PINK, o.mottle(p, 8))
    skin = o.mix(skin, (.20, .07, .06), .35 * (o.speckle(p) > .7))
    return o.mix(skin, plumage(f, p), o.smooth((d - 2.6) / .5))


def ruff(a, f, head_c, hr):
    """A collar of loose black feathers the bare neck rises out of, and feathered thighs."""
    from mathutils import Vector
    chest = f.w((.42 * P['body'], 0, .10 * P['height']))
    at = chest.lerp(head_c, .16) + Vector((-.020, 0, .004))
    a.oval(tuple(at), (.085, .098, .060), lambda p: plumage(f, p), 'neck', 5, 12)
    for k in range(11):
        ang = math.radians(-165 + 330 * k / 10)
        out = Vector((math.cos(ang) * .62, math.sin(ang), 0))
        base = at + Vector((out.x * .060, out.y * .070, .020))
        tip = base + Vector((out.x * .040, out.y * .040, .058 + .020 * (k % 2)))
        a.tube3([base, base.lerp(tip, .55) + out * .010, tip], [.024, .016, .003], lambda p: plumage(f, p), 'neck', 4)
    wing_marks(a, f)
    for s, side in ((1, 'L'), (-1, 'R')):
        hip = f.hip_w + Vector((0, s * P['stance'], .03))
        a.tube3([hip, hip + Vector((.004, 0, -.07)), Vector((.008, s * P['stance'], .115))], [.062, .046, .020],
                lambda p: plumage(f, p), 'leg.' + side, 7)


# Paler edges to the feathers of the back and the folded wings, as fine marks.
P['marks'] = {'body': lambda f, p: (.085, .078, .072, .8), 'fold': lambda f, p: (.085, .078, .072, .8)}
P['extra'] = ruff


def wing_marks(a, f):
    """The white marks, as thin sheets of their own just clear of the wing's skin.

    Painted on the wing they blur: a wing has only four rows of vertices from front to back.
    Under each spread wing a triangle, deep at the body and ending in a point at 0.6 of the
    span; above it a narrow bar along the coverts; on each folded wing the same bar.
    """
    import original as o
    from mathutils import Vector
    bl, bw, bh = P['body'], P['width'], P['height']
    sx, sy, sz = .20 * bl, bw * .70, .45 * bh
    reach = P['span'] - sy
    c0 = P['chord'][0]
    lead = lambda u: sx + c0 * (.16 * math.sin(math.pi * min(u / .42, 1) / 2) - .45 * max(0, (u - .42) / .58) ** 1.4)
    chord = lambda u: c0 * (1 - .08 * min(u / .42, 1) - .55 * max(0, (u - .42) / .28) ** 1.2)
    up = tuple(f.tilt @ Vector((0, 0, 1)))
    for side, s in (('L', 1), ('R', -1)):
        weight = o.near(a, ['wing1.' + side, 'wing2.' + side])
        under, over = [], []
        for k in range(7):
            u = .005 + .625 * k / 6
            y = s * (sy + reach * u)
            front = lead(u) - chord(u) * .09
            under.append((tuple(f.w((front, y, sz - .020))), tuple(f.w((front - chord(u) * (.58 * (1 - u / .64) + .015), y, sz - .022))), .0012, up))
            v = .05 + .40 * k / 6
            y = s * (sy + reach * v)
            over.append((tuple(f.w((lead(v) - chord(v) * .50, y, sz + .016))), tuple(f.w((lead(v) - chord(v) * .57, y, sz + .015))), .0012, up))
        a.blade(under, WHITE, weight)
        a.blade(over, WHITE, weight)
        # The bar on the folded wing, from the bend of the wing back and down towards the tail.
        out = (0, s, 0)
        bar = [((.10 * bl, bw * 1.00 + .016, .16 * bh), .05), ((-.06 * bl, bw * .99 + .018, .08 * bh), .07),
               ((-.24 * bl, bw * .90 + .018, .00 * bh), .08), ((-.40 * bl, bw * .74 + .016, -.06 * bh), .06)]
        a.blade([(tuple(f.w((x, s * y, z))), tuple(f.w((x - .01, s * y, z - drop * bh * 2.2))), .0015, out) for (x, y, z), drop in bar],
                WHITE, 'fold.' + side)


def bill(f, p):
    return IVORY if p.x > head_centre(f).x + P['head'] * 1.15 else SKIN


def leg(f, p):
    import original as o
    return plumage(f, p) if p.z > .12 else o.mix(LEG, (.55, .50, .46), .5 * o.mottle(p, 8))


PAINT = {'body': plumage, 'head': head, 'wing': plumage, 'tail': plumage, 'bill': bill, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
