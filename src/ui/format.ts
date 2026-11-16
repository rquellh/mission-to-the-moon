import { elapsedToSeconds, type Mission } from '../content/types';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Mission elapsed time as hours:minutes:seconds, for example "102:45:39".
 * Seconds are cut, not rounded, so the clock never runs ahead of an event.
 */
export function formatElapsed(seconds: number): string {
  const whole = Math.floor(Math.abs(seconds) + 1e-6);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const sign = seconds < 0 && whole > 0 ? '−' : '';
  return `${sign}${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/** The same time read out in words, for screen readers. */
export function speakElapsed(seconds: number): string {
  const whole = Math.floor(Math.abs(seconds) + 1e-6);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (whole < 60) return seconds < 0 ? 'just before liftoff' : 'at liftoff';
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  return `${parts.join(' ')} ${seconds < 0 ? 'before' : 'after'} liftoff`;
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
  if (!mission.launch) return '';
  const start = new Date(mission.launch.value.utc);
  if (Number.isNaN(start.getTime())) return '';
  if (!mission.duration) return formatDate(start);
  const end = new Date(start.getTime() + elapsedToSeconds(mission.duration.value) * 1000);

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
