"""Europe red fox, reshaped from the licensed Quaternius wolf.

About 0.38 m at the shoulder and 0.65 m nose to rump with a 0.42 m tail:
slim body on fine legs, big pointed ears, a narrow pointed muzzle, a big
bushy tail carried low. Red-orange coat with darker and lighter zones and
grizzled tips, white chin, throat and chest, white tail tip, black lower
legs and black ear backs. Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'red-fox'
DONOR = 'eastern-wolf'
BUDGET = 4100
SCALE = (.18, .19, .19)
MOTTLE = .45
GRIZZLE = .25
EYE = .5

RED = (.30, .095, .022)
DARK_RED = (.19, .060, .016)
WHITE = (.58, .55, .48)
BLACK = (.010, .008, .007)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Ear'):
        base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
        return d.scale_about(p, base, (1.10, 1.05, 1.32))
    if bone == 'Head':
        centre = ctx.head('Head')
        nose = d.smooth((centre.y - p.y - .12) / .45)
        p.x = centre.x + (p.x - centre.x) * (1 - .28 * nose)
        p.z = centre.z + (p.z - centre.z) * (1 - .18 * nose)
        p.y -= .08 * nose
        return p
    if bone in ('Body', 'Back') or bone.startswith('Torso'):
        p.x *= .92
        p.z = 1.95 - (1.95 - p.z) * .92
    elif 'Leg' in bone:
        centre = ctx.head(bone)
        f = .80 if 'Lower' in bone else .90
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith('Tail'):
        # A big brush: fuller than the wolf's, carried low.
        root = ctx.head('Tail1')
        out = max(0, p.y - root.y)
        p.z -= out * .30
        p.x = root.x + (p.x - root.x) * 1.30
        centre_z = root.z - out * .30
        p.z = centre_z + (p.z - centre_z) * 1.25
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return (.07, .04, .010)
    if 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        root = ctx.head('Tail1')
        u = (p.y - root.y) / 2.2
        return d.mix(d.mix(RED, DARK_RED, .4), WHITE, d.smooth((u - .86) / .05))
    if bone.startswith('Ear'):
        return BLACK if p.y > ctx.head('Ear1.L').y - .02 else d.mix(RED, WHITE, .3)
    if bone == 'Head':
        centre = ctx.head('Head')
        if p.z < centre.z - .06 or (p.y < centre.y - .30 and p.z < centre.z + .02 and abs(p.x) > .06):
            return WHITE                                   # white chin and lips
        return RED
    if bone.startswith('Neck'):
        return WHITE if p.z < 1.78 else RED
    if 'LowerLeg' in bone or bone.startswith(('FF', 'IK')):
        return BLACK
    if 'Leg' in bone:
        return d.mix(BLACK, RED, d.smooth((p.z - .95) / .35))
    colour = d.mix(RED, DARK_RED, d.smooth((p.z - 1.85) / .14) * .7)
    # White chest and pale belly.
    colour = d.mix(colour, WHITE, d.smooth((1.50 - p.z) / .12) * d.smooth((-.70 - p.y) / .2))
    return d.mix(colour, d.mix(RED, WHITE, .5), d.smooth((1.18 - p.z) / .12))


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
