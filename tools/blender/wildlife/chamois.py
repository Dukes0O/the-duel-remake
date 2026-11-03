"""Alps chamois buck, reshaped from the licensed Quaternius deer.

Goat-like, about 0.75 m at the shoulder: sturdy body on strong legs, a
shorter neck, dark brown coat with darker and lighter zones and a dark
stripe down the back, a pale cream face crossed by a dark stripe from each
eye to the mouth, a small pale rump patch, short dark tail, and short black
horns rising straight up and hooking back at the tips.
Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'chamois'
DONOR = 'white-tailed-deer'
BUDGET = 3900
SCALE = (.31, .29, .28)
TALL = SCALE[1] / SCALE[2]
HEAD_DROP = .42
MOTTLE = .50
GRIZZLE = .30

BROWN = (.058, .034, .019)
DARK = (.018, .013, .010)
FACE = (.42, .37, .29)
PALE = (.30, .25, .18)
BLACK = (.008, .007, .006)


def head_move(p, ctx):
    import donor_shape as d
    p = d.scale_about(p, ctx.head('Head'), (1.04, 1, TALL * .95))
    p.z -= HEAD_DROP
    p.y += .10
    return p


def shape(p, bone, ctx):
    import donor_shape as d
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        p.x *= 1.16
        p.z = 2.52 - (2.52 - p.z) * 1.15 if p.z < 2.52 else p.z
    elif bone.startswith('Neck'):
        lift = d.smooth((p.z - 2.45) / 1.30)
        p.x *= 1.30
        p.y += .10 * lift
        p.z -= HEAD_DROP * lift
    elif bone == 'Head':
        if p.y < -2.15:
            p.y = -2.15 + (p.y + 2.15) * .82
        p = head_move(p, ctx)
    elif bone.startswith('Ear'):
        p = d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), (.75, .75, .85))
        p = head_move(p, ctx)
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = 1.15 if 'Upper' in bone else 1.05
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .55)
        p.z -= max(0, p.y - root.y) * 1.0
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return DARK
    if bone.startswith('Ear'):
        return d.mix(BROWN, FACE, .35)
    if bone == 'Head':
        # Pale face with a dark stripe from each eye down to the mouth corner.
        line = 3.92 - (-1.98 - p.y) * .55
        if p.y < -1.92 and abs(p.x) > .085 and abs(p.z - line) < .075:
            return DARK
        if p.y > -1.90 and p.z > 3.90:
            return d.mix(BROWN, FACE, .4)            # crown between the horns
        return FACE
    if bone.startswith('Neck'):
        # Pale throat below the face, dark brown neck behind.
        return d.mix(BROWN, FACE, .7) if p.z > 3.35 and p.y < -1.62 else BROWN
    if 'LowerLeg' in bone or bone.startswith(('FF', 'IK')):
        return DARK
    colour = d.mix(BROWN, DARK, d.smooth((p.z - 2.42) / .12) * d.smooth((.16 - abs(p.x)) / .06))   # back stripe
    colour = d.mix(colour, PALE, d.smooth((1.86 - p.z) / .12) * .6)
    rump = d.smooth((p.y - 1.30) / .12) * d.smooth((p.z - 2.0) / .12) * d.smooth((2.5 - p.z) / .1)
    return d.mix(colour, PALE, rump)


def parts(a, ctx):
    import donor_shape as d
    head = ctx.head('Head')
    hy, hz = head.y + .10, head.z - HEAD_DROP
    for s in (-1, 1):
        # Straight up, then hooked sharply back at the tip.
        horn = [(s * .085, hy + .06, hz + .14), (s * .095, hy + .04, hz + .40 * TALL), (s * .10, hy + .04, hz + .62 * TALL),
                (s * .105, hy + .12, hz + .76 * TALL), (s * .11, hy + .27, hz + .74 * TALL), (s * .11, hy + .33, hz + .62 * TALL)]
        d.ring_tube(a, horn, [.050, .045, .038, .030, .018, .004],
                    lambda t: (.012, .010, .009) if t > .1 else (.03, .025, .02), 'Head', 8)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
