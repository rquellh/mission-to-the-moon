#!/bin/bash
# Records one trip of the guided tour: the press of Next at a stop, the trip,
# and whatever the tour does on arriving, until it has been at rest a while.
#
# Writes into <out-dir>:
#   timeline.tsv   one line every 250 ms after the press:
#                  seconds  clock(mission s)  fast-forward(0|1)  view  button  counter  card title  ships(id:x,y or id:-)
#   cast/pNNNNN.jpg  every frame the page drew, named by milliseconds after the press
#   sheet-N.jpg    contact sheets of those frames, one every half second, each labelled with its time
#
# Usage:  record-tour-trip.sh <mission> <stop-number> <out-dir> [seconds] [WxH] [extra cast.mjs flags]
#   <stop-number>  the stop to leave from, counting from 1
#   [seconds]      how long to record after the press (default 22: the longest trip, plus what the
#                  tour does on arriving)
#   [WxH]          default 1440x900; for a phone pass 390x844 --mobile --dpr 2
#
# Run from the repository root with the dev server up. BASE overrides its
# address (default http://localhost:5199). The contact sheets need Python with Pillow.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MISSION="$1"; STOP="$2"; OUT="$3"; LENGTH="${4:-22}"; SIZE="${5:-1440x900}"
shift 3; [ $# -gt 0 ] && shift; [ $# -gt 0 ] && shift
BASE="${BASE:-http://localhost:5199}"
rm -rf "$OUT/cast"; mkdir -p "$OUT"
NEXT='click:[data-testid=tour-next]'
SAMPLE='eval:(()=>{clearInterval(window.__i);window.__s=[];window.__t0=performance.now();const q=(s)=>(document.querySelector(s)?.textContent||"").replace(/\s+/g," ").trim();window.__i=setInterval(()=>{const r=window.__missionScene();window.__s.push([((performance.now()-window.__t0)/1000).toFixed(2),Math.round(r.time),r.fastForward?1:0,r.view,q("[data-testid=tour-next]"),q("[data-testid=tour-count]"),q("#card-title"),r.ships.map(s=>s.id+":"+(s.box?Math.round(s.box.x+s.box.width/2)+","+Math.round(s.box.y+s.box.height/2):"-")).join(" ")].join("\t"))},250);return "recording"})()'

steps=(--step waitfor:body.is-ready --step wait:3500)
# Reach the stop: each pair starts a trip and then skips to its end.
for ((i = 1; i < STOP; i++)); do steps+=(--step "$NEXT" --step wait:700 --step "$NEXT" --step wait:700); done
steps+=(--step wait:2500 --step 'eval:"leaving: "+(document.querySelector("#card-title")?.textContent||"")')
steps+=(--step "cast:$OUT/cast" --step wait:400 --step "$SAMPLE" --step mark --step "$NEXT")
steps+=(--step "wait:$((LENGTH * 1000))" --step uncast --step 'eval:window.__s.join("\n")')

node "$HERE/cast.mjs" "$BASE/?mission=$MISSION&start=tour" --size "$SIZE" --timeout 30000 "$@" "${steps[@]}" --out "$OUT/end.png" > "$OUT/raw.log" 2>&1 || { tail -5 "$OUT/raw.log"; exit 1; }

grep -o 'leaving: [^"]*' "$OUT/raw.log" | head -1
# The last eval line holds the samples as one JSON string.
node -e 'const fs=require("fs");const lines=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(l=>l.startsWith("eval: "));const last=JSON.parse(lines[lines.length-1].slice(6));fs.writeFileSync(process.argv[2],"seconds\tclock\tff\tview\tbutton\tcounter\tcard\tships\n"+last+"\n")' "$OUT/raw.log" "$OUT/timeline.tsv"
n=0
for ((from = 0; from < LENGTH * 1000; from += 12000)); do
  python3 "$HERE/cast-sheets.py" "$OUT/cast" "$OUT/sheet-$n.jpg" "$from" "$((from + 11500))" 500 6 480 > /dev/null 2>&1 || echo "no sheet for ${from} ms (is Pillow installed?)"
  n=$((n + 1))
done
echo "timeline: $OUT/timeline.tsv ($(($(wc -l < "$OUT/timeline.tsv") - 1)) samples)   frames: $(ls "$OUT/cast" | wc -l | tr -d ' ') in $OUT/cast   sheets: $n in $OUT"
grep -i 'console error' "$OUT/raw.log" || true
