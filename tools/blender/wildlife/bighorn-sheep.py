"""Western mountains bighorn sheep ram, reshaped from the licensed Quaternius deer.

About 1 m at the shoulder: deep heavy body, shorter stout legs, short thick
neck, blunt face, small ears, brown coat with a white rump, muzzle, belly and
leg backs, and massive ridged horns that curl back, down and forward round
the ear. Donor frame and helpers: donor_shape.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'bighorn-sheep'
DONOR = 'white-tailed-deer'
BUDGET = 3700
SCALE = (.50, .46, .38)
# The parent squashes height more than length; parts and the head are
# authored in true proportion by stretching their heights back.
TALL = SCALE[1] / SCALE[2]
HEAD_DROP = .80

COAT = (.090, .062, .040)
BACK = (.070, .048, .031)
WHITE = (.50, .47, .41)
LEG = (.050, .036, .025)
BLACK = (.010, .009, .008)


def head_move(p, ctx, amount):
    """Lower the head on a short neck, keeping its true height."""
    import donor_shape as d
    centre = ctx.head('Head')
    p = d.scale_about(p, centre, (1.08, 1, TALL * .92))
    p.z -= HEAD_DROP * amount
    p.y += .18 * amount
    return p


def shape(p, bone, ctx):
    import donor_shape as d
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        p.x *= 1.30
        p.z = 2.56 - (2.56 - p.z) * 1.42 if p.z < 2.56 else 2.56 + (p.z - 2.56) * 1.2
    elif bone.startswith('Neck'):
        lift = d.smooth((p.z - 2.45) / 1.30)
        p.x *= 1.55
        p.y += .18 * lift
        p.z -= HEAD_DROP * lift
        p.z = p.z - .15 * (1 - lift)
    elif bone == 'Head':
        if p.y < -2.12:
            p.y = -2.12 + (p.y + 2.12) * .70
        p = head_move(p, ctx, 1)
    elif bone.startswith('Ear'):
        p = d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), .55)
        p = head_move(p, ctx, 1)
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = 1.30 if 'Upper' in bone else 1.15
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .55)
        p.z -= max(0, p.y - root.y) * .9
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return BACK
    if bone == 'Head' or bone.startswith('Ear'):
        if p.y < -2.48:
            return WHITE
        return d.mix(COAT, (.11, .085, .06), .4)
    if bone.startswith('Neck'):
        return d.mix(COAT, BACK, .3)
    if bone.startswith(('FF', 'IK')):
        return LEG
    rump = d.smooth((p.y - 1.10) / .16) * d.smooth((p.z - 1.75) / .12)
    if 'Leg' in bone or 'Shoulder' in bone:
        # Brown legs like the body, darker low down; pale only on the back
        # edge of the lower legs and where the rump patch runs down.
        colour = d.mix(COAT, LEG, d.smooth((1.30 - p.z) / .5))
        if 'LowerLeg' in bone and p.y > ctx.head(bone).y + .085:
            colour = d.mix(colour, WHITE, .75)
        return d.mix(colour, WHITE, rump)
    colour = d.mix(COAT, BACK, d.smooth((p.z - 2.35) / .2))
    colour = d.mix(colour, WHITE, d.smooth((1.86 - p.z) / .10))
    return d.mix(colour, WHITE, rump)

def parts(a, ctx):
    """Two curled horns. Authored around a curl centre beside the skull."""
    import donor_shape as d
    head = ctx.head('Head')
    hz = head.z - HEAD_DROP
    hy = head.y + .18
    for s in (-1, 1):
        points, radii = [], []
        steps = 18
        for i in range(steps + 1):
            u = i / steps
            phi = math.radians(-35 + 375 * u)        # up-forward, back, down, forward
            radius = .40 - .10 * u
            x = s * (.14 + .40 * u ** 1.3)
            y = hy + .30 + radius * math.sin(phi)
            z = hz - .04 + radius * math.cos(phi) * TALL
            points.append((x, y, z))
            radii.append(.17 * (1 - u) ** .8 + .018)
        ridges = lambda t: tuple(q * (.78 + .22 * math.sin(t * 95)) for q in d.mix((.17, .135, .095), (.27, .225, .165), t))
        d.ring_tube(a, points, radii, ridges, 'Head', 9)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
