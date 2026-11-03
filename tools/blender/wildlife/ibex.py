"""Alps ibex billy, reshaped from the licensed Quaternius deer.

Stocky, about 0.95 m at the shoulder: deep heavy body on short strong legs,
a short thick neck, grey-brown coat with darker and lighter zones, dark legs
and a dark line along the flank above a pale belly, a short beard, and very
long ridged horns sweeping up and back in a wide arc over the back.
Donor frame and helpers: donor_shape.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'ibex'
DONOR = 'white-tailed-deer'
BUDGET = 3700
SCALE = (.50, .46, .39)
TALL = SCALE[1] / SCALE[2]
HEAD_DROP = .72
MOTTLE = .50
GRIZZLE = .35

GREY = (.095, .080, .062)
BACK = (.075, .062, .048)
DARK = (.030, .024, .019)
BELLY = (.30, .27, .22)
BLACK = (.008, .007, .006)


def head_move(p, ctx):
    import donor_shape as d
    p = d.scale_about(p, ctx.head('Head'), (1.10, 1, TALL * .92))
    p.z -= HEAD_DROP
    p.y += .16
    return p


def shape(p, bone, ctx):
    import donor_shape as d
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        p.x *= 1.32
        p.z = 2.56 - (2.56 - p.z) * 1.38 if p.z < 2.56 else 2.56 + (p.z - 2.56) * 1.2
    elif bone.startswith('Neck'):
        lift = d.smooth((p.z - 2.45) / 1.30)
        p.x *= 1.60
        p.y += .16 * lift
        p.z -= HEAD_DROP * lift
        p.z = p.z - .12 * (1 - lift)
    elif bone == 'Head':
        if p.y < -2.12:
            p.y = -2.12 + (p.y + 2.12) * .74
        p = head_move(p, ctx)
    elif bone.startswith('Ear'):
        p = d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), .60)
        p = head_move(p, ctx)
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = 1.32 if 'Upper' in bone else 1.18
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .5)
        p.z -= max(0, p.y - root.y) * .9
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return DARK
    if bone == 'Head' or bone.startswith('Ear'):
        return d.mix(GREY, BACK, .3) if p.y > -2.45 else d.mix(GREY, DARK, .45)
    if bone.startswith('Neck'):
        return d.mix(GREY, BACK, .35)
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        return d.mix(DARK, GREY, d.smooth((p.z - 1.6) / .5) * .6)
    colour = d.mix(GREY, BACK, d.smooth((p.z - 2.35) / .2))
    flank = d.smooth((.06 - abs(p.z - 1.98)) / .04)            # dark line along the flank
    colour = d.mix(colour, DARK, flank * .8)
    return d.mix(colour, BELLY, d.smooth((1.92 - p.z) / .08))


def parts(a, ctx):
    import donor_shape as d
    head = ctx.head('Head')
    hy, hz = head.y + .16, head.z - HEAD_DROP
    radius = 1.05
    for s in (-1, 1):
        start = (hy + .05, hz + .24)
        centre = (start[0] + radius, start[1])
        points, radii = [], []
        steps = 20
        for i in range(steps + 1):
            u = i / steps
            phi = math.radians(150 * u)
            y = centre[0] - radius * math.cos(phi)
            z = centre[1] + radius * math.sin(phi) * TALL
            points.append((s * (.10 + .32 * u ** 1.2), y, z))
            # Knobbed ridges along the horn.
            radii.append((.15 * (1 - u) ** .85 + .025) * (1 + .14 * max(0, math.sin(u * 60)) ** 2))
        bands = lambda t: tuple(q * (.75 + .25 * math.sin(t * 60)) for q in d.mix((.20, .16, .11), (.30, .25, .18), t))
        d.ring_tube(a, points, radii, bands, 'Head', 9, .85)
    # Short dark beard under the chin.
    d.ring_tube(a, [(0, hy - .48, hz - .20), (0, hy - .44, hz - .38), (0, hy - .38, hz - .52)], [.07, .05, .01],
                DARK, 'Head', 7)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
