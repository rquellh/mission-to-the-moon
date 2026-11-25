#!/bin/bash
# Records Explore playing on from an event: opens the flight paused at the
# event, presses Play, and records what follows.
#
# Writes into <out-dir> the same files as record-tour-trip.sh: timeline.tsv
# (the "button" column is Play's label, the "counter" column is empty),
# cast/pNNNNN.jpg, and sheet-N.jpg.
#
# Usage:  record-explore.sh <mission> <event-id> <view> <out-dir> [seconds] [WxH] [extra cast.mjs flags]
#   <view>     earth, moon, spacecraft or journey; "-" for the event's own view
#   [seconds]  how long to record after Play (default 20)
#
# Run from the repository root with the dev server up (BASE, default http://localhost:5199).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MISSION="$1"; EVENT="$2"; VIEW="$3"; OUT="$4"; LENGTH="${5:-20}"; SIZE="${6:-1440x900}"
shift 4; [ $# -gt 0 ] && shift; [ $# -gt 0 ] && shift
BASE="${BASE:-http://localhost:5199}"
rm -rf "$OUT/cast"; mkdir -p "$OUT"
URL="$BASE/?mission=$MISSION&start=explore&event=$EVENT"; [ "$VIEW" != "-" ] && URL="$URL&view=$VIEW"
SAMPLE='eval:(()=>{clearInterval(window.__i);window.__s=[];window.__t0=performance.now();const q=(s)=>(document.querySelector(s)?.textContent||"").replace(/\s+/g," ").trim();window.__i=setInterval(()=>{const r=window.__missionScene();window.__s.push([((performance.now()-window.__t0)/1000).toFixed(2),Math.round(r.time),r.fastForward?1:0,r.view,document.querySelector("#play")?.getAttribute("aria-label")||"","",q("#card-title"),r.ships.map(s=>s.id+":"+(s.box?Math.round(s.box.x+s.box.width/2)+","+Math.round(s.box.y+s.box.height/2):"-")).join(" ")].join("\t"))},250);return "recording"})()'
node "$HERE/cast.mjs" "$URL" --size "$SIZE" --timeout 30000 "$@" \
  --step waitfor:body.is-ready --step wait:2500 \
  --step "cast:$OUT/cast" --step wait:400 --step "$SAMPLE" --step mark --step 'click:#play' \
  --step "wait:$((LENGTH * 1000))" --step uncast --step 'eval:window.__s.join("\n")' \
  --out "$OUT/end.png" > "$OUT/raw.log" 2>&1 || { tail -5 "$OUT/raw.log"; exit 1; }
node -e 'const fs=require("fs");const lines=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(l=>l.startsWith("eval: "));const last=JSON.parse(lines[lines.length-1].slice(6));fs.writeFileSync(process.argv[2],"seconds\tclock\tff\tview\tbutton\tcounter\tcard\tships\n"+last+"\n")' "$OUT/raw.log" "$OUT/timeline.tsv"
n=0
for ((from = 0; from < LENGTH * 1000; from += 12000)); do
  python3 "$HERE/cast-sheets.py" "$OUT/cast" "$OUT/sheet-$n.jpg" "$from" "$((from + 11500))" 500 6 480 > /dev/null 2>&1 || echo "no sheet for ${from} ms (is Pillow installed?)"
  n=$((n + 1))
done
echo "timeline: $OUT/timeline.tsv ($(($(wc -l < "$OUT/timeline.tsv") - 1)) samples)   frames: $(ls "$OUT/cast" | wc -l | tr -d ' ') in $OUT/cast   sheets: $n in $OUT"
grep -i 'console error' "$OUT/raw.log" || true
