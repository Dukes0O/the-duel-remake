"""Western mountains elk (wapiti) bull, reshaped from the licensed Quaternius deer.

About 1.5 m at the shoulder, heavier barrel, thick dark chocolate neck mane,
dark head and legs, pale tan body, a big straw-coloured rump patch with a
dark edge, short tail, and long swept-back antlers with six points a side.
Donor frame and helpers: donor_shape.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'elk'
DONOR = 'white-tailed-deer'
BUDGET = 3900
SCALE = (.60, .60, .58)

BODY = (.17, .124, .074)
MANE = (.040, .026, .016)
HEAD = (.060, .042, .027)
RUMP = (.46, .37, .22)
LEG = (.035, .024, .016)
BLACK = (.009, .008, .007)


def shape(p, bone, ctx):
    import donor_shape as d
    if bone.startswith('Ear'):
        return d.scale_about(p, ctx.head('Ear1.L' if bone.endswith('.L') else 'Ear1.R'), .86)
    if bone in ('Body', 'Back') or bone.startswith(('Torso', 'BackShoulder', 'BackLeg')):
        p.x *= 1.18
        p.z = 2.50 - (2.50 - p.z) * 1.10
    elif bone.startswith('Neck'):
        # Shaggy mane: a deeper, thicker neck, fullest at the throat.
        p.x *= 1.42
        p.y -= .10 * d.smooth((2.9 - p.z) / .5) * (1 if p.y > -1.6 else 0)
        throat = d.smooth((-1.45 - p.y) / .3) * d.smooth((3.3 - p.z) / .4)
        p.z -= .16 * throat
    elif bone == 'Head':
        nose = d.smooth((-p.y - 2.10) / .55)
        p.x *= 1.06 + .12 * nose
        p.y -= .12 * nose
    elif 'UpperLeg' in bone:
        centre = ctx.head(bone)
        p.x = centre.x + (p.x - centre.x) * 1.12
    elif bone.startswith('Tail'):
        root = ctx.head('Tail1')
        p = d.scale_about(p, root, .55)
        p.z -= max(0, p.y - root.y) * .7
    return p


def paint(p, bone, material, ctx):
    import donor_shape as d
    if 'hoof' in material or 'eye' in material or 'nose' in material:
        return BLACK
    if bone.startswith('Tail'):
        return d.mix(RUMP, HEAD, .3)
    if bone == 'Head' or bone.startswith('Ear'):
        return BLACK if p.y < -2.62 else HEAD
    if bone.startswith('Neck'):
        return MANE
    if 'LowerLeg' in bone or bone.startswith(('FF', 'IK')):
        return LEG
    colour = BODY
    # The mane spills over the shoulders; the belly darkens.
    colour = d.mix(colour, MANE, d.smooth((-.95 - p.y) / .30))
    colour = d.mix(colour, d.mix(BODY, LEG, .6), d.smooth((1.90 - p.z) / .18))
    if 'UpperLeg' in bone:
        colour = d.mix(colour, LEG, d.smooth((1.75 - p.z) / .35))
    edge = d.smooth((p.y - .95) / .18) * d.smooth((p.z - 1.85) / .12)
    rump = d.smooth((p.y - 1.12) / .14) * d.smooth((p.z - 1.98) / .10)
    colour = d.mix(colour, d.mix(BODY, MANE, .45), edge * (1 - rump))
    return d.mix(colour, RUMP, rump)


def parts(a, ctx):
    import donor_shape as d

    def tube(points, *rest):
        # Rack height pulled in by 15 % about the skull: tips near 3 m, not 3.5 m.
        d.ring_tube(a, [(x, y, 3.98 + (z - 3.98) * .85) for x, y, z in points], *rest)
    base, tip = (.17, .12, .07), (.55, .48, .36)
    colour = lambda t: d.mix(base, tip, d.smooth((t - .55) / .45))
    for s in (-1, 1):
        beam = [(s * .11, -1.80, 3.98), (s * .34, -1.66, 4.36), (s * .58, -1.36, 4.82),
                (s * .74, -.92, 5.22), (s * .74, -.46, 5.52), (s * .60, -.18, 5.66)]
        tube(beam, [.090, .080, .070, .060, .046, .006],
             lambda t: d.mix(base, tip, d.smooth((t - .8) / .2)), 'Head', 8)
        # Tines rise forward and up at varied lengths and angles, never a
        # comb of equal spikes: long brow and royal, shorter bez and trez.
        for start, mid, end, r in [
                ((s * .24, -1.76, 4.18), (s * .36, -2.20, 4.20), (s * .46, -2.52, 4.52), .050),   # brow
                ((s * .36, -1.64, 4.40), (s * .50, -1.96, 4.52), (s * .60, -2.12, 4.78), .040),   # bez
                ((s * .60, -1.32, 4.86), (s * .74, -1.56, 5.06), (s * .86, -1.62, 5.32), .040),   # trez
                ((s * .74, -.94, 5.24), (s * .86, -1.12, 5.62), (s * .90, -1.10, 6.02), .046),    # royal
                ((s * .74, -.48, 5.52), (s * .80, -.58, 5.78), (s * .78, -.66, 5.98), .036)]:     # sur-royal
            tube([start, mid, end], [r, r * .72, .005], colour, 'Head', 6)


def build(output, c, cache):
    import donor_shape
    donor_shape.build(ID, output, c, cache, sys.modules[__name__])


if __name__ == '__main__':
    cli(ID, build)
