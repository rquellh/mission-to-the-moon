/**
 * DEV ONLY: test flights for checking the 3D scene on the model page
 * (gallery.html?flight=...). Nothing in the site imports this file, and the
 * site's build (index.html) never includes it.
 *
 * The flights here are made from real missions' files with parts changed
 * for testing. Every value marked INVENTED is made up for the test and is
 * not a fact about any flight; it is never shown on the site.
 */
import { bundle as apollo11 } from '../../content/missions/apollo-11/index';
import { bundle as gemini8 } from '../../content/missions/gemini-8/index';
import type { MissionBundle } from '../../content/missions/bundle';
import type { Citation, Cited, ElapsedTime, Mission, MissionEvent } from '../../content/types';
import type { LeftBehind, VehicleChange, VehiclePart } from '../../content/vehicle-types';
import type { FlightPlan, Phase, ShipPlan } from '../../sim/types';

/** The mark on every invented value. */
const INVENTED = { source: 'dev-fixture', locator: 'INVENTED for a scene test; not a fact' } as unknown as Citation;

function invented<T>(value: T): Cited<T> {
  return { value, citations: [INVENTED] };
}

function clock(hours: number): ElapsedTime {
  const total = Math.round(hours * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` as ElapsedTime;
}

/** A bare event at a time (the scene reads only event times). */
function event(hours: number, index: number): MissionEvent {
  return {
    id: `dev-${index}`,
    title: `Test event ${index}`,
    chapter: 'dev',
    elapsed: clock(hours),
    text: { short: 'Test event' },
    citations: [INVENTED],
  } as unknown as MissionEvent;
}

/** A mission story with only what the scene reads: where it goes and when its events are. */
function story(id: string, destination: Mission['destination'], hours: readonly number[]): Mission {
  return { id, destination, events: hours.map(event) } as unknown as Mission;
}

const GEMINI: readonly VehiclePart[] = ['gemini-equipment-section', 'gemini-retro-section', 'gemini-reentry-module'];

function change(ship: string, at: Cited<ElapsedTime>, label: string, layout: VehicleChange['layout'], parts: readonly VehiclePart[], extra: Partial<VehicleChange> = {}): VehicleChange {
  return { ship, at, label, layout, parts, ...extra };
}

function ship(plan: FlightPlan, id: string): ShipPlan {
  const found = plan.ships.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No ship ${id}`);
  return found;
}

/**
 * Ten days in Earth orbit (INVENTED): Gemini 8's launch and first orbit,
 * with that orbit stretched to 240 hours, then a retrofire and an entry at
 * invented times and place. Events every 12 hours, so the story clock runs
 * many orbits a second. A spacewalk from 48 to 49 hours (INVENTED).
 */
function longOrbit(): MissionBundle {
  const plan = gemini8.flight;
  const crew = ship(plan, 'gemini');
  const [ascent, firstOrbit] = crew.phases;
  if (!ascent || !firstOrbit || firstOrbit.kind !== 'orbit') throw new Error('Unexpected Gemini 8 plan');
  const phases: [Phase, ...Phase[]] = [
    ascent,
    { ...firstOrbit, label: 'Ten days in orbit (INVENTED)', end: invented(clock(240)) },
    { kind: 'burn', label: 'Retrofire (INVENTED)', body: 'earth', start: invented(clock(240)), end: invented('240:00:30' as ElapsedTime) },
    {
      kind: 'entry',
      label: 'Entry (INVENTED)',
      start: invented('240:00:30' as ElapsedTime),
      end: invented('240:30:00' as ElapsedTime),
      splashdown: { latitude: invented(25.2), longitude: invented(-70.1) },
    },
  ];
  const flight: FlightPlan = { ...plan, missionId: 'dev-long-orbit', ships: [{ ...crew, phases }] };
  const hours = [0, 0.1, ...Array.from({ length: 20 }, (_, k) => 12 * (k + 1)), 48.5, 240.4];
  const vehicle: VehicleChange[] = [
    change('gemini', ascent.start, 'Lift-off', 'launch', ['titan-first-stage', 'titan-second-stage', ...GEMINI]),
    change('gemini', invented('000:02:35' as ElapsedTime), 'Staging', 'launch', ['titan-second-stage', ...GEMINI]),
    change('gemini', firstOrbit.start, 'In orbit', 'alone', GEMINI, { facing: 'forward' }),
    change('gemini', invented(clock(48)), 'Spacewalk (INVENTED)', 'alone', [...GEMINI, 'spacewalker'], { facing: 'forward' }),
    change('gemini', invented(clock(49)), 'Back inside (INVENTED)', 'alone', GEMINI, { facing: 'forward' }),
    change('gemini', invented('240:00:45' as ElapsedTime), 'Entry', 'alone', ['gemini-reentry-module']),
  ];
  return { mission: story('dev-long-orbit', 'earth-orbit', hours), flight, vehicle, leftBehind: [] };
}

/** The models a pair test can give its two ships. */
const PAIR_MODELS: Record<string, { launch: readonly VehiclePart[]; orbit: readonly VehiclePart[] }> = {
  gemini: { launch: ['titan-first-stage', 'titan-second-stage', ...GEMINI], orbit: GEMINI },
  agena: { launch: ['atlas', 'agena', 'agena-shroud'], orbit: ['agena'] },
  atda: { launch: ['atlas', 'atda', 'atda-shroud'], orbit: ['atda', 'atda-shroud'] },
  stage: {
    launch: ['saturn-ib-first-stage', 'third-stage', 'adapter', 'service-module', 'command-module', 'escape-tower'],
    orbit: ['third-stage', 'adapter'],
  },
  csm: {
    launch: ['saturn-ib-first-stage', 'third-stage', 'adapter', 'service-module', 'command-module', 'escape-tower'],
    orbit: ['service-module', 'command-module'],
  },
  lm: { launch: ['atlas', 'agena'], orbit: ['lm-descent-stage', 'lm-ascent-stage'] },
};

/**
 * Two ships keeping station (INVENTED): Gemini 8's flight with its docking
 * replaced by station keeping (the same times), and any two models for the
 * two ships, so the scene's drawing of a pair can be checked for every
 * pairing (Gemini and Gemini, Gemini and the ATDA, a command and service
 * module and its spent stage...). `facing` turns the main ship blunt end
 * first during the station keeping.
 */
function pair(mainModel: string, targetModel: string, facing: 'forward' | 'backward'): MissionBundle {
  const plan = gemini8.flight;
  const crew = ship(plan, 'gemini');
  const target = ship(plan, 'agena');
  const phases = crew.phases.map((phase): Phase =>
    phase.kind === 'docked' ? { kind: 'station', label: 'Station keeping (INVENTED)', start: phase.start, end: phase.end, target: phase.target } : phase,
  ) as [Phase, ...Phase[]];
  const flight: FlightPlan = { ...plan, missionId: 'dev-pair', ships: [{ ...crew, phases }, target] };
  const main = PAIR_MODELS[mainModel] ?? PAIR_MODELS['gemini']!;
  const other = PAIR_MODELS[targetModel] ?? PAIR_MODELS['agena']!;
  const crewOrbit = crew.phases[1]!;
  const station = crew.phases.find((phase) => phase.kind === 'rendezvous')!;
  const targetOrbit = target.phases[1]!;
  const vehicle: VehicleChange[] = [
    change('agena', target.phases[0].start, 'Target launch', 'launch', other.launch),
    change('agena', targetOrbit.start, 'Target in orbit', 'alone', other.orbit),
    change('gemini', crew.phases[0].start, 'Lift-off', 'launch', main.launch),
    change('gemini', crewOrbit.start, 'In orbit', 'alone', main.orbit),
    change('gemini', station.start, 'Closing in', 'alone', main.orbit, { facing }),
  ];
  return { mission: gemini8.mission, flight, vehicle, leftBehind: [] };
}

/** Apollo 11 with a rover parked at Tranquility Base from the first moonwalk on (INVENTED: Apollo 11 had no rover). */
function apollo11WithRover(): MissionBundle {
  const rover: LeftBehind = { part: 'lunar-rover', ship: 'lm', at: invented('109:30:00' as ElapsedTime), label: 'Rover parked (INVENTED)' };
  return { ...apollo11, leftBehind: [...apollo11.leftBehind, rover] };
}

/**
 * Apollo 11's flight with Apollo 13's way home (INVENTED times on Apollo
 * 11's plan): the lunar module stays docked after the rendezvous, the
 * service module is shown damaged from 150 hours, is cast off at Apollo
 * 11's CM/SM separation time, and the lunar module is cast off six minutes
 * later, before the parachutes.
 */
function apollo13Ending(): MissionBundle {
  const LM: readonly VehiclePart[] = ['lm-descent-stage', 'lm-ascent-stage'];
  const kept = apollo11.vehicle.filter((c) => c.ship !== 'csm' || elapsedSeconds(c.at.value) < 128 * 3600);
  const tail = apollo11.vehicle.filter((c) => c.ship === 'csm' && elapsedSeconds(c.at.value) > 195 * 3600);
  const separation = apollo11.vehicle.find((c) => c.ship === 'csm' && c.label.startsWith('Command module separates'))!;
  const vehicle: VehicleChange[] = [
    ...kept,
    change('csm', invented('128:03:00' as ElapsedTime), 'Docked all the way home (INVENTED)', 'docked', [...LM, 'service-module', 'command-module']),
    change('csm', invented(clock(150)), 'Service module damaged (INVENTED)', 'docked', [...LM, 'service-module-damaged', 'command-module']),
    change('csm', separation.at, 'Service module cast off (INVENTED)', 'docked', [...LM, 'command-module']),
    change('csm', invented('194:55:00' as ElapsedTime), 'Lunar module cast off (INVENTED)', 'alone', ['command-module']),
    ...tail,
  ];
  return { ...apollo11, vehicle, leftBehind: [] };
}

function elapsedSeconds(value: ElapsedTime): number {
  const [h = '0', m = '0', s = '0'] = value.replace('-', '').split(':');
  return (value.startsWith('-') ? -1 : 1) * (Number(h) * 3600 + Number(m) * 60 + Number(s));
}

/**
 * The fixtures by name, with what to pass: ?flight=long-orbit,
 * ?flight=apollo-13-ending,
 * ?flight=pair&main=gemini&target=atda (models: gemini, agena, atda, stage,
 * csm, lm; &facing=backward), ?flight=apollo-11, ?flight=apollo-11-rover,
 * ?flight=gemini-8.
 */
export function fixture(name: string, params: URLSearchParams): MissionBundle {
  switch (name) {
    case 'long-orbit':
      return longOrbit();
    case 'pair':
      return pair(params.get('main') ?? 'gemini', params.get('target') ?? 'agena', params.get('facing') === 'backward' ? 'backward' : 'forward');
    case 'apollo-11-rover':
      return apollo11WithRover();
    case 'apollo-13-ending':
      return apollo13Ending();
    case 'apollo-11':
      return apollo11;
    default:
      return gemini8;
  }
}
