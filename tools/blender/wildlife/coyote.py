"""Western mountains coyote, reshaped from the licensed Quaternius wolf.

About 0.6 m at the shoulder: slimmer and lighter than the wolf, longer ears,
a narrow pointed muzzle, slim legs, a bushy tail carried low with a black
tip; grizzled grey-buff back, rusty red-tan legs, ears and muzzle, cream
throat and belly. Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'coyote'
DONOR = 'eastern-wolf'
BUDGET = 4100
SCALE = (.27, .31, .305)

GRIZZLE = (.115, .095, .072)
SADDLE = (.060, .050, .040)
RUST = (.205, .110, .052)
CREAM = (.46, .41, .33)
BLACK = (.010, .009, .008)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Ear'):
        base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
        return d.scale_about(p, base, (1.0, 1.0, 1.22))
    if bone == 'Head':
        centre = ctx.head('Head')
        nose = d.smooth((centre.y - p.y - .15) / .45)
        p.x = centre.x + (p.x - centre.x) * (1 - .22 * nose)
        p.z = centre.z + (p.z - centre.z) * (1 - .12 * nose)
        p.y -= .06 * nose
        return p
    if bone in ('Body', 'Back') or bone.startswith('Torso'):
        p.z = 1.95 - (1.95 - p.z) * .94
    elif 'LowerLeg' in bone:
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * .82
        p.y = centre.y + (p.y - centre.y) * .82
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        out = max(0, p.y - root.y)
        p.z -= out * .42
        p.x = root.x + (p.x - root.x) * 1.08
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return (.06, .04, .012)
    if 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        root = ctx.head('Tail1')
        return d.mix(d.mix(GRIZZLE, SADDLE, .3), BLACK, d.smooth((p.y - root.y - 1.80) / .25))
    if bone.startswith('Ear'):
        return d.mix(RUST, SADDLE, .25)
    if bone == 'Head':
        centre = ctx.head('Head')
        if p.z < centre.z - .10:
            return CREAM
        if p.y < centre.y - .25:
            return d.mix(RUST, GRIZZLE, .45)
        return d.mix(GRIZZLE, RUST, .4)
    if bone.startswith('Neck'):
        return CREAM if p.z < 1.75 else d.mix(GRIZZLE, RUST, .2)
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        return d.mix(RUST, CREAM, .2) if p.z < 1.0 else d.mix(GRIZZLE, RUST, .55)
    colour = d.mix(d.mix(GRIZZLE, RUST, .25), SADDLE, d.smooth((p.z - 1.82) / .14) * .8)
    return d.mix(colour, CREAM, d.smooth((1.18 - p.z) / .12))


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
