"""City and town street cat, reshaped from the licensed Quaternius wolf.

A thin working street cat, not a pet (the reference photograph in
city-references.json is a stray in Phnom Penh): about 0.25 m at the
shoulder and 0.40 m nose to rump, lean and long-legged, deeper in the body
and shorter in the leg than the wolf, a short neck, a round head with a
short muzzle and large upright ears, and a long tail carried up in a
curve. Black and white: a black cap and ears, a black back and upper
flanks, a black tail; white face, throat, chest, belly and legs, a little
dirty on the feet. Amber eyes.
Donor frame and helpers: donor_shape.py. The donor's clips are kept.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'street-cat'
DONOR = 'eastern-wolf'
BUDGET = 4100
SCALE = (.126, .140, .108)
EYE = .62
GRAIN = .6
MOTTLE = .12

BLACK = (.016, .015, .015)
WHITE = (.56, .54, .49)
DIRT = (.30, .25, .19)
NOSE = (.50, .44, .40)
AMBER = (.34, .24, .03)

TAIL_ROOT_Y, TAIL_ROOT_Z, DONOR_TAIL = .81, 2.00, 2.18
TAIL_LENGTH, TAIL_START, TAIL_CURL = 2.05, math.radians(18), math.radians(78)
HEAD = (1.36, 1.22, 1.42)          # the skull's size against the donor's
HEAD_BACK, HEAD_UP = .22, .06      # donor units the head is set back and up


def tail_curve(u):
    """Tail centre (y, z) and unit tangent at u in [0, 1]: out behind, then curving up."""
    y, z, steps = TAIL_ROOT_Y, TAIL_ROOT_Z, 40
    for i in range(int(round(max(0, min(1, u)) * steps))):
        angle = TAIL_START + TAIL_CURL * ((i + .5) / steps) ** 1.6
        y += math.cos(angle) * TAIL_LENGTH / steps
        z += math.sin(angle) * TAIL_LENGTH / steps
    angle = TAIL_START + TAIL_CURL * max(0, min(1, u)) ** 1.6
    return y, z, math.cos(angle), math.sin(angle)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Tail'):
        u = max(0, min(1, (p.y - TAIL_ROOT_Y) / DONOR_TAIL))
        y0, z0, ty, tz = tail_curve(u)
        radial = .46 - .10 * u
        dz = max(-.20, min(.20, p.z - 1.92)) * radial
        p.x *= radial
        p.y, p.z = y0 - tz * dz, z0 + ty * dz
        return p
    if bone == 'Head' or bone.startswith(('Ear', 'Neck')):
        centre = ctx.head('Head')
        if bone.startswith('Ear'):
            # Upright triangles, broad at the base, carried out with the larger skull.
            base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
            p = d.scale_about(p, base, (1.25, 1.0, 1.45))
            p.x -= (.30 if p.x > 0 else -.30) * max(0, p.z - base.z)      # upright, not splayed
            p.y -= .10                          # on top of the skull, not behind it
            lift = (base - centre)
            p.x += lift.x * (HEAD[0] - 1)
            p.z += lift.z * (HEAD[2] - 1)
        elif bone == 'Head':
            # A short muzzle on a round skull, and no ruff hanging under the jaw.
            if p.y < centre.y - .05:
                p.y = centre.y - .05 + (p.y - centre.y + .05) * .34
            if p.z < 1.80:
                p.z = 1.80 - (1.80 - p.z) * .30
            p = d.scale_about(p, centre, HEAD)
        elif bone != 'Neck3':
            p.x *= .92                          # a short neck with no ruff
        # The head sits back on a short neck, level with the raised back; one
        # smooth pull along the neck, so that no fold is left under the chin.
        pull = d.smooth((-1.05 - p.y) / .50)
        if bone.startswith('Neck') and p.z > 1.90:
            p.z = 1.90 + (p.z - 1.90) * (1 + .25 * (1 - pull))      # the neck's root rises with the back
        p.y += HEAD_BACK * pull
        p.z += HEAD_UP * pull
        return p
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder')):
        p.x *= .92
        # A cat is deeper in the body and shorter in the leg than a wolf: the
        # back is raised and the belly let down (the whole animal is then
        # scaled to the height of a cat), rising behind to a thin loin.
        tuck = d.smooth((p.y + .55) / 1.30)
        if p.z < 1.78:
            p.z = 1.78 - (1.78 - p.z) * (1.36 - .14 * tuck)
        elif p.z > 1.90:
            p.z = 1.90 + (p.z - 1.90) * 1.25
    elif bone.startswith('BackLeg'):
        p.x *= .94
        if p.z > 1.90:
            p.z = 1.90 + (p.z - 1.90) * 1.25
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = 1.0 if 'Upper' in bone else .94
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith(('FF', 'IK')):
        # Small round paws: narrower, shorter and lower than the paws of the wolf.
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * .96
        p.y = centre.y + (p.y - centre.y) * .72
        p.z *= .90
    return p


def dirty(colour, p):
    import donor_shape as d
    return d.mix(colour, DIRT, .05 + .45 * d.smooth((.55 - p.z) / .5))


def edge(p):
    """Where the black back ends on the flank: lower over the hips, higher at the shoulder, ragged."""
    import donor_shape as d
    return 1.50 + .30 * d.smooth((-p.y - .35) / .7) + .16 * (d.mottle(p, 1.6) - .5)


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return AMBER
    if 'nose' in material:
        return NOSE
    if bone.startswith('Tail'):
        return BLACK
    if bone.startswith('Ear'):
        return BLACK
    if bone == 'Head':
        centre = ctx.head('Head')
        # Black cap down to the eyes and over the back of the head; white muzzle, cheeks and chin.
        cap = d.smooth((p.z - centre.z - .13 + .10 * (d.mottle(p, 2.5) - .5)) / .05)
        cap = max(cap, d.smooth((p.y - centre.y - .02) / .10) * d.smooth((p.z - centre.z + .05) / .08))
        return d.mix(WHITE, BLACK, cap)
    if bone.startswith('Neck'):
        return d.mix(WHITE, BLACK, d.smooth((p.z - 2.02) / .08))
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        if bone.startswith('BackLeg'):
            return d.mix(WHITE, BLACK, d.smooth((p.z - edge(p)) / .06))
        return dirty(WHITE, p)
    colour = d.mix(WHITE, BLACK, d.smooth((p.z - edge(p)) / .06))
    return dirty(colour, p) if p.z < 1.3 else colour


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
