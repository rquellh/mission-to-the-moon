import { copy } from '../content/copy';
import { elapsedToSeconds, type ElapsedTime, type Mission, type MissionSummary } from '../content/types';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * The whole second the mission clock shows. The fraction is cut off, toward
 * liftoff, the way the sources print times: "-001:40:59.262" reads
 * −01:40:59. Less than a second before liftoff reads 00:00:00.
 */
function clockSecond(seconds: number): number {
  const size = Math.floor(Math.abs(seconds) + 1e-6);
  return seconds < 0 ? -size : size;
}

/** True when the clock reads a time before liftoff. */
export function isBeforeLiftoff(seconds: number): boolean {
  return clockSecond(seconds) < 0;
}

/**
 * Mission elapsed time as hours:minutes:seconds, for example "102:45:39",
 * with a minus sign before liftoff: "−01:40:59".
 */
export function formatElapsed(seconds: number): string {
  const whole = clockSecond(seconds);
  const size = Math.abs(whole);
  const hours = Math.floor(size / 3600);
  const minutes = Math.floor((size % 3600) / 60);
  const secs = size % 60;
  return `${whole < 0 ? '−' : ''}${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/** The same time read out in words, for screen readers. */
export function speakElapsed(seconds: number): string {
  const whole = clockSecond(seconds);
  const before = whole < 0;
  const size = Math.abs(whole);
  if (size < 60) return before ? copy.time.justBeforeLiftoff : copy.time.atLiftoff;
  const hours = Math.floor(size / 3600);
  const minutes = Math.floor((size % 3600) / 60);
  const parts: string[] = [];
  if (hours) parts.push(copy.time.hours(hours));
  // "1 hour", not "1 hour 0 minutes".
  if (minutes || !hours) parts.push(copy.time.minutes(minutes));
  return copy.time.fromLiftoff(parts.join(' '), before);
}

/** Flights longer than this show the day of the flight beside the clock. */
const DAY_COUNT_FROM_SECONDS = 48 * 3600;

/** True when a flight is long enough that the day of the flight helps more than the hours alone. */
export function countsDays(durationSeconds: number): boolean {
  return durationSeconds > DAY_COUNT_FROM_SECONDS;
}

/**
 * The day of the flight the clock is in: day 1 is the first 24 hours after
 * liftoff. Null before liftoff, when there is no flight day yet.
 */
export function flightDay(seconds: number): number | null {
  const whole = clockSecond(seconds);
  return whole < 0 ? null : Math.floor(whole / 86400) + 1;
}

/** The time read out in words, with the day of the flight when `withDay` is true. */
export function speakMissionTime(seconds: number, withDay: boolean): string {
  const spoken = speakElapsed(seconds);
  const day = withDay ? flightDay(seconds) : null;
  return day === null ? spoken : `${spoken}, ${copy.time.onDay(day)}`;
}

const longDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const shortDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const timeOfDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** "July 20, 1969" or "Jul 20, 1969", in UTC. */
export function formatDate(date: Date, style: 'long' | 'short' = 'long'): string {
  return (style === 'long' ? longDate : shortDate).format(date);
}

const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

/** "Jul 20", in UTC. */
export function formatMonthDay(date: Date): string {
  return monthDay.format(date);
}

/** "20:17:39", in UTC. */
export function formatTimeOfDay(date: Date): string {
  return timeOfDay.format(date);
}

/** "July 20, 1969, 20:17:39 UTC". */
export function formatUtc(date: Date, style: 'long' | 'short' = 'long'): string {
  return `${formatDate(date, style)}, ${formatTimeOfDay(date)} UTC`;
}

/** The mission's dates, for example "July 16–24, 1969". Empty without a launch time. */
export function missionDates(mission: Mission): string {
  return datesFrom(mission.launch?.value.utc, mission.duration?.value);
}

/** The dates a summary covers: a flight's from launch to splashdown, a memorial's one day. */
export function summaryDates(summary: MissionSummary): string {
  return datesFrom(summary.date, summary.kind === 'flight' ? summary.duration : undefined);
}

/** The year of an ISO 8601 date, in UTC, or null when it does not read as a date. */
export function yearOf(iso: string): number | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

/** "1965–1966", or "1969" for one year. */
export function formatYears(first: number, last: number): string {
  return first === last ? String(first) : `${first}–${last}`;
}

/** Dates from a start time and a length on the mission clock. */
function datesFrom(utc: string | undefined, duration: ElapsedTime | undefined): string {
  if (!utc) return '';
  const start = new Date(utc);
  if (Number.isNaN(start.getTime())) return '';
  if (!duration) return formatDate(start);
  const end = new Date(start.getTime() + elapsedToSeconds(duration) * 1000);

  const month = (d: Date): string => d.toLocaleString('en-US', { timeZone: 'UTC', month: 'long' });
  const day = (d: Date): number => d.getUTCDate();
  const year = (d: Date): number => d.getUTCFullYear();
  if (year(start) !== year(end)) return `${formatDate(start)} – ${formatDate(end)}`;
  if (month(start) !== month(end)) {
    return `${month(start)} ${day(start)} – ${month(end)} ${day(end)}, ${year(end)}`;
  }
  if (day(start) === day(end)) return formatDate(start);
  return `${month(start)} ${day(start)}–${day(end)}, ${year(end)}`;
}

/** "2026-11-15" as "November 15, 2026". */
export function formatIsoDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : formatDate(date);
}
