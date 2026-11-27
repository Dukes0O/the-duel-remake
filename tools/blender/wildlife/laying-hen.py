"""Home Ground's laying hen (HOME-HEN-BODY): a brown laying hybrid's own body, with the chicken's bones.

Measured from the photographed Lohmann Brown (`lohmann-brown-side.jpg` in the art library's home-ground
references, about 0.40 m to the top of the comb at 0.468 mm a pixel): a round, low, heavy body whose
feathered belly hangs to about 5 cm above the ground, so that only the lower shanks show; a deep breast
carried forward under a short, thick neck of hackles; a short tail held up as a tuft; a small head with
a red single comb, red face, earlobes and wattles and a horn-coloured bill. Rich red brown, paler
golden hackles, buff and fluffy round the thighs. Her folded wings lie flush in the flanks and are only
painted: a separate wing piece showed a bright line along its edge in the game. Home Ground's look
(`src/world/open/looks/home-hens-look.js`) bakes the feathers over this coat in code.

The bones are the wildlife chicken's (root, body, neck1, neck2, head, tail, thigh, shank and foot on
each side) and so are the clips (Idle looks about and pecks twice, Walk), so that the look's poses
(peck, scratch, walk, sit, stand) and its leg band take this body unchanged.

  blender -b --factory-startup --python tools/blender/wildlife/laying-hen.py -- --root .
      writes public/assets/models/wasteland/home-ground/laying-hen.glb
  ... -- --root . --out .qa-dist/hen/laying-hen.glb      a trial copy anywhere else
"""
import argparse
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

ID = 'laying-hen'
OUTPUT = 'public/assets/models/wasteland/home-ground/laying-hen.glb'
CHESTNUT = (.115, .034, .011)
DARK = (.048, .015, .006)
GOLD = (.30, .105, .030)
BUFF = (.36, .20, .085)
TAIL = (.030, .012, .006)
RED = (.55, .022, .020)
SHANK = (.50, .36, .13)
BILL = (.46, .33, .15)
EYE = (.004, .003, .002)
HIP = (-.005, .130)
LEGS = {}


def build(output, c):
    import adapt
    import original as o
    from mathutils import Vector
    adapt.SMALL_MAP.add(ID)            # a 512 map, as the chicken's: the look bakes its feathers over it in code
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .04))
    # The body turns about the hips, so the legs can stand while she pecks.
    a.bone('body', (HIP[0], 0, HIP[1]), (.090, 0, .165), 'root')
    a.bone('neck1', (.105, 0, .225), (.120, 0, .298), 'body')
    a.bone('neck2', (.120, 0, .298), (.140, 0, .350), 'neck1')
    a.bone('head', (.140, 0, .350), (.196, 0, .350), 'neck2')
    a.bone('tail', (-.135, 0, .240), (-.172, 0, .325), 'body')
    for s, side in ((1, 'L'), (-1, 'R')):
        y = s * .042
        hip, hock, foot, toe = (HIP[0], y, HIP[1]), (-.018, y, .078), (.000, y, .013), (.050, y, .005)
        a.bone('thigh.' + side, hip, hock, 'root')
        a.bone('shank.' + side, hock, foot, 'thigh.' + side)
        a.bone('foot.' + side, foot, toe, 'shank.' + side)
        LEGS[side] = [Vector(p) for p in (hip, hock, foot, toe)]

    def plumage(p):
        colour = o.mix(CHESTNUT, DARK, .35 * o.mottle(p, 3) + .2 * o.speckle(p) ** 3)
        # Golden hackles over the neck and shoulders, buff and fluffy low down.
        colour = o.mix(colour, GOLD, .75 * o.smooth((p.z - .225) / .04) * o.smooth((p.x - .04) / .05))
        return o.mix(colour, BUFF, .55 * o.smooth((.105 - p.z) / .05))

    # The body: an egg lying low, deepest just behind the legs, its belly feathers hanging to 5 cm off the ground.
    body = o.near(a, ['body', 'tail', 'neck1'])
    a.fur([((.178, 0, .200), .012, .008), ((.160, 0, .200), .050, .050), ((.130, 0, .193), .074, .065),
           ((.090, 0, .181), .090, .081), ((.045, 0, .167), .097, .095), ((.000, 0, .159), .100, .103),
           ((-.045, 0, .161), .097, .100), ((-.085, 0, .175), .094, .090), ((-.118, 0, .195), .079, .072),
           ((-.142, 0, .215), .056, .052), ((-.157, 0, .236), .027, .030), ((-.165, 0, .250), .006, .008)],
          plumage, body, 16, .03)
    # The fluff round the thighs and the vent, hanging below the body behind the legs.
    fluff = o.near(a, ['body', 'thigh.L', 'thigh.R'])
    a.fur([((.050, 0, .110), .010, .010), ((.025, 0, .100), .067, .040), ((-.020, 0, .098), .081, .046),
           ((-.070, 0, .112), .070, .042), ((-.105, 0, .132), .045, .030), ((-.122, 0, .146), .010, .010)],
          plumage, fluff, 14, .08, seed=2.3)
    # A short, thick neck of hackles. It starts low on the back and curves up, so that the hackles drape over the
    # shoulders and flow into the body with no crease (a separate cape over the shoulders read as a plate).
    neck = o.near(a, ['neck1', 'neck2', 'body', 'head'])
    a.fur([((.030, 0, .196), .050, .050), ((.062, 0, .204), .074, .066), ((.090, 0, .222), .068, .066),
           ((.104, 0, .244), .058, .062), ((.112, 0, .268), .047, .054),
           ((.120, 0, .300), .037, .042), ((.129, 0, .328), .028, .031), ((.141, 0, .350), .021, .022),
           ((.146, 0, .364), .016, .017)], plumage, neck, 14, .05)

    head_at = Vector((.156, 0, .360))

    def face(p):
        # Bare red skin round the eye and down to the wattles; a feathered crown and nape.
        bare = o.smooth((p.x - head_at.x + .004) / .010) * o.smooth((head_at.z + .010 - p.z) / .008)
        return o.mix(plumage(p), RED, bare)
    a.oval(tuple(head_at), (.030, .021, .023), face, 'head', 6, 12)
    a.loft([((.178, 0, .356), .0085, .0095), ((.189, 0, .353), .0060, .0066), ((.199, 0, .349), .0028, .0032),
            ((.205, 0, .344), .0007, .0007)], BILL, 'head', 8)
    # A red single comb of five points, taller at the front, and two long wattles under the bill.
    # Points and the notches between them, front to back, so that it reads as a serrated comb and not a cap.
    heights = (.016, .010, .029, .014, .034, .015, .031, .013, .025, .010, .014)
    comb = [((.182 - .0045 * k, 0, .372 + heights[k]), (.182 - .0045 * k, 0, .366), .0045, (0, 1, 0))
            for k in range(len(heights))]
    a.blade(comb, RED, 'head')
    a.oval((.150, 0, .378), (.026, .0035, .006), RED, 'head', 4, 6)
    for s in (1, -1):
        a.oval((.168, s * .005, .330), (.008, .0032, .015), RED, 'head', 4, 8)
        a.oval((.145, s * .018, .348), (.0050, .0025, .0060), RED, 'head', 3, 6)
        a.oval((.162, s * .0185, .364), (.0042, .0022, .0042), EYE, 'head', 3, 6)

    # The tail: a short tuft held up from the rump, fanned from separate feathers so that it is not a paddle.
    def tail_colour(p):
        return o.mix(TAIL, CHESTNUT, .45 * o.mottle(p, 5) + .2 * o.smooth((.25 - p.z) / .04))
    tail = o.near(a, ['tail', 'body'])
    # Its core is a feathered wedge, thin across and deep fore and aft, so that from any side it is one plume.
    a.fur([((-.124, 0, .226), .040, .040), ((-.140, 0, .252), .030, .044), ((-.153, 0, .276), .022, .042),
           ((-.164, 0, .298), .015, .034), ((-.172, 0, .316), .009, .020), ((-.176, 0, .326), .003, .006)], tail_colour, tail, 12, .08, seed=4.1)
    # Five feathers on the wedge, held nearly together in a narrow tent: their tips give the plume a feathered edge.
    rump = Vector((-.140, 0, .250))
    for k in range(5):
        angle = math.radians(58 + (3, -2, 4, -3, 2)[k])
        along = Vector((-math.cos(angle), 0, math.sin(angle)))
        across = Vector((math.sin(angle), 0, math.cos(angle)))
        length = .098 - .008 * abs(k - 2)
        lean = (k - 2) * .005
        feather = []
        for t, wide in ((0, .45), (.35, .95), (.75, 1.0), (.93, .8), (1, .5)):
            mid = rump + along * length * t + Vector((0, lean * (.5 + t), 0))
            feather.append((tuple(mid + across * .026 * wide), tuple(mid - across * .026 * wide), .0035, (0, 1, 0)))
        a.blade(feather, tail_colour, tail)

    for s, side in ((1, 'L'), (-1, 'R')):
        y = s * .042
        thigh = o.near(a, ['thigh.' + side, 'body', 'shank.' + side])
        # The feathered thigh, a cone from inside the fluff down to the hock.
        a.tube3([(HIP[0] + .010, y * .9, HIP[1]), (-.008, y, .104), (-.018, y, .078)],
                [.034, .022, .0105], plumage, thigh, 8)
        shank = o.near(a, ['shank.' + side, 'foot.' + side, 'thigh.' + side])
        a.tube3([(-.018, y, .082), (-.008, y, .046), (.000, y, .015)], [.0092, .0080, .0082], SHANK, shank, 6)
        for angle, length in ((0, .050), (34, .042), (-34, .042), (180, .018)):
            d = Vector((math.cos(math.radians(angle)), s * math.sin(math.radians(angle)), 0))
            end = Vector((.000, y, .004)) + d * length
            a.tube3([(.000, y, .013), Vector((.000, y, .009)) + d * length * .5, end], [.0066, .0050, .0018],
                    SHANK, 'foot.' + side, 4)

    o.finish(a, c, output, [('Idle', 150, idle), ('Walk', 24, walk)], budget=2000, refine=1950,
             roughness=1, specular=.25)


def stand(obj, side, foot_at, toe_lift=0):
    """Plant one leg's foot at foot_at (XZ plane) by its hock, which bends backwards."""
    import original as o
    from mathutils import Vector
    hip, hock, foot, toe = LEGS[side]
    l1, l2 = (hock - hip).length, (foot - hock).length
    h = Vector((hip.x, 0, hip.z))
    new_hock = o.two_bone(h, foot_at, l1, l2, False)
    d_thigh = o.angle_down(new_hock - h) - o.angle_down(hock - hip)
    d_shank = o.angle_down(foot_at - new_hock) - o.angle_down(foot - hock)
    o.plane_rotate(obj, 'thigh.' + side, d_thigh)
    o.plane_rotate(obj, 'shank.' + side, d_shank - d_thigh)
    o.plane_rotate(obj, 'foot.' + side, -d_shank - toe_lift)


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    # Two pecks between .56 and .86 of the loop; alert and looking about before.
    peck = 0
    for start in (.56, .72):
        u = (t - start) / .14
        if 0 < u < 1:
            peck = math.sin(math.pi * u) ** .7
    look = 1 - peck
    # Her body tips forward about the hips and her short neck reaches down, so the bill meets the ground.
    o.turn(obj, 'body', .68 * peck)
    o.turn(obj, 'neck1', .62 * peck)
    o.turn(obj, 'neck2', .55 * peck)
    o.turn(obj, 'head', .40 * peck)
    o.turn(obj, 'tail', -.25 * peck)
    o.turn(obj, 'head', look * .60 * math.sin(w * 2) ** 3, (0, 0, 1))
    o.turn(obj, 'neck2', look * .08 * math.sin(w * 3 + 1))
    o.turn(obj, 'head', look * .20 * math.sin(w * 4) ** 5, (1, 0, 0))
    o.turn(obj, 'tail', .05 * math.sin(w * 5))
    o.stretch(obj, 'body', (1 + .010 * math.sin(6 * w), 1, 1 + .010 * math.sin(6 * w)))


def walk(obj, t):
    import original as o
    from mathutils import Vector
    w = 2 * math.pi * t
    stride, lift = .062, .026
    for side, offset in (('L', 0), ('R', .5)):
        hip, hock, foot, toe = LEGS[side]
        phase = (t + offset) % 1
        if phase < .58:
            dx, dz, curl = stride * (.5 - phase / .58), 0, 0
        else:
            u = (phase - .58) / .42
            dx, dz, curl = stride * (-.5 + u), lift * math.sin(math.pi * u), .7 * math.sin(math.pi * u)
        stand(obj, side, Vector((foot.x + dx, 0, foot.z + dz)), curl)
    # The head is thrust forward and then held while the body catches up; a heavy hen rolls a little.
    bob = math.sin(2 * w)
    o.turn(obj, 'neck1', .14 * bob)
    o.turn(obj, 'neck2', -.09 * bob)
    o.turn(obj, 'head', -.05 * bob)
    o.turn(obj, 'body', .03 + .02 * math.sin(2 * w + .6))
    o.turn(obj, 'body', .06 * math.sin(w), (1, 0, 0))
    o.turn(obj, 'tail', .05 * math.sin(2 * w + 1.2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--out', type=Path, default=None)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    root = args.root.resolve()
    output = (args.out if args.out and args.out.is_absolute() else root / (args.out or OUTPUT)).resolve()
    import bpy
    import common
    from mathutils import Quaternion, Vector
    common.bpy = bpy
    common.Vector, common.Quaternion = Vector, Quaternion
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    build(output, common)
