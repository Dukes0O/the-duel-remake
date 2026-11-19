"""Wasteland town camp dog, reshaped from the licensed Quaternius wolf.

A scruffy village dog of the kind that lives around poor farms everywhere
(the reference photograph in waste-references.json is an Indian pariah
dog), about 0.50 m at the shoulder: lean and leggy with a deep chest and a
tucked-up belly, a thin neck with no ruff, a narrow head, pricked ears, and
a thin tail carried up in a curl over the back. Short fawn coat, paler on
the legs, chest and belly, darker round the muzzle, faint ribs, dust on the
legs. Donor frame and helpers: donor_shape.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'camp-dog'
DONOR = 'eastern-wolf'
BUDGET = 4100
SCALE = (.215, .262, .268)
GRAIN = 1.0
MOTTLE = .45

FAWN = (.330, .172, .066)
BACK = (.225, .112, .044)
CREAM = (.43, .32, .19)
MUZZLE = (.085, .060, .042)
DUST = (.30, .24, .17)
BLACK = (.010, .009, .008)

TAIL_ROOT_Y, TAIL_ROOT_Z, DONOR_TAIL = .81, 1.90, 2.18
TAIL_LENGTH, TAIL_START, TAIL_CURL = 1.55, math.radians(32), math.radians(235)


def tail_curve(u):
    """Tail centre (y, z) and unit tangent at u in [0, 1]: up, then curled forward."""
    y, z, steps = TAIL_ROOT_Y, TAIL_ROOT_Z, 40
    angle = TAIL_START
    for i in range(int(round(max(0, min(1, u)) * steps))):
        angle = TAIL_START + TAIL_CURL * ((i + .5) / steps) ** 1.5
        y += math.cos(angle) * TAIL_LENGTH / steps
        z += math.sin(angle) * TAIL_LENGTH / steps
    angle = TAIL_START + TAIL_CURL * max(0, min(1, u)) ** 1.5
    return y, z, math.cos(angle), math.sin(angle)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Tail'):
        u = max(0, min(1, (p.y - TAIL_ROOT_Y) / DONOR_TAIL))
        y0, z0, ty, tz = tail_curve(u)
        radial = .62 - .22 * u
        dz = max(-.20, min(.20, p.z - 1.92)) * radial
        p.x *= radial
        p.y, p.z = y0 - tz * dz, z0 + ty * dz
        return p
    if bone.startswith('Ear'):
        base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
        return d.scale_about(p, base, (1.05, 1.0, 1.12))
    if bone == 'Head':
        centre = ctx.head('Head')
        nose = d.smooth((centre.y - p.y - .10) / .45)
        p.x = centre.x + (p.x - centre.x) * (.84 - .16 * nose)
        p.z = centre.z + (p.z - centre.z) * (.94 - .08 * nose)
        return p
    if bone.startswith('Neck'):
        # A short-coated neck: no ruff at the sides or under the throat.
        p.x *= .72
        if p.z < 1.95:
            p.z = 1.95 - (1.95 - p.z) * .70
        return p
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder')):
        p.x *= .82
        # Deep chest, belly tucked up hard towards the loin.
        tuck = d.smooth((p.y + .55) / 1.30)
        if p.z < 1.78:
            p.z = 1.78 - (1.78 - p.z) * (.90 - .40 * tuck)
    elif bone.startswith('BackLeg'):
        p.x *= .90
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = .80 if 'Upper' in bone else .74
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith(('FF', 'IK')):
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * .92
    return p


def dusty(colour, p):
    import donor_shape as d
    return d.mix(colour, DUST, .04 + .32 * d.smooth((.75 - p.z) / .7))


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return (.05, .032, .012)
    if 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        u = (p.y - TAIL_ROOT_Y) / DONOR_TAIL
        return d.mix(d.mix(FAWN, BACK, .4), CREAM, .5 * d.smooth((u - .75) / .2))
    if bone.startswith('Ear'):
        return d.mix(BACK, MUZZLE, .60)
    if bone == 'Head':
        centre = ctx.head('Head')
        colour = d.mix(FAWN, BACK, .3)
        colour = d.mix(colour, MUZZLE, .90 * d.smooth((centre.y - p.y - .26) / .22))   # dark muzzle
        return d.mix(colour, CREAM, .6 * d.smooth((centre.z - .16 - p.z) / .10) * d.smooth((p.y - centre.y + .45) / .2))
    if bone.startswith('Neck'):
        return d.mix(d.mix(FAWN, BACK, .2), CREAM, .7 * d.smooth((1.72 - p.z) / .15))
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        return dusty(d.mix(FAWN, CREAM, d.smooth((1.15 - p.z) / .5) * .75), p)
    colour = d.mix(FAWN, BACK, d.smooth((p.z - 1.85) / .22) * .8)
    # Faint ribs showing through a short coat on a thin dog.
    ribs = d.smooth((p.y + .95) / .1) * d.smooth((-.05 - p.y) / .2) * d.smooth((p.z - 1.35) / .1) * d.smooth((1.95 - p.z) / .15)
    colour = d.mix(colour, tuple(q * .62 for q in colour), ribs * (.5 + .5 * math.sin(p.y * 38)) * .80)
    return dusty(d.mix(colour, CREAM, .8 * d.smooth((1.36 - p.z) / .14)), p)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
