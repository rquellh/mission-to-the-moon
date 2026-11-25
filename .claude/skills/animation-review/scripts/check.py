"""Check a recording made by record.mjs against the standards that numbers can judge.

Usage: python3 .claude/skills/animation-review/scripts/check.py <recording-dir> [--summary]
       python3 .claude/skills/animation-review/scripts/check.py <sweep-dir>     (record.mjs ... all)

Reads meta.json, events.json, timeline.tsv, camera.tsv and cast/ in the folder, prints the
report (all of it, or with --summary only the build line and the signals), and writes the
files below. Given a folder of recordings, it checks each one again and prints one line a
recording with each signal's state. It writes, in each recording:
  check.txt         the whole report
  camera-table.tsv  the camera log turned into motion, one row a frame (see references/recording-files.md)
  marks.tsv         the moments worth a closer look, which sheets.py --auto draws at 0.1 s

The thresholds below are rules of thumb for finding moments to look at, not the standards
themselves: a mark is a place to look, and its absence is not a pass. Only the pictures decide.
"""

import json
import math
import os
import sys

# Rules of thumb for the marks (see the module docstring).
JUMP_PX = 40  # the followed craft moves this far on screen between two frames (or 4% of the diagonal)
TURN_DEG_S = 60  # the camera's view direction turns faster than this
ROLL_DEG_S = 20  # the camera rolls about its view direction faster than this
TILT_DEG = 25  # in the ship view, the craft's local up is this far off the screen's up
COVER_HIGH = 0.7  # a body covers this share of the screen
COVER_RISE = 0.3  # or its share rises this much within a second
REST_TURN_DEG_S = 0.5  # with the clock stopped, a camera turning faster than this is moving
REST_SHIFT_PX_S = 4  # or a body's centre sliding faster than this on screen
STALL_S = 0.25  # a frame gap this long
LAP_LIMIT = 1 / 8  # the owner's standard: about one lap in 8 seconds for a drawn craft
DRAWN = 0.5  # a model at least this opaque counts as drawn
STORY_TOLERANCE = 0.15  # story seconds the card may lead the clock (sampling)


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
    rows = []
    for line in lines[1:]:
        cells = line.split('\t')
        if len(cells) == len(head):
            rows.append(dict(zip(head, cells)))
    return rows


def clock_text(seconds):
    if seconds is None:
        return '---:--:--'
    sign = '-' if seconds < 0 else ''
    s = int(round(abs(seconds)))
    return f'{sign}{s // 3600:03d}:{s % 3600 // 60:02d}:{s % 60:02d}'


def span_text(seconds):
    s = abs(seconds)
    if s >= 86400:
        return f'{int(s // 86400)} d {int(s % 86400 // 3600)} h {int(s % 3600 // 60)} m'
    if s >= 3600:
        return f'{int(s // 3600)} h {int(s % 3600 // 60)} m'
    if s >= 60:
        return f'{int(s // 60)} m {int(s % 60)} s'
    return f'{s:.0f} s'


def parse_ships(text):
    """'csm:943,438,40x18@1.00 lm:gone' -> {'csm': {...}, 'lm': {'gone': True}}"""
    ships = {}
    if not text or text == '-':
        return ships
    for item in text.split(' '):
        if ':' not in item:
            continue
        name, rest = item.split(':', 1)
        if rest == 'gone':
            ships[name] = {'gone': True, 'box': None, 'fade': 0.0, 'dot': False}
            continue
        dot = rest.endswith('+dot')
        rest = rest[:-4] if dot else rest
        where, _, fade = rest.partition('@')
        box = None
        if where != '-':
            x, y, size = where.split(',')
            w, h = size.split('x')
            box = (float(x), float(y), float(w), float(h))
        ships[name] = {'gone': False, 'box': box, 'fade': number(fade) or 0.0, 'dot': dot}
    return ships


def parse_rect(text):
    if not text or text == '-':
        return None
    x, y, size = text.split(',')
    w, h = size.split('x')
    return (float(x), float(y), float(w), float(h))


def angle_between(a, b):
    cross = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
    return math.degrees(math.atan2(math.sqrt(sum(c * c for c in cross)), sum(x * y for x, y in zip(a, b))))


def roll_between(f0, u0, f1, u1):
    """Signed turn of the camera's up about its view direction, from one frame to the next (degrees)."""
    d = sum(x * y for x, y in zip(u0, f1))
    p = [u0[i] - d * f1[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in p))
    if n < 1e-9:
        return 0.0
    p = [x / n for x in p]
    cross = (p[1] * u1[2] - p[2] * u1[1], p[2] * u1[0] - p[0] * u1[2], p[0] * u1[1] - p[1] * u1[0])
    sin = sum(c * f for c, f in zip(cross, f1))
    cos = sum(x * y for x, y in zip(p, u1))
    return math.degrees(math.atan2(sin, cos))


def disc_cover(cx, cy, r, w, h):
    """Share of a w x h screen covered by a disc (cx, cy, r); 0 when the body is behind the camera."""
    if r is None or cx is None or cy is None or math.isnan(r):
        return 0.0
    columns = 200
    covered = 0.0
    for k in range(columns):
        x = (k + 0.5) * w / columns
        dx = x - cx
        if abs(dx) >= r:
            continue
        half = math.sqrt(r * r - dx * dx)
        covered += max(0.0, min(h, cy + half) - max(0.0, cy - half))
    return covered / (columns * h)


class Recording:
    def __init__(self, folder):
        self.dir = folder
        self.meta = self.load_json('meta.json')
        self.flight = self.load_json('events.json')
        self.timeline = read_tsv(os.path.join(folder, 'timeline.tsv'))
        self.camera = read_tsv(os.path.join(folder, 'camera.tsv'))
        cast = os.path.join(folder, 'cast')
        names = sorted(os.listdir(cast)) if os.path.isdir(cast) else []
        self.frames = sorted(
            (int(name[1:-4]) * (-1 if name[0] == 'm' else 1)) / 1000 for name in names if name.endswith('.jpg')
        )
        self.events = self.flight.get('events', [])
        self.keys = self.flight.get('keys', [])
        size = self.meta.get('size', {})
        self.width = size.get('width', 1440)
        self.height = size.get('height', 900)
        for row in self.timeline:
            row['_t'] = number(row['t'])
            row['_clock'] = number(row['clock'])
            row['_story'] = number(row['story'])
            row['_ships'] = parse_ships(row['ships'])
            row['_clear'] = parse_rect(row['clear'])
        # Until the page is revealed (body.is-ready), the loading screen covers the scene: no marks there.
        self.ready_from = -math.inf
        ready = [row['_t'] for row in self.timeline if 'is-ready' in row['classes'].split(' ')]
        if ready and self.timeline and ready[0] > self.timeline[0]['_t']:
            self.ready_from = ready[0]

    def load_json(self, name):
        path = os.path.join(self.dir, name)
        if not os.path.exists(path):
            return {}
        with open(path, encoding='utf-8') as handle:
            return json.load(handle)

    def story_of(self, mission):
        keys = self.keys
        if mission is None or not keys:
            return None
        if mission <= keys[0][0]:
            return keys[0][1]
        for (a, sa), (b, sb) in zip(keys, keys[1:]):
            if a <= mission <= b:
                return sa + (mission - a) / (b - a) * (sb - sa) if b > a else sa
        return keys[-1][1]

    def reached(self, mission):
        """The event the clock has reached: the last at or before it (as MissionIndex.eventAt)."""
        found = None
        for event in self.events:
            if event['seconds'] <= mission + 0.01:
                found = event
        return found

    def card_event(self, title, mission):
        """The event a card title names; of several with that title, the one nearest the clock."""
        matches = [event for event in self.events if event['title'] == title]
        if not matches:
            return None
        return min(matches, key=lambda event: abs(event['seconds'] - mission))

    def tour_at(self, t):
        """'way' while the tour is on its way to a stop, 'stop' at one, None off the tour."""
        row = self.timeline_at(t)
        if not row or not row['counter'].startswith('Stop'):
            return None
        return 'way' if 'On the way' in row['counter'] else 'stop'

    def timeline_at(self, t):
        best = None
        for row in self.timeline:
            if row['_t'] is None:
                continue
            if best is None or abs(row['_t'] - t) < abs(best['_t'] - t):
                best = row
            elif row['_t'] > t:
                break
        return best


def out(lines, text=''):
    lines.append(text)


def build_lines(rec):
    meta = rec.meta
    stamp = meta.get('stamp') or {}
    lines = []
    changed = stamp.get('changed') or []
    app = [c for c in changed if c[3:].startswith(('src/', 'index.html', 'public/'))]
    dirty = f"{stamp.get('dirty')} changed files, {len(app)} of them in the app" if stamp.get('dirty') else 'clean'
    served = 'the dev server serves this tree' if stamp.get('servedMatches') else (
        'WARNING: the dev server serves a different copy of ' + ', '.join(stamp.get('servedDiffers') or ['?'])
    )
    out(lines, f"build   {stamp.get('commit', '?')} on {stamp.get('branch', '?')}, {dirty}, {stamp.get('recordedAt', '?')}; {served}")
    if stamp.get('load') is not None and stamp.get('cores'):
        busy = stamp['load'] > stamp['cores']
        out(lines, f"machine load {stamp['load']:.0f} on {stamp['cores']} cores" +
            ('; WARNING: busy, so frames come slowly and slow frames change what the scene does' if busy else ''))
    mode = meta.get('mode', '?')
    what = f"{mode} {meta.get('mission', '')} {meta.get('where', '')}"
    leaving = meta.get('leaving')
    if leaving:
        what += f" (leaving stop {leaving['stop']} of {leaving['stops']}, {leaving['card']}; next: {leaving.get('next') or 'the end'})"
    if mode == 'explore':
        what += f" in the {meta.get('view')} view"
    screen = f"{rec.width}x{rec.height}" + (f" dpr {meta.get('dpr')}" if meta.get('dpr', 1) != 1 else '')
    screen += ' phone' if meta.get('mobile') else ''
    screen += ' reduced motion' if meta.get('reducedMotion') else ''
    steps = ' '.join(meta.get('before', []))
    out(lines, f"record  {what}; {screen}; press {meta.get('press')}{'; before ' + steps if steps else ''}"
        f"{'; after ' + ' '.join(meta.get('after', [])) if meta.get('after') else ''}; ended: {meta.get('ended')}")
    if meta.get('consoleErrors'):
        out(lines, f"console {len(meta['consoleErrors'])} errors: {meta['consoleErrors'][0][:160]}")
    return lines


def clock_ran(rec, a, b):
    """Whether the story clock moved between real times a and b (from the camera log, else the timeline)."""
    rows = rec.camera if rec.camera else rec.timeline
    before = None
    after = None
    for row in rows:
        t = number(row['t'])
        if t is None:
            continue
        if t <= a:
            before = row
        if t >= b:
            after = row
            break
    if before is None or after is None:
        return None
    s0, s1 = number(before['story']), number(after['story'])
    if s0 is None or s1 is None:
        return None
    return abs(s1 - s0) > 1e-3


def frame_lines(rec, signals):
    lines = []
    frames = [t for t in rec.frames if t >= 0]
    if len(frames) < 2:
        out(lines, f'frames  {len(frames)} after the mark')
        signals.append(('frames', 'ok', f'{len(frames)} frames: the page hardly drew'))
        return lines
    gaps = [(b - a, a, b) for a, b in zip(frames, frames[1:])]
    span = frames[-1] - frames[0]
    median = sorted(g for g, _, _ in gaps)[len(gaps) // 2]
    out(lines, f'frames  {len(frames)} after the mark over {span:.1f} s: {len(frames) / span:.1f} a second, median gap {median * 1000:.0f} ms')
    stalls, rests, running = [], [], []
    for gap, a, b in gaps:
        ran = clock_ran(rec, a, b)
        if ran:
            running.append(gap)
        if gap < STALL_S:
            continue
        (stalls if ran else rests).append((gap, a, ran))
    slow = sorted(running)[len(running) // 2] if running else 0
    if slow > 0.2:
        # Too few frames to judge motion by, and slow frames change what the scene does, not only how it looks.
        signals.append(('frames', 'REDO', f'only {1 / slow:.1f} frames a second while the clock ran: record again on a quiet machine'))
        out(lines, f'        WARNING: {1 / slow:.1f} frames a second while the clock ran; record again before judging')
    elif stalls:
        out(lines, '        stalls (no frame while the clock ran): ' + ', '.join(f'{g:.2f} s at {a:.2f} s' for g, a, _ in stalls[:12]))
        signals.append(('frames', 'LOOK', f'{len(stalls)} gaps while the clock ran, longest {max(g for g, _, _ in stalls):.2f} s'))
    else:
        signals.append(('frames', 'ok', f'no frame gap of {STALL_S} s or more while the clock ran'))
    if rests:
        out(lines, '        rests (no frame, clock stopped: nothing to draw): ' + ', '.join(f'{g:.2f} s at {a:.2f} s' for g, a, _ in rests[:8]))
    # The page's own frames (requestAnimationFrame), which run whether or not anything is drawn.
    ticks = [number(row['t']) for row in rec.camera]
    ticks = [t for t in ticks if t is not None]
    long_ticks = [(b - a, a) for a, b in zip(ticks, ticks[1:]) if b - a >= STALL_S]
    if long_ticks:
        out(lines, '        slow page frames (main thread busy): ' + ', '.join(f'{g:.2f} s at {a:.2f} s' for g, a in long_ticks[:10]))
    return lines


def change_lines(rec):
    lines = [' ', 'changes (timeline, every 100 ms)', '     t       clock     story  what changed']
    last = {}
    for row in rec.timeline:
        notes = []
        drawn = ' '.join(
            f'{name}' + ('' if ship['fade'] >= 0.99 else f'@{ship["fade"]:.2f}')
            for name, ship in row['_ships'].items()
            if ship['box'] and ship['fade'] > 0.05
        ) or 'none'
        values = {
            'counter': row['counter'],
            'button': row['button'],
            'play': row['play'],
            'card': row['card'],
            'view': row['view'],
            'scale': row['scale'],
            'ff': row['ff'],
            'fastview': 'on' if (number(row['fastview']) or 0) > 0.001 else 'off',
            'followed': row['followed'],
            'playing': row['playing'],
            'tween': row['tween'],
            'usermoved': row['usermoved'],
            'ending': row['ending'],
            'clear': row['clear'],
            'drawn': drawn,
            'dock': row['dock'],
            'left': ' '.join(item.split(':')[0] for item in row['left'].split(' ')
                             if item.split(':', 1)[-1] not in ('-', '')) or 'none',
        }
        for key, value in values.items():
            if last.get(key) != value:
                if key == 'drawn' and key in last:
                    # Report fades in steps of a tenth, not every hundredth.
                    if coarse(last[key]) == coarse(value):
                        continue
                notes.append(f'{key} {value}' if key not in ('card', 'counter') else f'{key} "{value}"')
                last[key] = value
        if notes:
            out(lines, f"{row['_t']:6.2f}  {clock_text(row['_clock'])}  {row['_story'] if row['_story'] is not None else '-':>7}  " + ' | '.join(notes))
    return lines


def coarse(drawn):
    parts = []
    for item in drawn.split(' '):
        name, _, fade = item.partition('@')
        parts.append(name + (f'@{round(float(fade), 1)}' if fade else ''))
    return ' '.join(parts)


def card_lines(rec, signals):
    lines = [' ', 'the card against the clock (standard 1: never a moment the clock has not reached)']
    stretches = []
    for row in rec.timeline:
        card, mission = row['card'], row['_clock']
        if card in ('-', '') or mission is None:
            continue
        event = rec.card_event(card, mission)
        reached = rec.reached(mission)
        if event is None:
            state, lead = 'unknown', 0.0
        else:
            lead_story = (rec.story_of(event['seconds']) or 0) - (row['_story'] if row['_story'] is not None else rec.story_of(mission) or 0)
            lead = event['seconds'] - mission
            if lead_story > STORY_TOLERANCE and lead > 0:
                state = 'ahead'
            elif reached is not None and reached['seconds'] > event['seconds'] + 0.01:
                state = 'behind'
            else:
                state = 'ok'
        key = (card, state)
        if stretches and stretches[-1]['key'] == key and row['_t'] - stretches[-1]['to'] < 0.35:
            stretch = stretches[-1]
            stretch['to'] = row['_t']
            stretch['clock_to'] = mission
            stretch['lead'] = max(stretch['lead'], lead)
            stretch['reached_to'] = reached['title'] if reached else '-'
        else:
            stretches.append({
                'key': key, 'from': row['_t'], 'to': row['_t'], 'clock_from': mission, 'clock_to': mission,
                'lead': lead, 'event': event, 'reached_from': reached['title'] if reached else '-',
                'reached_to': reached['title'] if reached else '-',
            })
    if not stretches:
        out(lines, '  no card shown')
        return lines
    ahead_total, worst = 0.0, 0.0
    for stretch in stretches:
        card, state = stretch['key']
        event = stretch['event']
        when = f"{stretch['from']:5.2f}-{stretch['to']:5.2f} s"
        clocks = f"clock {clock_text(stretch['clock_from'])} to {clock_text(stretch['clock_to'])}"
        if state == 'ahead':
            ahead_total += stretch['to'] - stretch['from'] + 0.1
            worst = max(worst, stretch['lead'])
            out(lines, f"  FAIL   {when}  \"{card}\" ({clock_text(event['seconds'])}) while the {clocks}, "
                f"which has reached \"{stretch['reached_from']}\": up to {span_text(stretch['lead'])} early")
        elif state == 'behind':
            out(lines, f"  behind {when}  \"{card}\" while the {clocks} has passed \"{stretch['reached_to']}\"")
        elif state == 'unknown':
            out(lines, f"  ?      {when}  \"{card}\" is not an event title of this flight")
        else:
            out(lines, f"  ok     {when}  \"{card}\", {clocks}")
    if ahead_total:
        signals.append(('1 card', 'FAIL', f'names a moment not reached for {ahead_total:.1f} s, by up to {span_text(worst)}'))
    else:
        signals.append(('1 card', 'ok', 'never ahead of the clock'))
    return lines


def camera_table(rec):
    """The camera log turned into motion, one row a frame."""
    rows = []
    previous = []
    diag = math.hypot(rec.width, rec.height)
    clear_rows = [(row['_t'], row['_clear']) for row in rec.timeline if row['_clear']]
    ci = 0
    for raw in rec.camera:
        t = number(raw['t'])
        if t is None:
            continue
        f = (number(raw['fx']), number(raw['fy']), number(raw['fz']))
        u = (number(raw['ux']), number(raw['uy']), number(raw['uz']))
        if None in f or None in u:
            continue
        w = number(raw['w']) or rec.width
        h = number(raw['h']) or rec.height
        # Rates over at least 50 ms, so two callbacks a few ms apart do not inflate them.
        base = None
        for old in reversed(previous):
            if t - old['t'] >= 0.05:
                base = old
                break
        last = previous[-1] if previous else None
        view = raw['view']
        body = 'E' if view == 'earth' else 'M' if view == 'moon' else raw['near']
        prefix = 'e' if body == 'E' else 'm'
        dist = number(raw[f'{prefix}d'])
        covers = {}
        for key in ('e', 'm'):
            distance = number(raw[f'{key}d'])
            if distance is not None and distance <= 1:
                covers[key] = 1.0  # the camera is inside the body
            else:
                covers[key] = disc_cover(number(raw[f'{key}x']), number(raw[f'{key}y']), number(raw[f'{key}r']), w, h)
        big = 'e' if covers['e'] >= covers['m'] else 'm'
        sx, sy = number(raw['sx']), number(raw['sy'])
        fade = number(raw['fade'])
        while ci + 1 < len(clear_rows) and clear_rows[ci + 1][0] <= t:
            ci += 1
        clear = clear_rows[ci][1] if clear_rows else (0, 0, w, h)
        if raw['followed'] == '-' or sx is None:
            where = 'none' if raw['sx'] == '-' and raw['occluded'] == '-' else 'behind'
        elif raw['occluded'] == '1':
            where = 'hidden'
        elif not (0 <= sx <= w and 0 <= sy <= h):
            where = 'off'
        elif not (clear[0] + 4 <= sx <= clear[0] + clear[2] - 4 and clear[1] + 4 <= sy <= clear[1] + clear[3] - 4):
            where = 'under'
        else:
            where = 'in'
        row = {
            't': t, 'clock': number(raw['clock']), 'story': number(raw['story']), 'playing': raw['playing'] == '1',
            'speed': number(raw['speed']), 'view': view, 'followed': raw['followed'], 'tween': raw['tween'] == '1',
            'usermoved': raw['usermoved'] == '1', 'fastview': number(raw['fastview']) or 0.0, 'fade': fade,
            'laps': number(raw['laps']), 'body': body, 'dist': dist, 'cover': covers[big], 'cover_body': big.upper(),
            'sx': sx, 'sy': sy, 'where': where, 'tilt': number(raw['tilt']), 'tiltw': number(raw['tiltw']) or 0.0,
            'f': f, 'u': u, 'bx': number(raw[f'{prefix}x']), 'by': number(raw[f'{prefix}y']),
            'gap': (t - last['t']) if last else 0.0, 'turn': 0.0, 'roll': 0.0, 'jump': 0.0, 'lapsps': None,
            'shift': 0.0, 'w': w, 'h': h,
        }
        if base:
            dt = max(1e-3, t - base['t'])
            row['turn'] = angle_between(base['f'], f) / dt
            row['roll'] = roll_between(base['f'], base['u'], f, u) / dt
            if row['bx'] is not None and base['bx'] is not None:
                row['shift'] = math.hypot(row['bx'] - base['bx'], row['by'] - base['by']) / dt
        # Laps over half a second: the clock's frame-to-frame steps are too uneven for a shorter window.
        lap_base = None
        for old in reversed(previous):
            if t - old['t'] >= 0.5:
                lap_base = old
                break
        if lap_base and row['laps'] is not None and lap_base['laps'] is not None and lap_base['followed'] == row['followed']:
            span = t - lap_base['t']
            # Not across a jump of the clock (a Skip, a seek): the craft did not fly those laps on screen.
            fastest = max(1.0, row['speed'] or 0.0, lap_base['speed'] or 0.0)
            jumped = (row['story'] is not None and lap_base['story'] is not None
                      and abs(row['story'] - lap_base['story']) > 1.5 * fastest * span + 0.3)
            if not jumped:
                row['lapsps'] = (row['laps'] - lap_base['laps']) / span
        if last and sx is not None and last['sx'] is not None:
            row['jump'] = math.hypot(sx - last['sx'], sy - last['sy'])
        row['jump_limit'] = max(JUMP_PX, 0.04 * diag)
        rows.append(row)
        previous.append(row)
        if len(previous) > 120:  # over half a second even at 60 frames a second
            previous.pop(0)
    return rows


def write_camera_table(rec, rows):
    head = ['t', 'gap', 'clock', 'story', 'playing', 'view', 'followed', 'tween', 'usermoved', 'fastview', 'fade',
            'turn', 'roll', 'tilt', 'body', 'dist', 'cover', 'sx', 'sy', 'jump', 'where', 'lapsps']
    with open(os.path.join(rec.dir, 'camera-table.tsv'), 'w', encoding='utf-8') as handle:
        handle.write('\t'.join(head) + '\n')
        for r in rows:
            handle.write('\t'.join([
                f"{r['t']:.3f}", f"{r['gap'] * 1000:.0f}", f"{r['clock']:.0f}" if r['clock'] is not None else '-',
                f"{r['story']:.3f}" if r['story'] is not None else '-', '1' if r['playing'] else '0', r['view'],
                r['followed'], '1' if r['tween'] else '0', '1' if r['usermoved'] else '0', f"{r['fastview']:.2f}",
                f"{r['fade']:.2f}" if r['fade'] is not None else '-', f"{r['turn']:.1f}", f"{r['roll']:.1f}",
                f"{r['tilt']:.1f}" if r['tilt'] is not None else '-', r['body'],
                f"{r['dist']:.3f}" if r['dist'] is not None else '-', f"{r['cover']:.3f}",
                f"{r['sx']:.0f}" if r['sx'] is not None else '-', f"{r['sy']:.0f}" if r['sy'] is not None else '-',
                f"{r['jump']:.0f}", r['where'], f"{r['lapsps']:.3f}" if r['lapsps'] is not None else '-',
            ]) + '\n')


def find_marks(rec, rows):
    """Moments worth a closer look, each (kind, t, value, note)."""
    marks = []
    for i, r in enumerate(rows):
        if r['t'] < rec.ready_from:
            continue
        drawn = r['fade'] is not None and r['fade'] >= DRAWN
        prev = rows[i - 1] if i else None
        if prev and r['jump'] > r['jump_limit'] and drawn and (prev['fade'] or 0) >= DRAWN:
            jumped = prev['story'] is not None and r['story'] is not None and abs(r['story'] - prev['story']) > 0.5
            slow = ' after a slow frame' if r['gap'] >= 0.2 else ''
            marks.append(('jump', r['t'], r['jump'], 'the clock jumped' if jumped else
                          f"{r['view']} view, {'camera moving' if r['tween'] else 'no camera move under way'}{slow}"))
        if r['turn'] > TURN_DEG_S:
            marks.append(('turn', r['t'], r['turn'], 'during a camera move' if r['tween'] else 'with no camera move under way' + (' (visitor)' if r['usermoved'] else '')))
        if abs(r['roll']) > ROLL_DEG_S:
            marks.append(('roll', r['t'], r['roll'], f"{r['view']} view"))
        if (r['view'] == 'spacecraft' and drawn and not r['tween'] and r['fastview'] < 0.05 and r['tilt'] is not None
                and r['tiltw'] > 0.5 and abs(r['tilt']) > TILT_DEG):
            marks.append(('tilt', r['t'], r['tilt'], 'horizon off level in the ship view'))
        if drawn and r['where'] in ('off', 'behind', 'hidden', 'under'):
            marks.append((r['where'], r['t'], r['jump'], f"{r['followed']} {'behind a body' if r['where'] == 'hidden' else 'behind the interface' if r['where'] == 'under' else 'off the screen'}"))
        if r['cover'] > COVER_HIGH:
            marks.append(('swell', r['t'], r['cover'], f"{'Earth' if r['cover_body'] == 'E' else 'the Moon'} covers {r['cover'] * 100:.0f}% of the screen"))
        else:
            for old in rows[max(0, i - 30):i]:
                if r['t'] - old['t'] <= 1.0 and r['cover'] - old['cover'] > COVER_RISE:
                    marks.append(('swell', r['t'], r['cover'], f"a body grows from {old['cover'] * 100:.0f}% to {r['cover'] * 100:.0f}% of the screen within a second"))
                    break
        if prev and not r['playing'] and not prev['playing'] and not r['usermoved']:
            if r['turn'] > REST_TURN_DEG_S or r['shift'] > REST_SHIFT_PX_S:
                tour = rec.tour_at(r['t'])
                why = ' (the tour holds on its way)' if tour == 'way' else ' (the tour has arrived)' if tour == 'stop' else ''
                marks.append(('moving-at-rest', r['t'], r['turn'],
                              f"{'a camera move' if r['tween'] else 'the camera settling'} with the clock stopped{why}, "
                              f"{r['view']} view, the body sliding {r['shift']:.0f} px/s"))
        if prev and r['tween'] and not prev['tween'] and r['view'] in ('earth', 'moon'):
            changed = any(old['view'] != r['view'] for old in rows[max(0, i - 8):i])
            if not changed:
                marks.append(('re-aim', r['t'], 0, f"a camera move starts in the {r['view']} view with no change of view"
                              + (' (clock stopped)' if not r['playing'] else '')))
        if prev and r['gap'] >= STALL_S and (r['playing'] or prev['playing']):
            marks.append(('stall', r['t'], r['gap'], 'a slow frame while the clock ran'))
        if drawn and r['lapsps'] is not None and abs(r['lapsps']) > LAP_LIMIT and r['fastview'] < 0.5:
            marks.append(('laps', r['t'], abs(r['lapsps']), f"{r['followed']} drawn and lapping once in {1 / abs(r['lapsps']):.1f} s"))
    # From the timeline: a craft that vanishes without fading, or jumps in size.
    for prev, row in zip(rec.timeline, rec.timeline[1:]):
        if row['_t'] is None or row['_t'] < rec.ready_from:
            continue
        for name, ship in row['_ships'].items():
            before = prev['_ships'].get(name)
            if not before or before['box'] is None or before['fade'] < DRAWN:
                continue
            if ship['box'] is None and not ship['gone'] and ship['fade'] >= DRAWN and not ship['dot']:
                x, y, w, h = before['box']
                inside = w < x < rec.width - w and h < y < rec.height - h
                if inside:
                    marks.append(('vanish', row['_t'], 0, f'{name} drawn, then not, without fading'))
            elif ship['box'] is not None and ship['fade'] >= DRAWN:
                size0 = max(before['box'][2], before['box'][3])
                size1 = max(ship['box'][2], ship['box'][3])
                if size0 > 6 and size1 > 6 and max(size0, size1) / min(size0, size1) > 1.5:
                    marks.append(('pop', row['_t'], size1 / size0, f'{name} from {size0:.0f} to {size1:.0f} px in 100 ms'))
    return marks


def group_marks(marks, reduced_motion=False):
    if reduced_motion:
        # Under reduced motion everything jumps: a cut shows up as a turn, a roll or a jump in one frame.
        marks = [(kind, t, value, note + ' (reduced motion: a cut is expected)') for kind, t, value, note in marks]
    groups = []
    for kind, t, value, note in sorted(marks, key=lambda m: (m[0], m[1])):
        last = groups[-1] if groups else None
        if last and last['kind'] == kind and t - last['to'] <= 0.35:
            last['to'] = t
            if abs(value) > abs(last['peak']):
                last['peak'], last['peak_t'], last['note'] = value, t, note
        else:
            groups.append({'kind': kind, 'from': t, 'to': t, 'peak': value, 'peak_t': t, 'note': note})
    return sorted(groups, key=lambda g: g['from'])


UNITS = {'jump': 'px', 'turn': 'deg/s', 'roll': 'deg/s', 'tilt': 'deg', 'swell': 'of screen', 'moving-at-rest': 'deg/s',
         'stall': 's', 'laps': 'laps/s', 'pop': 'x', 'off': 'px', 'under': 'px', 'hidden': 'px', 'behind': 'px', 're-aim': '', 'vanish': ''}


def mark_lines(groups, signals, rows):
    lines = [' ', 'marks: moments worth a closer look (rules of thumb; sheets.py --auto draws each at 0.1 s)']
    if not groups:
        out(lines, '  none')
    for g in groups:
        peak = f"{g['peak']:.2f}" if g['kind'] in ('swell', 'stall', 'laps', 'pop') else f"{g['peak']:.0f}"
        value = f'{peak} {UNITS[g["kind"]]}' if UNITS[g['kind']] and g['kind'] not in ('off', 'under', 'hidden', 'behind') else ''
        out(lines, f"  {g['kind']:<15} {g['from']:6.2f}-{g['to']:6.2f} s  {value:<18} {g['note']}")
    kinds = {}
    for g in groups:
        kinds.setdefault(g['kind'], []).append(g)
    end = rows[-1]['t'] if rows else 0

    def report(name, wanted, what):
        found = [g for k in wanted for g in kinds.get(k, [])]
        if found:
            first = min(found, key=lambda g: g['from'])
            signals.append((name, 'LOOK', f"{what}: {len(found)} times, first at {first['from']:.2f} s ({first['note']})"))
        else:
            signals.append((name, 'ok', 'no marks'))

    # Each signal carries the numbers of the standards in SKILL.md it bears on.
    report('7 laps', ['laps'], 'a drawn craft laps faster than once in 8 s')
    report('9-10 still', ['moving-at-rest', 're-aim'], 'the camera moves with the clock stopped, or re-aims itself')
    report('11 around', ['swell', 'turn'], 'a body swells or the camera turns fast')
    report('14 level', ['tilt', 'roll'], 'the horizon tilts or the camera rolls')
    report('16-17 in frame', ['off', 'under', 'hidden', 'behind'], 'the followed craft off screen, behind the interface or a body')
    arrival = [r for r in rows if r['t'] >= end - 2.0]
    bad = [r for r in arrival if r['fade'] is not None and r['fade'] >= DRAWN and r['where'] != 'in']
    if arrival and bad:
        signals.append(('17 arrival', 'LOOK', f"in the last 2 s the craft is {bad[-1]['where']} ({len(bad)} of {len(arrival)} frames)"))
    elif arrival:
        signals.append(('17 arrival', 'ok', 'the followed craft is in the clear area through the last 2 s (or not drawn)'))
    report('18-19 pops', ['jump', 'pop', 'vanish'], 'a craft jumps, pops or vanishes')
    return lines


def pace_lines(rows):
    lines = [' ', 'pace (from the camera log)']
    moving = [r for r in rows if r['playing'] and r['speed'] is not None]
    if not moving:
        out(lines, '  the clock did not run')
        return lines
    top = max(moving, key=lambda r: r['speed'])
    out(lines, f"  fastest story pace {top['speed']:.2f} story s per real s at {top['t']:.2f} s (Explore at 1x is 1.00)")
    drawn = [r for r in moving if r['lapsps'] is not None and r['fade'] is not None and r['fade'] >= DRAWN]
    if drawn:
        lap = max(drawn, key=lambda r: abs(r['lapsps']))
        out(lines, f"  fastest lapping of a drawn craft: {abs(lap['lapsps']):.3f} laps/s (once in {1 / max(1e-9, abs(lap['lapsps'])):.1f} s) at {lap['t']:.2f} s, {lap['followed']}")
    return lines


def table_lines(rows, groups):
    lines = [' ', 'camera (every 0.25 s and every marked frame; all of it in camera-table.tsv)',
             '     t   gap    clock     view        tw  fv   fade   turn   roll   tilt  body dist  cover  craft x,y   jump  where  laps/s']
    marked = set()
    for g in groups:
        marked.add(round(g['peak_t'], 3))
        marked.add(round(g['from'], 3))
    next_t = -1e9
    for r in rows:
        flag = round(r['t'], 3) in marked
        if r['t'] < next_t and not flag:
            continue
        if r['t'] >= next_t:
            next_t = r['t'] + 0.25
        craft = f"{r['sx']:5.0f},{r['sy']:4.0f}" if r['sx'] is not None else '     -    '
        tilt = f"{r['tilt']:6.1f}" if r['view'] == 'spacecraft' and r['tilt'] is not None and r['tiltw'] > 0.3 else '     -'
        laps = f"{r['lapsps']:.3f}" if r['lapsps'] is not None else '-'
        fade = f"{r['fade']:.2f}" if r['fade'] is not None else '  - '
        dist = f"{r['dist']:6.2f}" if r['dist'] is not None else '     -'
        out(lines, f"{r['t']:6.2f} {r['gap'] * 1000:4.0f}  {clock_text(r['clock'])}  {r['view']:<10} {'1' if r['tween'] else '0'}  {r['fastview']:.1f}  {fade}  {r['turn']:5.1f}  {r['roll']:5.1f} {tilt}   {r['body']} {dist}  {r['cover'] * 100:4.0f}%  {craft}  {r['jump']:4.0f}  {r['where']:<6} {laps}{'  <' if flag else ''}")
    return lines


def write_marks(rec, groups):
    with open(os.path.join(rec.dir, 'marks.tsv'), 'w', encoding='utf-8') as handle:
        handle.write('kind\tfrom\tto\tpeak_t\tpeak\tnote\n')
        for g in groups:
            handle.write(f"{g['kind']}\t{g['from']:.3f}\t{g['to']:.3f}\t{g['peak_t']:.3f}\t{g['peak']:.3f}\t{g['note']}\n")


def check(folder):
    """Analyse one recording, write its files, and return (head lines, signal lines, the rest, signals)."""
    rec = Recording(folder)
    signals = []
    lines = [f'== {rec.dir}']
    lines += build_lines(rec)
    lines += frame_lines(rec, signals)
    rows = camera_table(rec)
    write_camera_table(rec, rows)
    groups = group_marks(find_marks(rec, rows), rec.meta.get('reducedMotion', False))
    write_marks(rec, groups)
    body = []
    body += card_lines(rec, signals)
    body += change_lines(rec)
    body += pace_lines(rows)
    body += mark_lines(groups, signals, rows)
    body += table_lines(rows, groups)
    signal_lines = [' ', 'signals (FAIL: a standard is broken; LOOK: read the sheets for these times; '
                    'REDO: too few frames to judge)']
    for name, state, text in signals:
        signal_lines.append(f'  {state:<5} {name:<20} {text}')
    full = lines + signal_lines + body
    with open(os.path.join(rec.dir, 'check.txt'), 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(full) + '\n')
    with open(os.path.join(rec.dir, 'signals.json'), 'w', encoding='utf-8') as handle:
        json.dump([{'name': name, 'state': state, 'text': text} for name, state, text in signals], handle, indent=1)
    return lines, signal_lines, body, signals


def grid_lines(root, results):
    """One line a recording, each signal's state: a whole tour or flight at a glance."""
    names = []
    for _, signals in results:
        for name, _, _ in signals:
            if name not in names:
                names.append(name)
    labels = [os.path.relpath(folder, root) for folder, _ in results]
    width = max(len(label) for label in labels)
    out = [' ', "summary: each signal per recording (details in each folder's check.txt)",
           ' ' * width + '  ' + '  '.join(f'{name:<{max(5, len(name))}}' for name in names)]
    for label, (_, signals) in zip(labels, results):
        states = {name: state for name, state, _ in signals}
        out.append(f'{label:<{width}}  ' + '  '.join(f"{states.get(name, '-'):<{max(5, len(name))}}" for name in names))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    summary_only = '--summary' in sys.argv
    folders = []
    for arg in args:
        if os.path.exists(os.path.join(arg, 'timeline.tsv')):
            folders.append(arg)
        elif os.path.isdir(arg):
            # A sweep: every recording folder inside it (record.mjs ... all).
            folders += sorted(os.path.join(arg, d) for d in os.listdir(arg) if os.path.exists(os.path.join(arg, d, 'timeline.tsv')))
    if not folders:
        sys.exit(f'check.py: no recording (timeline.tsv) in {", ".join(args)}')
    if len(folders) == 1:
        lines, signal_lines, body, _ = check(folders[0])
        print('\n'.join(lines + signal_lines if summary_only else lines + signal_lines + body))
        return
    results = []
    for folder in folders:
        _, _, _, signals = check(folder)
        results.append((folder, signals))
    print('\n'.join(grid_lines(os.path.commonpath(folders), results)))


if __name__ == '__main__':
    main()
