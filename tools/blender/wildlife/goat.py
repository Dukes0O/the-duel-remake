"""Wasteland town goat, reshaped from the licensed Quaternius deer.

A working nanny on a poor farm, about 0.66 m at the shoulder: lean, narrow
body with a low hay belly, a short neck carrying the head just above the
back, a short straight face, ears held out sideways, a short tail turned
up, a tan beard, and brown horns that rise, sweep back and flare outwards.
Coat after the reference photograph (waste-references.json): blackish
forequarters, brown back and rump, a big off-white flank patch, a white
blaze down the face, white hind socks, all of it dulled with dust towards
the ground. Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'goat'
DONOR = 'white-tailed-deer'
BUDGET = 3900
SCALE = (.26, .26, .205)
TALL = SCALE[1] / SCALE[2]
HEAD_DROP = .64
MOTTLE = .45
GRIZZLE = .15

BLACKISH = (.022, .017, .013)
BROWN = (.120, .060, .025)
TAN = (.26, .16, .075)
WHITE = (.50, .45, .36)
DUST = (.27, .21, .15)
HORN = (.085, .060, .040)
BLACK = (.008, .007, .006)


def head_move(p, ctx):
    import donor_shape as d
    p = d.scale_about(p, ctx.head('Head'), (1.12, 1.04, TALL * .98))
    p.z -= HEAD_DROP
    p.y += .10
    return p


def shape(p, bone, ctx):
    import donor_shape as d
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        # Narrow and bony above, with a low hay belly behind the ribs.
        p.x *= .98 + .20 * d.smooth((2.35 - p.z) / .55)
        belly = d.smooth((p.y + .9) / .7) * d.smooth((1.2 - p.y) / .7)
        if p.z < 2.45:
            p.z = 2.45 - (2.45 - p.z) * (1.18 + .24 * belly)
        # The croup falls away to the tail.
        p.z -= .10 * d.smooth((p.y - .75) / .6) * d.smooth((p.z - 2.5) / .4)
    elif bone.startswith('Neck'):
        lift = d.smooth((p.z - 2.45) / 1.30)
        p.x *= 1.36
        p.y += .10 * lift - .14 * (1 - lift)
        p.z -= HEAD_DROP * lift
    elif bone == 'Head':
        if p.y < -2.15:
            p.y = -2.15 + (p.y + 2.15) * .80
        p = head_move(p, ctx)
    elif bone.startswith('Ear'):
        # Held out sideways and a little down, not pricked like a deer's.
        base = ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R')
        out = abs(p.x - base.x)
        p = d.scale_about(p, base, (1.25, 1.1, .30))
        p.z -= .22 * out
        p.y += .06
        p = head_move(p, ctx)
    elif 'UpperLeg' in bone or 'LowerLeg' in bone:
        centre = ctx.head(bone)
        f = 1.06 if 'Upper' in bone else .96
        p.x = centre.x + (p.x - centre.x) * f
        p.y = centre.y + (p.y - centre.y) * f
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .60)
        p.z += max(0, p.y - root.y) * 1.7
    return p


def dusty(colour, p, amount=1.0):
    """Dust settles on the legs and belly and greys the whole coat a little."""
    import donor_shape as d
    low = d.smooth((.95 - p.z) / .85)
    return d.mix(colour, DUST, amount * (.015 + .34 * low))


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'eye' in material:
        return (.10, .07, .02)
    if 'hoov' in material:
        return d.mix(BLACK, DUST, .35)
    if bone.startswith('Tail'):
        return dusty(d.mix(BLACKISH, WHITE, d.smooth((p.y - 1.42) / .08)), p)
    if bone.startswith('Ear'):
        return dusty(d.mix(BROWN, BLACKISH, .5), p, .6)
    if bone == 'Head':
        if p.y < -2.62:
            return d.mix(BLACK, BROWN, .3)                       # nose and lips
        blaze = d.smooth((.085 - abs(p.x)) / .04) * d.smooth((p.z - 3.62) / .08)
        cheek = d.mix(BLACKISH, TAN, .55 * d.smooth((.06 - abs(p.z - 3.80)) / .05) * (abs(p.x) > .10))
        return dusty(d.mix(cheek, WHITE, blaze), p, .5)
    if bone.startswith('Neck'):
        return dusty(d.mix(BLACKISH, BROWN, .15 * d.mottle(p)), p, .7)
    if 'Leg' in bone or bone.startswith(('FF', 'IK')):
        colour = d.mix(BLACKISH, BROWN, .30)
        if p.y > 0:
            colour = d.mix(colour, WHITE, d.smooth((.95 - p.z) / .12))   # white hind socks
        return dusty(colour, p)
    # Trunk: blackish shoulders, brown back and rump, off-white flank patch.
    colour = d.mix(BLACKISH, BROWN, d.smooth((p.y + .45) / .50))
    colour = d.mix(colour, TAN, .35 * d.smooth((p.z - 2.75) / .25) * d.smooth((p.y + .2) / .5))
    edge = .10 * (d.mottle(p, 2.3) - .5)
    patch = (d.smooth((p.y + .62 + edge) / .10) * d.smooth((.95 + edge - p.y) / .12)
             * d.smooth((2.62 + edge - p.z) / .10))
    return dusty(d.mix(colour, WHITE, patch), p)


def parts(a, ctx):
    import donor_shape as d
    head = ctx.head('Head')
    hy, hz = head.y + .10, head.z - HEAD_DROP
    for s in (-1, 1):
        # Up, back, then flaring out to the side, as in the reference photograph.
        horn = [(s * .085, hy + .04, hz + .16), (s * .115, hy + .14, hz + .42 * TALL), (s * .20, hy + .30, hz + .60 * TALL),
                (s * .36, hy + .42, hz + .68 * TALL), (s * .54, hy + .46, hz + .70 * TALL), (s * .68, hy + .44, hz + .75 * TALL)]
        d.ring_tube(a, horn, [.086, .070, .054, .040, .024, .005],
                    lambda t: tuple(q * (.80 + .20 * ((t * 9) % 1 > .5)) for q in d.mix(HORN, (.16, .12, .08), t)),
                    'Head', 8, .80)
    # Tan beard under the chin.
    d.ring_tube(a, [(0, hy - .60, hz - .30), (0, hy - .55, hz - .50), (0, hy - .47, hz - .64)], [.075, .055, .010],
                lambda t: d.mix(BROWN, TAN, .3 + .5 * t), 'Head', 7)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
