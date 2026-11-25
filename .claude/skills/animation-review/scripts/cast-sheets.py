# Contact sheet from a cast folder (frames named p01234.jpg = ms after the mark).
# Usage: python3 sheet.py <castdir> <out.jpg> <fromMs> <toMs> <stepMs> [cols] [tileW]
import os, sys
from PIL import Image, ImageDraw

d, out, a, b, step = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 5
tw = int(sys.argv[7]) if len(sys.argv) > 7 else 360
frames = []
for f in os.listdir(d):
    if not f.endswith('.jpg'):
        continue
    ms = int(f[1:-4]) * (-1 if f[0] == 'm' else 1)
    frames.append((ms, f))
frames.sort()
picked = []
want = a
for ms, f in frames:
    if ms < a or ms > b:
        continue
    if ms >= want:
        picked.append((ms, f))
        want = ms + step
if frames and frames[-1][0] > b:
    pass
ims = []
for ms, f in picked:
    im = Image.open(os.path.join(d, f)).convert('RGB')
    th = round(im.height * tw / im.width)
    im = im.resize((tw, th))
    dr = ImageDraw.Draw(im)
    dr.rectangle((0, 0, 70, 14), fill=(0, 0, 0))
    dr.text((3, 2), f'{ms} ms', fill=(255, 220, 80))
    ims.append(im)
if not ims:
    print('no frames')
    sys.exit(1)
th = ims[0].height
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw + (cols + 1) * 4, rows * th + (rows + 1) * 4), (50, 50, 50))
for i, im in enumerate(ims):
    r, c = divmod(i, cols)
    sheet.paste(im, (4 + c * (tw + 4), 4 + r * (th + 4)))
sheet.save(out, quality=85)
print(f'{len(ims)} frames -> {out}')
