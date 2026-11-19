#!/usr/bin/env node
/**
 * Print a flight plan's `sky` samples (where the Moon and Sun were, and
 * which point on Earth was under the Moon) from JPL Horizons, ready to paste
 * into a mission's flight.ts, with the same citation wording the Apollo 11
 * and Gemini 8 plans use. No dependencies (Node 18 or later, for fetch).
 *
 * Usage:
 *   node tools/sky.mjs --launch <UTC> --end <UTC> [--zero <UTC>] [--at <UTC>]...
 *
 * Times are universal time, written "1969-07-16 13:32:00.63" or
 * "1969-07-16T13:32:00.63Z". Keep the digits the source prints: they are
 * sent to Horizons and printed in the citations as given.
 *
 *   --launch  The first moment to sample: the earliest lift-off of any ship.
 *   --end     The last moment to sample: the landing, or the end of the story.
 *   --at      Another moment to sample (repeat for more), for example the crew's
 *             lift-off when a target was launched first.
 *   --zero    When the mission clock reads zero (range zero), if not at --launch.
 *             The samples' times are printed on that clock.
 *
 * Two samples are enough to fix the sky for a whole flight. The existing
 * plans sample at moments when Earth-relative positions shape the path:
 * Apollo 11 at translunar injection and entry interface; Gemini 8 at the
 * Agena's lift-off, the crew's lift-off, and landing.
 *
 * It sends Horizons only the ephemeris query (bodies, quantities, times).
 * Each citation carries the complete address that returns its value (one per
 * table, built from the times), so a reader can open it and check the number.
 *
 * Example (Apollo 11's samples):
 *   node tools/sky.mjs --zero "1969-07-16 13:32:00" \
 *     --launch "1969-07-16 16:22:13.03" --end "1969-07-24 16:35:05.7"
 */

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";

/** The three Horizons observer tables a sky sample needs. */
const TABLES = [
  { key: "moonEclipticLongitude", constant: "MOON_FROM_EARTH", target: "Moon (301) from Earth's center", command: "301", center: "500@399", quantities: "31", column: "ObsEcLon" },
  { key: "subLunarLongitude", constant: "EARTH_FROM_MOON", target: "Earth (399) from the Moon's center", command: "399", center: "500@301", quantities: "14", column: "ObsSub-LON" },
  { key: "sunEclipticLongitude", constant: "SUN_FROM_EARTH", target: "Sun (10) from Earth's center", command: "10", center: "500@399", quantities: "31", column: "ObsEcLon" },
];

function fail(message) {
  console.error(`sky.mjs: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { at: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--help" || flag === "-h") {
      console.log("Usage: node tools/sky.mjs --launch <UTC> --end <UTC> [--zero <UTC>] [--at <UTC>]...");
      process.exit(0);
    }
    if (!["--launch", "--end", "--zero", "--at"].includes(flag)) fail(`unknown option ${flag}`);
    if (value === undefined) fail(`${flag} needs a time`);
    if (flag === "--at") out.at.push(value);
    else out[flag.slice(2)] = value;
    i++;
  }
  if (!out.launch || !out.end) fail("give --launch and --end (see --help)");
  return out;
}

/**
 * A UTC time as typed, split into the text Horizons and the citations get
 * ("1969-07-16 16:22:13.03") and an exact count of microseconds since 1970.
 */
function parseTime(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z?$/.exec(text.trim());
  if (!m) fail(`cannot read the time "${text}" (write it like 1969-07-16 13:32:00.63)`);
  const [, y, mo, d, h, mi, s, fraction = ""] = m;
  const whole = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  const micro = BigInt(whole) * 1000n + BigInt((fraction + "000000").slice(0, 6));
  const label = `${y}-${mo}-${d} ${h}:${mi}:${s}${fraction ? `.${fraction}` : ""}`;
  return { label, micro };
}

/** Microseconds as mission clock time, "hhh:mm:ss.ss" (negative before zero), keeping only the digits needed. */
function clockTime(micro) {
  const sign = micro < 0n ? "-" : "";
  let rest = micro < 0n ? -micro : micro;
  const hours = rest / 3_600_000_000n;
  rest -= hours * 3_600_000_000n;
  const minutes = rest / 60_000_000n;
  rest -= minutes * 60_000_000n;
  const seconds = rest / 1_000_000n;
  const fraction = (rest - seconds * 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  const pad = (n, w) => n.toString().padStart(w, "0");
  return `${sign}${pad(hours, 3)}:${pad(minutes, 2)}:${pad(seconds, 2)}${fraction ? `.${fraction}` : ""}`;
}

/** Horizons parameters in the order and spelling the existing citations use. */
function query(times, table) {
  const quoted = (v) => `%27${v}%27`;
  const list = times.map((t) => quoted(t.label.replace(" ", "%20"))).join(",");
  const parts = ["format=text"];
  if (table) {
    parts.push(`COMMAND=${quoted(table.command)}`, `CENTER=${quoted(table.center)}`, `QUANTITIES=${quoted(table.quantities)}`, `OBJ_DATA=${quoted("NO")}`, `CSV_FORMAT=${quoted("YES")}`);
  }
  parts.push(
    `MAKE_EPHEM=${quoted("YES")}`,
    `EPHEM_TYPE=${quoted("OBSERVER")}`,
    `ANG_FORMAT=${quoted("DEG")}`,
    `TIME_TYPE=${quoted("UT")}`,
    `TLIST_TYPE=${quoted("CAL")}`,
    `TLIST=${list}`,
  );
  return `${API}?${parts.join("&")}`;
}

/** The first value column of each row of a Horizons observer table, as printed. */
async function fetchColumn(url, table, count) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(`could not reach JPL Horizons (${error.message})`);
  }
  const text = await response.text();
  if (!response.ok) fail(`JPL Horizons answered ${response.status}: ${text.slice(0, 300)}`);
  const start = text.indexOf("$$SOE");
  const end = text.indexOf("$$EOE");
  if (start < 0 || end < 0) fail(`no table in the answer for ${table.target}:\n${text.slice(0, 1500)}`);
  const header = text.slice(0, start).split("\n").reverse().find((line) => line.includes("Date__(UT)"));
  if (!header || !header.split(",").map((c) => c.trim()).includes(table.column)) {
    fail(`expected a ${table.column} column for ${table.target}, got: ${header}`);
  }
  const column = header.split(",").map((c) => c.trim()).indexOf(table.column);
  const rows = text
    .slice(start + 5, end)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((c) => c.trim()));
  if (rows.length !== count) fail(`expected ${count} rows for ${table.target}, got ${rows.length}`);
  return rows.map((row) => {
    const value = row[column];
    if (!value || !/^-?\d+(\.\d+)?$/.test(value)) fail(`unreadable ${table.column} "${value}" for ${table.target}`);
    return value;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const launch = parseTime(args.launch);
  const end = parseTime(args.end);
  const zero = args.zero ? parseTime(args.zero) : launch;
  const seen = new Set();
  const times = [launch, ...args.at.map(parseTime), end]
    .filter((t) => (seen.has(t.micro) ? false : (seen.add(t.micro), true)))
    .sort((a, b) => (a.micro < b.micro ? -1 : a.micro > b.micro ? 1 : 0));
  if (end.micro <= launch.micro) fail("--end must come after --launch");

  const values = {};
  const addresses = [];
  for (const table of TABLES) {
    const url = query(times, table);
    addresses.push([table, url]);
    values[table.key] = await fetchColumn(url, table, times.length);
  }

  const lines = [];
  lines.push("// Sky samples from JPL Horizons, printed by tools/sky.mjs.");
  lines.push("// Each value is copied as Horizons prints it. The query addresses, one per table:");
  for (const [table, url] of addresses) lines.push(`//   ${table.target}, ${table.column}:`, `//   ${url}`);
  lines.push("//");
  lines.push("// Replace TIME_SOURCE in each sample with the citation for that moment's time");
  lines.push("// (the source that gives the launch, landing, or other event time). The type");
  lines.push("// checker rejects the plan until you do.");
  lines.push("");
  const timesPart = "&TLIST_TYPE" + query(times).split("&TLIST_TYPE")[1];
  lines.push("/** The Horizons query for each sky table, at the times below (printed by tools/sky.mjs). */");
  lines.push(`const HORIZONS_TIMES = ${JSON.stringify(timesPart)};`);
  lines.push("const HORIZONS_QUERY = (command: string, center: string, quantities: string): string =>");
  lines.push(
    "  `" + API + "?format=text&COMMAND=%27\${command}%27&CENTER=%27\${center}%27&QUANTITIES=%27\${quantities}%27&OBJ_DATA=%27NO%27&CSV_FORMAT=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&ANG_FORMAT=%27DEG%27&TIME_TYPE=%27UT%27\${HORIZONS_TIMES}`;",
  );
  lines.push("");
  lines.push("const horizons = (target: string, quantity: string, time: string, url: string): Citation => ({");
  lines.push('  source: "jpl-horizons",');
  lines.push("  locator: `Observer table, \${target}, \${quantity}, \${time} UT`,");
  lines.push("  url,");
  lines.push("});");
  for (const table of TABLES) lines.push(`const ${table.constant} = HORIZONS_QUERY(${JSON.stringify(table.command)}, ${JSON.stringify(table.center)}, ${JSON.stringify(table.quantities)});`);
  lines.push("");
  lines.push("  sky: [");
  times.forEach((t, i) => {
    lines.push("    {");
    lines.push(`      time: at(${JSON.stringify(clockTime(t.micro - zero.micro))}, TIME_SOURCE),`);
    for (const table of TABLES) {
      const target = JSON.stringify(table.target);
      lines.push(`      ${table.key}: cite(${values[table.key][i]}, horizons(${target}, ${JSON.stringify(table.column)}, ${JSON.stringify(t.label)}, ${table.constant})),`);
    }
    lines.push("    },");
  });
  lines.push("  ],");
  console.log(lines.join("\n"));
}

main();
