"""Europe wildcat, reshaped from the licensed Quaternius wolf as a cat.

About 0.35 m at the shoulder and 0.6 m nose to rump: the cougar's cat head,
small rounded ears and broad paws (cougar.shape), a sturdier body, and a
short thick tail with dark rings ending in a blunt black tip. Tabby
grey-brown coat with darker and lighter zones, dark vertical stripes on the
flanks, a dark line down the spine, pale throat and muzzle.
Donor frame and helpers: donor_shape.py; head and legs from cougar.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'wildcat'
DONOR = 'eastern-wolf'
BUDGET = 4300
SCALE = (.21, .20, .17)
EYE = .55
MOTTLE = .40
GRIZZLE = .30

TABBY = (.135, .108, .074)
DARK = (.018, .014, .010)
PALE = (.36, .32, .26)
BLACK = (.008, .007, .006)
TAIL_ROOT_Y, TAIL_ROOT_Z, TAIL_LENGTH = .81, 1.90, 2.15


def shape(p, bone, ctx):
    import cougar
    if bone.startswith('Tail'):
        # Short and thick: the donor tail shortened to half its length and
        # kept full to a blunt end, carried low behind.
        u = max(0, min(1, (p.y - TAIL_ROOT_Y) / TAIL_LENGTH))
        y0 = TAIL_ROOT_Y + .95 * u
        z0 = TAIL_ROOT_Z - .55 * u * u * (3 - 2 * u)
        dz = max(-.24, min(.24, p.z - (TAIL_ROOT_Z + .06 * u)))
        # Thick and bushy the whole way, ending blunt rather than pointed.
        radial = 1.35 if u < .92 else 1.35 - (u - .92) * 6
        p.x *= radial
        p.y, p.z = y0, z0 + dz * radial
        return p
    p = cougar.shape(p, bone, ctx)
    if bone in ('Body', 'Back') or bone.startswith('Torso'):
        p.x *= 1.10                                     # sturdier than a cougar
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return (.10, .08, .015)
    if 'nose' in material:
        return (.09, .05, .045)
    if bone.startswith('Tail'):
        u = (p.y - TAIL_ROOT_Y) / TAIL_LENGTH
        if u > .80:
            return BLACK                                  # blunt black tip
        ring = math.sin(u * 2 * math.pi * 3.2) > .25      # three or four dark rings
        return DARK if ring and u > .25 else TABBY
    if bone.startswith('Ear'):
        return d.mix(TABBY, DARK, .4)
    if bone == 'Head':
        centre = ctx.head('Head')
        if p.y < centre.y - .32 and p.z < centre.z + .02:
            return PALE                                   # pale muzzle
        if p.z < centre.z - .12:
            return PALE
        stripes = math.sin(p.x * 40) > .5 and p.z > centre.z + .05
        return d.mix(TABBY, DARK, .6 if stripes else 0)
    if bone.startswith('Neck'):
        return PALE if p.z < 1.72 else TABBY
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        bars = math.sin(p.z * 22) > .6 and p.z > .4
        return d.mix(TABBY, DARK, .55 if bars else 0)
    colour = TABBY
    # Broken dark vertical stripes on the flanks, a dark line down the spine.
    stripe = math.sin(p.y * 11 + math.sin(p.z * 6) * 1.2) > .25 and 1.20 < p.z < 2.0
    colour = d.mix(colour, DARK, .85 if stripe else 0)
    colour = d.mix(colour, DARK, d.smooth((p.z - 1.93) / .05) * d.smooth((.10 - abs(p.x)) / .05))
    return d.mix(colour, PALE, d.smooth((1.22 - p.z) / .12) * .7)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
