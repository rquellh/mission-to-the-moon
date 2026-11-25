"""Contact sheets from a recording, sized to be read: at most 2000 px a side, so the image
reader does not shrink them, with each tile labelled with its time, the mission clock and the view.

Usage:
  python3 .claude/skills/animation-review/scripts/sheets.py <recording-dir> --auto
  python3 .claude/skills/animation-review/scripts/sheets.py <recording-dir> [--from S] [--to S] [--step S]
          [--at S,S,...] [--around CRAFT|followed|all] [--crop X,Y,W,H] [--per-sheet N] [--name NAME]

--auto      the usual set: sheet-NN.jpg (the whole recording at 0.5 s), craft-NN.jpg (the same,
            cropped around the followed craft), and mark-NN-<kind>-<time>.jpg (each moment in
            marks.tsv at 0.1 s; run check.py first, record.mjs does).
--from/--to/--step   seconds after the mark (default the whole recording at 0.5 s)
--at        tiles at exactly these times instead
--around    crop each tile around a craft (its id, "followed", or "all" for every drawn craft),
            from the craft's box in timeline.tsv (or its place in camera.tsv when it is faded)
--crop      a fixed crop, in CSS pixels as the timeline gives them (top left x, y, width, height)
--per-sheet tiles per sheet (default 12)

Each tile shows the frame that was on screen at its time: the last frame drawn at or before
it. A still page draws no frames, so a tile can show an older frame; its label then says
"frame from" that time. Times run on across sheets without a gap.
"""

import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

MAX_SIDE = 1980
LABEL_H = 30
GAP = 4
FONTS = [
    '/System/Library/Fonts/Menlo.ttc',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]


def font(size):
    for path in FONTS:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def number(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def read_tsv(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as handle:
        lines = handle.read().rstrip('\n').split('\n')
    head = lines[0].split('\t')
    return [dict(zip(head, line.split('\t'))) for line in lines[1:] if len(line.split('\t')) == len(head)]


def clock_text(seconds):
    if seconds is None:
        return '---:--:--'
    sign = '-' if seconds < 0 else ''
    s = int(round(abs(seconds)))
    return f'{sign}{s // 3600:03d}:{s % 3600 // 60:02d}:{s % 60:02d}'


def ship_boxes(text):
    boxes = {}
    for item in (text or '').split(' '):
        if ':' not in item:
            continue
        name, rest = item.split(':', 1)
        where, _, fade = rest.replace('+dot', '').partition('@')
        if where in ('-', 'gone') or ',' not in where:
            continue
        x, y, size = where.split(',')
        w, h = size.split('x')
        if (number(fade) or 0) > 0.05:
            boxes[name] = (float(x), float(y), float(w), float(h))
    return boxes


class Recording:
    def __init__(self, folder):
        self.dir = folder
        meta_path = os.path.join(folder, 'meta.json')
        self.meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
        cast = os.path.join(folder, 'cast')
        names = [n for n in os.listdir(cast) if n.endswith('.jpg')] if os.path.isdir(cast) else []
        self.frames = sorted(((int(n[1:-4]) * (-1 if n[0] == 'm' else 1)) / 1000, os.path.join(cast, n)) for n in names)
        if not self.frames:
            sys.exit(f'sheets.py: no frames in {cast}')
        size = self.meta.get('size') or {}
        first = Image.open(self.frames[0][1])
        self.frame_size = first.size
        self.css = (size.get('width') or first.size[0], size.get('height') or first.size[1])
        self.scale = self.frame_size[0] / self.css[0]
        self.timeline = read_tsv(os.path.join(folder, 'timeline.tsv'))
        for row in self.timeline:
            row['_t'] = number(row['t'])
            row['_boxes'] = ship_boxes(row.get('ships'))
        self.camera = read_tsv(os.path.join(folder, 'camera.tsv'))
        for row in self.camera:
            row['_t'] = number(row['t'])

    def end(self):
        ends = [self.frames[-1][0]]
        if self.timeline and self.timeline[-1]['_t'] is not None:
            ends.append(self.timeline[-1]['_t'])
        return max(ends)

    def frame_at(self, t):
        """The frame on screen at time t: the last drawn at or before it."""
        best = self.frames[0]
        for frame in self.frames:
            if frame[0] <= t + 1e-6:
                best = frame
            else:
                break
        return best

    def nearest(self, rows, t):
        best = None
        for row in rows:
            if row['_t'] is None:
                continue
            if best is None or abs(row['_t'] - t) <= abs(best['_t'] - t):
                best = row
            elif row['_t'] > t:
                break
        return best

    def target_at(self, t, around):
        """(cx, cy, size) in CSS px of what --around names at time t, or None."""
        row = self.nearest(self.timeline, t)
        boxes = row['_boxes'] if row else {}
        name = around
        if around == 'followed':
            name = row.get('followed') if row else None
        if around == 'all' and boxes:
            x0 = min(b[0] - b[2] / 2 for b in boxes.values())
            x1 = max(b[0] + b[2] / 2 for b in boxes.values())
            y0 = min(b[1] - b[3] / 2 for b in boxes.values())
            y1 = max(b[1] + b[3] / 2 for b in boxes.values())
            return ((x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0))
        if name in boxes:
            b = boxes[name]
            return (b[0], b[1], max(b[2], b[3]))
        # Faded or between samples: where the camera log projects the followed craft.
        cam = self.nearest(self.camera, t)
        if cam and cam.get('followed') == name and number(cam.get('sx')) is not None:
            return (number(cam['sx']), number(cam['sy']), 12.0)
        return None

    def label_at(self, t):
        row = self.nearest(self.timeline, t)
        if not row:
            return ''
        bits = [clock_text(number(row.get('clock'))), row.get('view', '')]
        if row.get('ff') == '1':
            bits.append('ff')
        if row.get('playing') == '0':
            bits.append('stopped')
        return '  '.join(bits)


def layout(count, aspect, label_h):
    """Columns and tile width that fit `count` tiles of this aspect (width/height) in MAX_SIDE square."""
    best = (1, 100)
    for cols in range(1, count + 1):
        rows = math.ceil(count / cols)
        width = min((MAX_SIDE - GAP * (cols + 1)) / cols, ((MAX_SIDE - GAP * (rows + 1)) / rows - label_h) * aspect)
        if width > best[1]:
            best = (cols, int(width))
    return best


def crop_box(rec, t, crop, around, window):
    """The crop in CSS px for a tile at t, or None for the whole frame."""
    if crop:
        return crop
    if not around:
        return None
    target = rec.target_at(t, around)
    if target is None:
        return None
    w, h = window
    cx, cy, _ = target
    x = min(max(0, cx - w / 2), max(0, rec.css[0] - w))
    y = min(max(0, cy - h / 2), max(0, rec.css[1] - h))
    return (x, y, w, h)


def crop_window(rec, times, around):
    """One crop size for a whole sheet, so its tiles share a zoom: about eight times the craft."""
    sizes = [target[2] for target in (rec.target_at(t, around) for t in times) if target]
    if not sizes:
        return None
    portrait = rec.css[0] < rec.css[1]
    width = min(rec.css[0], max(240.0, 8 * max(sizes)))
    height = width if portrait else width / 1.6
    if height > rec.css[1]:
        height = rec.css[1]
        width = height if portrait else height * 1.6
    return (width, height)


def make_sheets(rec, times, name, around=None, crop=None, per_sheet=12, step=None, title=''):
    paths = []
    big, small = font(20), font(16)
    for start in range(0, len(times), per_sheet):
        chunk = times[start:start + per_sheet]
        window = crop_window(rec, chunk, around) if around and not crop else None
        if crop:
            aspect = crop[2] / crop[3]
        elif window:
            aspect = window[0] / window[1]
        else:
            aspect = rec.css[0] / rec.css[1]
        label_h = LABEL_H
        cols, tile_w = layout(len(chunk), aspect, label_h)
        # A narrow tile (a phone's upright frame) gets its label on two lines, so it stays over its own tile.
        two_lines = tile_w < 520
        if two_lines:
            label_h = 2 * LABEL_H - 6
            cols, tile_w = layout(len(chunk), aspect, label_h)
        tile_h = int(tile_w / aspect)
        rows = math.ceil(len(chunk) / cols)
        sheet = Image.new('RGB', (cols * tile_w + (cols + 1) * GAP, rows * (tile_h + label_h) + (rows + 1) * GAP), (40, 40, 40))
        draw = ImageDraw.Draw(sheet)
        # Where the craft cannot be found (faded, not yet flying), keep the nearest crop, so the sheet keeps one zoom.
        boxes = [crop_box(rec, t, crop, around, window) if (crop or window) else None for t in chunk]
        if window:
            known = [k for k, box in enumerate(boxes) if box]
            for k in range(len(boxes)):
                if not boxes[k] and known:
                    boxes[k] = boxes[min(known, key=lambda j: abs(j - k))]
        for i, t in enumerate(chunk):
            frame_t, path = rec.frame_at(t)
            image = Image.open(path).convert('RGB')
            box = boxes[i]
            if box:
                s = rec.scale
                image = image.crop((int(box[0] * s), int(box[1] * s), int((box[0] + box[2]) * s), int((box[1] + box[3]) * s)))
            image = image.resize((tile_w, tile_h), Image.LANCZOS)
            r, c = divmod(i, cols)
            x = GAP + c * (tile_w + GAP)
            y = GAP + r * (tile_h + label_h + GAP)
            sheet.paste(image, (x, y + label_h))
            draw.text((x + 4, y + 4), f'{t:6.2f} s', fill=(255, 220, 80), font=big)
            extra = rec.label_at(t)
            stale = t - frame_t
            if step and stale > 1.5 * step:
                extra += f'  frame from {frame_t:.2f} s'
            if two_lines:
                draw.text((x + 4, y + LABEL_H - 2), extra, fill=(220, 220, 220), font=small)
            else:
                draw.text((x + 110, y + 7), extra, fill=(220, 220, 220), font=small)
        index = len(paths)
        file = os.path.join(rec.dir, name if name.endswith('.jpg') else f'{name}-{index:02d}.jpg')
        sheet.save(file, quality=88)
        paths.append(file)
        what = f'around {around}' if around else ('cropped' if crop else 'whole frame')
        print(f'{file}: {chunk[0]:.2f}-{chunk[-1]:.2f} s, {len(chunk)} tiles, {what}, {sheet.width}x{sheet.height}{"  " + title if title else ""}')
    return paths


def steps(start, end, step):
    count = int(math.floor((end - start) / step + 1e-6)) + 1
    return [round(start + k * step, 3) for k in range(count)]


# Which marks are about the camera (whole frame) and which about a craft (cropped around it).
CAMERA_KINDS = {'turn', 'roll', 'swell', 'moving-at-rest', 're-aim', 'stall'}
ORDER = ['jump', 'swell', 're-aim', 'moving-at-rest', 'turn', 'off', 'under', 'hidden', 'behind', 'vanish', 'pop',
         'tilt', 'roll', 'laps', 'stall']


def auto(rec):
    end = rec.end()
    start = max(-0.5, rec.frames[0][0])
    every = steps(max(0.0, start), end, 0.5)
    for old in os.listdir(rec.dir):
        if old.startswith(('sheet-', 'craft-', 'mark-')) and old.endswith('.jpg'):
            os.remove(os.path.join(rec.dir, old))
    make_sheets(rec, every, 'sheet', step=0.5)
    if any(rec.target_at(t, 'followed') for t in every[:: max(1, len(every) // 12)]):
        make_sheets(rec, every, 'craft', around='followed', step=0.5)
    marks_path = os.path.join(rec.dir, 'marks.tsv')
    if not os.path.exists(marks_path):
        return
    marks = read_tsv(marks_path)
    windows = []
    for mark in sorted(marks, key=lambda m: ORDER.index(m['kind']) if m['kind'] in ORDER else 99):
        a = max(start, float(mark['from']) - 0.4)
        b = min(end, float(mark['to']) + 0.8)
        if any(a < w['b'] and b > w['a'] and w['camera'] == (mark['kind'] in CAMERA_KINDS) for w in windows):
            continue
        windows.append({'a': a, 'b': b, 't': float(mark['from']), 'kind': mark['kind'], 'note': mark['note'],
                        'camera': mark['kind'] in CAMERA_KINDS})
        if len(windows) >= 8:
            break
    for k, w in enumerate(sorted(windows, key=lambda w: w['a'])):
        # One sheet a moment: 0.1 s apart when that fits in 15 tiles, wider apart when it does not.
        span = w['b'] - w['a']
        step = max(0.1, math.ceil(span / 14 / 0.1 - 1e-9) * 0.1)
        times = steps(w['a'], w['b'], step)
        name = f"mark-{k + 1:02d}-{w['kind']}-{w['t']:.2f}s.jpg"
        make_sheets(rec, times, name, around=None if w['camera'] else 'followed', per_sheet=15, step=step,
                    title=w['note'])


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('--'):
        sys.exit(__doc__)
    rec = Recording(args[0])
    options = {}
    flags = args[1:]
    i = 0
    while i < len(flags):
        flag = flags[i]
        if flag == '--auto':
            options['auto'] = True
            i += 1
            continue
        if i + 1 >= len(flags):
            sys.exit(f'sheets.py: {flag} needs a value')
        options[flag.lstrip('-')] = flags[i + 1]
        i += 2
    if options.get('auto'):
        auto(rec)
        return
    step = float(options.get('step', 0.5))
    if 'at' in options:
        times = [float(v) for v in options['at'].split(',')]
    else:
        times = steps(float(options.get('from', max(0.0, rec.frames[0][0]))), float(options.get('to', rec.end())), step)
    crop = tuple(float(v) for v in options['crop'].split(',')) if 'crop' in options else None
    name = options.get('name', 'pick')
    make_sheets(rec, times, name, around=options.get('around'), crop=crop,
                per_sheet=int(options.get('per-sheet', 12)), step=step)


if __name__ == '__main__':
    main()
