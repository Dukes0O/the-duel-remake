"""Fetch the WILD-ART-WASTE reference photographs named in waste-references.json.

The photographs are public domain or CC0 on Wikimedia Commons and need no
account. They are kept outside the repository (the art library) and are
only ever shown beside a model on a review sheet; no game file uses them.
Run with plain Python: python tools/blender/wildlife/waste_references.py
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

AGENT = {'User-Agent': 'wildlife-reference-fetch/1.0'}


def read(url):
    for attempt in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=40).read()
        except OSError:
            time.sleep(3 + 4 * attempt)
    raise SystemExit('could not fetch ' + url)


def main():
    plan = json.loads((Path(__file__).parent / 'waste-references.json').read_text(encoding='utf-8'))
    home = Path(plan['directory'])
    home.mkdir(parents=True, exist_ok=True)
    photos = [photo for group in plan['photos'].values() for photo in group]
    query = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': '|'.join(p['title'] for p in photos),
                                    'prop': 'imageinfo', 'iiprop': 'url|extmetadata',
                                    'iiextmetadatafilter': 'LicenseShortName', 'iiurlwidth': plan['width']})
    pages = json.loads(read('https://commons.wikimedia.org/w/api.php?' + query))['query']['pages'].values()
    found = {page['title']: page['imageinfo'][0] for page in pages if 'imageinfo' in page}
    for photo in photos:
        info = found[photo['title']]
        licence = info['extmetadata']['LicenseShortName']['value']
        assert licence in ('Public domain', 'CC0'), (photo['title'], licence)
        target = home / photo['file']
        if not target.exists():
            target.write_bytes(read(info['thumburl']))
            time.sleep(.6)
        print(target, licence)


if __name__ == '__main__':
    main()
