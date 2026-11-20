"""Desert bighorn ram (Ovis canadensis nelsoni), reshaped from the licensed Quaternius deer.

The bighorn of the Mojave and the canyon country, about 0.9 m at the
shoulder: lighter and leaner than the mountain ram (bighorn-sheep.py), with
longer legs for its size, a short sleek coat the colour of pale sandstone,
a white rump round a dark tail, a white muzzle, pale belly and pale backs
to the legs with a dark stripe down their fronts, and heavy ridged
yellow-brown horns that curl back, down and forward round the ear and
flare outwards (the reference photographs in desert-references.json).
Donor frame and helpers: donor_shape.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'desert-bighorn'
DONOR = 'white-tailed-deer'
BUDGET = 3700
SCALE = (.44, .425, .355)
# The parent squashes height more than length; parts and the head are
# authored in true proportion by stretching their heights back.
TALL = SCALE[1] / SCALE[2]
HEAD_DROP = .66
MOTTLE = .32
GRIZZLE = .10

SAND = (.300, .205, .118)
BACK = (.215, .145, .085)
WHITE = (.54, .50, .43)
LEG = (.070, .046, .030)
DARKER = (.135, .088, .052)
BLACK = (.012, .010, .009)
HORN = (.20, .135, .065)


def head_move(p, ctx, amount):
    """Lower the head on a short neck, keeping its true height."""
    import donor_shape as d
    centre = ctx.head('Head')
    p = d.scale_about(p, centre, (1.10, 1, TALL * .94))
    p.z -= HEAD_DROP * amount
    p.y += .16 * amount
    return p


def shape(p, bone, ctx):
    import donor_shape as d
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        # A sheep's barrel, but lean: fuller than the deer, the belly tucked up towards the flank.
        p.x *= 1.30
        tuck = d.smooth((p.y - .2) / 1.0)
        p.z = 2.56 - (2.56 - p.z) * (1.44 - .14 * tuck) if p.z < 2.56 else 2.56 + (p.z - 2.56) * 1.22
    elif bone.startswith('Neck'):
        lift = d.smooth((p.z - 2.45) / 1.30)
        p.x *= 1.58
        p.y += .16 * lift
        p.z -= HEAD_DROP * lift
        p.z = p.z - .12 * (1 - lift)
    elif bone == 'Head':
        if p.y < -2.12:
            p.y = -2.12 + (p.y + 2.12) * .72
        # A sheep's deep blunt muzzle, not a deer's fine one.
        snout = d.smooth((-2.10 - p.y) / .25)
        centre = ctx.head('Head')
        p.x *= 1 + .22 * snout
        p.z = centre.z + (p.z - centre.z) * (1 + .16 * snout) - .03 * snout
        p = head_move(p, ctx, 1)
    elif bone.startswith('Ear'):
        p = d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), .58)
        p = head_move(p, ctx, 1)
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = 1.30 if 'Upper' in bone else 1.14
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .50)
        p.z -= max(0, p.y - root.y) * .9
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return d.mix(LEG, BLACK, .4)
    if bone == 'Head' or bone.startswith('Ear'):
        if p.y < -2.46:
            return WHITE                                          # the white muzzle
        return d.mix(SAND, BACK, .55)
    if bone.startswith('Neck'):
        return d.mix(BACK, DARKER, .45)                           # the darker neck and chest
    rump = d.smooth((p.y - 1.06) / .16) * d.smooth((p.z - 1.70) / .12)
    if bone.startswith(('FF', 'IK')):
        return d.mix(LEG, SAND, .35)
    if 'Leg' in bone or 'Shoulder' in bone:
        # A dark stripe down the front of each leg, pale behind and inside.
        # The bone runs down the leg's middle; in front of it the leg is dark, behind it pale.
        head, tail = ctx.head(bone), ctx.tail(bone)
        t = max(0, min(1, (p.z - head.z) / (tail.z - head.z))) if abs(tail.z - head.z) > .05 else .5
        ahead = head.y + (tail.y - head.y) * t - p.y
        low = d.smooth((1.75 - p.z) / .5)
        colour = d.mix(SAND, d.mix(WHITE, SAND, .45), low * d.smooth(-ahead / .05))
        colour = d.mix(colour, LEG, .80 * low * d.smooth((ahead + .01) / .05))
        return d.mix(colour, WHITE, rump)
    colour = d.mix(SAND, BACK, d.smooth((p.z - 2.40) / .25))
    colour = d.mix(colour, DARKER, .5 * d.smooth((-.75 - p.y) / .5))                  # darker over the shoulder and chest
    colour = d.mix(colour, d.mix(WHITE, SAND, .15), d.smooth((1.96 - p.z) / .16))     # pale belly
    return d.mix(colour, WHITE, rump)


def parts(a, ctx):
    """Two curled horns, flaring wider than the mountain ram's. Authored round a curl centre beside the skull."""
    import donor_shape as d
    head = ctx.head('Head')
    hz = head.z - HEAD_DROP
    hy = head.y + .16
    for s in (-1, 1):
        points, radii = [], []
        steps = 18
        for i in range(steps + 1):
            u = i / steps
            phi = math.radians(-38 + 300 * u)        # up-forward, back, down, forward: an open curl, not a ring
            radius = .41 - .15 * u
            x = s * (.13 + .56 * u ** 1.25)
            # The curl is centred on the cheek, so the face fills it; no ring of daylight behind the head.
            y = hy + .13 + radius * math.sin(phi)
            z = hz - .07 + radius * math.cos(phi) * TALL
            points.append((x, y, z))
            radii.append(.175 * (1 - u ** 1.7) ** .9 + .014)
        ridges = lambda t: tuple(q * (.76 + .24 * math.sin(t * 95)) for q in d.mix(HORN, (.30, .22, .12), t))
        d.ring_tube(a, points, radii, ridges, 'Head', 9)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
