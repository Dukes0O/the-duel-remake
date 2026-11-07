"""Carve one object from its photos by filling in a table. No other code is needed.

    from photo_carve import carve_object

    body = carve_object('tavern:body', textures, {
        'photos': {'side': 'tavern-side.jpg', 'front': 'tavern-front.jpg',
                   'rear': 'tavern-rear.jpg', 'top': 'tavern-top.jpg'},
        # Metres: how big the object really is along each axis.
        'length': 11.0, 'width': 7.0, 'height': 8.0,
        # Pixels, read from a grid over each photo (tools/photo_grid.py).
        'side': {'start': 40, 'end': 980, 'ground': 610},   # start is the object's front
        'front': {'centre': 512, 'ground': 700, 'top': 120},   # 'top' is the roof's pixel row
        'rear': {'centre': 512, 'ground': 700, 'top': 120},
        'top': {'front': 60, 'rear': 960, 'centre': 512},
        # Rectangles (x0, y0, x1, y1) of background walled in by the subject.
        'cut': {'front': [(450, 600, 560, 700)]},
    })

The side and top photos take their scale from `length` and their measured span.
Each end photo takes its own from `height` and its 'top' (or 'scale', metres per
pixel, or 'top_height' if its 'top' is not at `height`), since end photos are
seldom at the side photo's scale. A top photo's 'x_scale' does the same across.
By default a cross-section is what either end photo allows. 'ends_split' (a z in
metres) makes the front photo shape only what lies ahead of it and the rear photo
only what lies behind, for two different bodies joined end to end. 'front_favour'
makes a curved nose wear its front photo further round, so a windscreen is not
pieced together from three photos: 3 suits a rounded nose. 'rear_favour' does the
same behind. Both need 'ends_split'. 'round' makes every cross-section along Z an
ellipse within its own width and height, for a tube: 2 is a true ellipse, 3 a
rounder box. Without it a tapered tube comes out square.

Options: 'forward' is -1 for a town object (front at -Z, the default) or 1 for a
car. 'side_front_on_left' is True unless the side photo shows the front at the
right. 'front_x_flip' swaps the front photo's sides if a shelf or sign comes out
mirrored. In 'top', 'along': 'x' says the photo shows the object lying across
the picture, front at 'front', with 'centre' its middle row; the default is
upright, with 'centre' its middle column. 'underside' is the height in metres of
a vehicle's frame, below which nothing is carved. 'keep' is a function (x, y, z) -> bool array, to remove what the carve
must not fill: an open bay, or the space under a body. 'wheels' is a list of
(axle z, radius, inner x), so their arches are cut and go dark. 'voxel' is the
carve's grain in metres, 'target' the triangle budget.

The photos' backgrounds are taken from the corners and edges. Look at the masks
saved in 'mask_dir' beside their photos before believing a result.
"""
from pathlib import Path

import numpy as np

from hull_model import View, carve_hull, largest_part, occupancy, wheel_well
from photo_model import Photo


def edge_seeds(photo):
    w, h = photo.w, photo.h
    seeds = [(8, 8), (w - 9, 8), (8, h - 9), (w - 9, h - 9)]
    seeds.extend((x, 8) for x in range(80, w - 8, 120))
    seeds.extend((x, h - 9) for x in range(80, w - 8, 120))
    seeds.extend((8, y) for y in range(80, h - 8, 120))
    seeds.extend((w - 9, y) for y in range(80, h - 8, 120))
    return seeds


def lift_if_dark(photo):
    """A grey studio is darker than a pale sky. Only the measuring copy is changed."""
    rgb = photo.rgb()
    corners = np.concatenate([rgb[4:14, 4:14].reshape(-1, 3), rgb[4:14, -14:-4].reshape(-1, 3)])
    shade = corners.mean()
    if shade < 200:
        photo._rgb = np.clip(rgb + int(205 - shade), 0, 255).astype(np.int16)


def save_mask(mask, path):
    import bpy
    image = bpy.data.images.new(Path(path).stem, mask.shape[1], mask.shape[0], alpha=False)
    grey = mask[::-1].astype(np.float32)
    image.pixels.foreach_set(np.dstack((grey, grey, grey, np.ones_like(grey))).ravel())
    image.filepath_raw = str(path)
    image.file_format = 'PNG'
    image.save()


def carve_object(name, textures, table):
    """Returns the carved Blender object, and its photos in table['_photos'] for wheels and lamps."""
    textures = Path(textures)
    forward = table.get('forward', -1)
    length, width, height = table['length'], table['width'], table['height']
    z_front = forward * length / 2           # the object's front end
    photos = {key: Photo(textures / file) for key, file in table['photos'].items()}
    cuts = table.get('cut', {})
    grey, tolerance = table.get('grey', 26), table.get('tolerance', 40)

    s = table['side']
    side_scale = length / abs(s['end'] - s['start'])
    side_sign = 1 if table.get('side_front_on_left', True) else -1

    def side_pick(x, y, z):
        return s['start'] + side_sign * (forward * (z_front - z)) / side_scale, s['ground'] - y / side_scale

    # An end photo is rarely at the side photo's scale, so it must say what its own is:
    # 'top' is the pixel row of the roof, which stands at `height` metres, or 'scale' is metres per pixel.
    end_scale = {}
    for key in ('front', 'rear'):
        end = table[key]
        if 'scale' in end:
            end_scale[key] = end['scale']
        elif 'top' in end:
            end_scale[key] = end.get('top_height', height) / abs(end['ground'] - end['top'])
        else:
            raise ValueError(f"{name}: the {key} photo needs 'top' (pixel row of the roof) or 'scale'.")
    f, r, t = table['front'], table['rear'], table['top']
    flip = -1 if table.get('front_x_flip') else 1
    # Seen from its front, an object's +X is on the viewer's left at forward -1 and right at forward +1.
    front_sign = -forward * -1 * flip

    def front_pick(x, y, z):
        return f['centre'] + front_sign * x / end_scale['front'], f['ground'] - y / end_scale['front']

    def rear_pick(x, y, z):
        return r['centre'] - front_sign * x / end_scale['rear'], r['ground'] - y / end_scale['rear']

    top_scale = length / abs(t['rear'] - t['front'])
    top_x_scale = t.get('x_scale', top_scale)

    along_x = t.get('along') == 'x'

    def top_pick(x, y, z):
        run = t['front'] + (forward * (z_front - z)) / top_scale
        across = t['centre'] + forward * x / top_x_scale
        return (run, t['centre'] - x / top_x_scale) if along_x else (across, run)

    def trimmer(key, ground):
        def trim(mask):
            mask = mask.copy()
            if ground is not None:
                mask[ground:, :] = False
            for x0, y0, x1, y1 in cuts.get(key, []):
                mask[y0:y1, x0:x1] = False
            return mask
        return trim

    for photo in photos.values():
        lift_if_dark(photo)
    left = View('side', photos['side'], edge_seeds(photos['side']), side_pick, (-1, 0, 0), trimmer('side', s['ground']), grey=grey, tolerance=tolerance)
    right = View('side', photos['side'], [(8, 8)], side_pick, (1, 0, 0), None, grey=grey, tolerance=tolerance)
    right.mask = left.mask
    front = View('front', photos['front'], edge_seeds(photos['front']), front_pick, (0, 0, forward), trimmer('front', f['ground']), grey=grey, tolerance=tolerance)
    rear = View('rear', photos['rear'], edge_seeds(photos['rear']), rear_pick, (0, 0, -forward), trimmer('rear', r['ground']), grey=grey, tolerance=tolerance)
    top = View('top', photos['top'], edge_seeds(photos['top']), top_pick, (0, 1, 0), trimmer('top', None), grey=grey, tolerance=tolerance)

    mask_dir = table.get('mask_dir')
    if mask_dir:
        Path(mask_dir).mkdir(parents=True, exist_ok=True)
        for key, view in (('side', left), ('front', front), ('rear', rear), ('top', top)):
            save_mask(view.mask, Path(mask_dir) / f'{name.replace(":", "-")}-{key}-mask.png')

    if table.get('front_favour') and table.get('ends_split') is not None:
        front.favour = lambda point: table['front_favour'] if forward * (point[2] - table['ends_split']) > 0 else 1
    if table.get('rear_favour') and table.get('ends_split') is not None:
        rear.favour = lambda point: table['rear_favour'] if forward * (point[2] - table['ends_split']) <= 0 else 1

    wheels = table.get('wheels', [])

    def keep(x, y, z):
        result = y >= table.get('underside', 0)
        if table.get('keep'):
            result &= table['keep'](x, y, z)
        for axle, radius, inner in wheels:
            result &= ~((np.abs(x) > inner - .03) & ((z - axle) ** 2 + (y - radius) ** 2 < (radius + .05) ** 2))
        return result

    split = table.get('ends_split')

    def ends(x, y, z):
        if split is None:
            return front.covers(x, y, z) | rear.covers(x, y, z)
        # Two different bodies joined end to end: each end photo shapes only its own part.
        return np.where(forward * (z - split) > 0, front.covers(x, y, z), rear.covers(x, y, z))

    voxel = table.get('voxel', max(length, width, height) / 250)
    margin = voxel * 2
    bounds = ((-width / 2 - margin, width / 2 + margin), (0, height + margin), (-length / 2 - margin, length / 2 + margin))
    solid, xs, ys, zs = occupancy(bounds, voxel, [left.covers, top.covers, ends], keep)
    if table.get('round'):
        # Side and top photos alone leave a square section wherever the body tapers.
        grid_x, grid_y = np.meshgrid(xs, ys, indexing='ij')
        for k in range(solid.shape[2]):
            cut = solid[:, :, k]
            if not cut.any():
                continue
            across = xs[cut.any(axis=1)]
            up = ys[cut.any(axis=0)]
            a, b = (across[-1] - across[0]) / 2 + voxel / 2, (up[-1] - up[0]) / 2 + voxel / 2
            cx, cy = (across[-1] + across[0]) / 2, (up[-1] + up[0]) / 2
            solid[:, :, k] = cut & (np.abs((grid_x - cx) / a) ** table['round'] + np.abs((grid_y - cy) / b) ** table['round'] <= 1)
    solid = largest_part(solid)
    if not solid.any():
        raise RuntimeError(f'{name}: nothing left after carving. Check the measurements and the masks in {mask_dir}.')

    # The studio's colour must not show on an edge.
    for photo, view in ((photos['side'], left), (photos['front'], front), (photos['rear'], rear), (photos['top'], top)):
        # Wider than the mask's match, to take in the ground shadow, but pale paint must survive:
        # raise 'bleed_tolerance' only if a shadow shows, and lower it if pale paint goes blotchy.
        photo.bleed(view.mask & ~photo.sky(edge_seeds(photo), tolerance=table.get('bleed_tolerance', 48), grey=26))

    materials = {'side': photos['side'].material(), 'front': photos['front'].material(),
                 'rear': photos['rear'].material(), 'top': photos['top'].material()}
    dark = wheel_well(wheels) if wheels else None
    body = carve_hull(name, [left, right, front, rear, top], materials, solid, xs, ys, zs, voxel, table.get('target', 6000), dark=dark)
    table['_photos'] = photos
    table['_scale'] = side_scale
    return body
