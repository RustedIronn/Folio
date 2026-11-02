"""Extract approved company branding only; no customer content."""
from pathlib import Path
import shutil
import subprocess
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
reference = root / 'docs/references/altis-sample-quotation.pdf'
page = PdfReader(reference).pages[0]
images = page.images
expected = {'Image34.jp2': ('altis-emblem.png', (180, 180)),
            'Image6.png': ('altis-watermark.png', (200, 200))}
for image in images:
    if image.name not in expected:
        continue
    name, size = expected.pop(image.name)
    if image.image.size != size:
        raise ValueError('Reference branding dimensions changed; review before extracting')
    decoded = image.image
    raw = page['/Resources']['/XObject']['/' + image.name.split('.')[0]].get_object()
    mask = raw.get('/SMask')
    if mask and list(mask.get_object().get('/Matte', [])) == [0, 0, 0]:
        # PDF soft masks with a black matte store premultiplied RGB. PNG expects
        # straight alpha; undo the matte to avoid a dark fringe in the watermark.
        decoded = decoded.convert('RGBA')
        decoded.putdata([
            (min(255, round(r * 255 / a)), min(255, round(g * 255 / a)),
             min(255, round(b * 255 / a)), a) if a else (255, 255, 255, 0)
            for r, g, b, a in decoded.getdata()
        ])
    decoded.save(root / 'public/assets' / name, format='PNG')
if expected:
    raise ValueError('Approved reference branding was not found')
# Render only the fixed branding rectangle at 720 dpi. This captures the exact
# outlined company lettering and tagline without redistributing embedded fonts.
# Bounds are in points: x=70..227, y=71..173. Customer text begins below y=185.
poppler = shutil.which('pdftoppm')
if not poppler:
    raise RuntimeError('pdftoppm is required to reproduce the branding lockup')
subprocess.run([
    poppler, '-f', '1', '-l', '1', '-r', '720', '-x', '700', '-y', '710',
    '-W', '1570', '-H', '1020', '-singlefile', '-png', str(reference),
    str(root / 'public/assets/altis-brand-lockup'),
], check=True)
print('Extracted company emblem, watermark and complete branding lockup; original PDF unchanged.')
