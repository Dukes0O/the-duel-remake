"""Western mountains cougar, reshaped from the licensed Quaternius wolf.

About 0.7 m at the shoulder and 1.45 m nose to rump, long low body, thick
legs and big paws, a round head with a short muzzle and small rounded ears,
a long thick rope tail that hangs low with a lifted dark tip, plain tawny
coat with a cream belly and throat, white muzzle and dark whisker patches.
Donor frame and helpers: donor_shape.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'cougar'
DONOR = 'eastern-wolf'
BUDGET = 4300
SCALE = (.42, .42, .35)
EYE = .55

TAWNY = (.215, .118, .048)
BACK = (.160, .086, .036)
CREAM = (.44, .39, .31)
WHITE = (.58, .54, .47)
DARK = (.022, .016, .012)
BLACK = (.008, .007, .006)

TAIL_ROOT_Y, TAIL_ROOT_Z, TAIL_LENGTH = .81, 1.90, 2.15


def tail_curve(u):
    """New tail centre (y, z) at u in [0, 1]: down, then a lifted tip."""
    y = TAIL_ROOT_Y + 1.55 * u
    t = min(u, .80) / .80
    z = TAIL_ROOT_Z - .82 * t * t * (3 - 2 * t) + .30 * max(0, (u - .74) / .26) ** 1.6
    return y, z


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Tail'):
        u = max(0, min(1, (p.y - TAIL_ROOT_Y) / TAIL_LENGTH))
        y0, z0 = tail_curve(u)
        y1, z1 = tail_curve(min(1, u + .02))
        ty, tz = y1 - y0, z1 - z0
        n = math.hypot(ty, tz) or 1
        ny, nz = -tz / n, ty / n
        if nz < 0:
            ny, nz = -ny, -nz
        radial = .62 + .08 * u
        # The donor's bushy tail base hangs low; a cat's tail is a round rope.
        dz = max(-.17, min(.17, p.z - (TAIL_ROOT_Z + .06 * u))) * radial
        p.x *= radial
        p.y, p.z = y0 + ny * dz, z0 + nz * dz
        return p
    if bone == 'Head' or bone.startswith(('Ear', 'Neck3')):
        centre = ctx.head('Head')
        if bone.startswith('Ear'):
            # Small, rounded, set wider on the skull.
            base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
            # Small and rounded: shorter, and the tip pulled down into a curve.
            p = d.scale_about(p, base, (.52, .52, .38))
            rise = max(0, p.z - base.z - .05)
            p.z -= rise * .45
            p.x += (.07 if p.x > 0 else -.07) + (.04 if p.x > 0 else -.04) * min(1, rise / .06)
            p.y += .12
            p.z -= .07
            return p
        if bone == 'Head':
            if p.y < centre.y - .05:
                p.y = centre.y - .05 + (p.y - centre.y + .05) * .48
            p = d.scale_about(p, centre, (1.52, 1.26, 1.38))
            p.y += .08
        return p
    if bone.startswith('Neck'):
        p.x *= 1.18
    elif bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        p.x *= 1.06
        p.z = 1.95 - (1.95 - p.z) * 1.08
    elif 'Leg' in bone:
        centre = ctx.head(bone)
        f = 1.22 if 'Upper' in bone else 1.18
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith(('FF', 'IK')):
        # Broad cat paws, wider but no longer: a longer toe dug into the
        # ground at each step of the donor's walk.
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * 1.22
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return (.05, .035, .012)
    if 'nose' in material:
        return (.10, .045, .040)
    if bone.startswith('Tail'):
        u = (p.y - TAIL_ROOT_Y) / TAIL_LENGTH
        return d.mix(d.mix(TAWNY, BACK, .3), DARK, d.smooth((u - .80) / .10))
    if bone.startswith('Ear'):
        return DARK if p.y > ctx.head('Ear1.L').y else d.mix(TAWNY, CREAM, .3)
    if bone == 'Head':
        centre = ctx.head('Head')
        if p.y < centre.y - .32 and p.z < centre.z + .02:
            # White muzzle with black whisker patches at its sides.
            return DARK if abs(p.x) > .10 and p.z > centre.z - .14 else WHITE
        if p.z < centre.z - .12:
            return WHITE                                    # chin
        if p.y > centre.y - .04 and p.z > centre.z + .10:
            return d.mix(TAWNY, DARK, .75)                  # black behind the ears
        return d.mix(TAWNY, BACK, .25)
    if bone.startswith('Neck'):
        return WHITE if p.z < 1.72 else TAWNY               # white throat and chest
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        # Tawny outer legs, paler on the inside.
        return d.mix(TAWNY, CREAM, .45 if abs(p.x) < abs(ctx.head(bone).x) - .02 else .12)
    colour = d.mix(TAWNY, BACK, d.smooth((p.z - 1.80) / .18))
    colour = d.mix(colour, CREAM, d.smooth((1.30 - p.z) / .14))
    # White chest between the forelegs.
    return d.mix(colour, WHITE, d.smooth((1.55 - p.z) / .15) * d.smooth((-.80 - p.y) / .2))


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
