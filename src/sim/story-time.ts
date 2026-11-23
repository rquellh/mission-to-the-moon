/**
 * Story time: a watchable clock for the timeline. Mission time is mapped
 * piecewise-linearly onto story time so that each interval between
 * consecutive key times (for example, mission events) plays for a few
 * seconds when short and at most `maxSeconds` when days long. The map is
 * monotone, so it runs both ways.
 */

export interface StoryTimeOptions {
  /** Story length of a vanishingly short interval, seconds. Default 2. */
  minSeconds?: number;
  /** Story length of an interval of `longInterval` or more, seconds. Default 14. */
  maxSeconds?: number;
  /** Mission interval that gets the full `maxSeconds`, seconds. Default 3 days. */
  longInterval?: number;
  /** Mission interval where the growth turns from linear to logarithmic, seconds. Default 60. */
  knee?: number;
}

export interface StoryTime {
  /** Total story length, seconds. */
  readonly length: number;
  /** The key times actually used (sorted, duplicates removed). */
  readonly keyTimes: readonly number[];
  /** Story seconds for a mission time (clamped to the key-time range). */
  toStory(missionSeconds: number): number;
  /** Mission seconds for a story time (clamped to [0, length]). */
  toMission(storySeconds: number): number;
}

/** Story length of one mission interval, seconds. */
export function storyIntervalLength(interval: number, options: StoryTimeOptions = {}): number {
  const min = options.minSeconds ?? 2;
  const max = options.maxSeconds ?? 14;
  const long = options.longInterval ?? 3 * 86_400;
  const knee = options.knee ?? 60;
  if (interval <= 0) return 0;
  const grow = Math.log1p(interval / knee) / Math.log1p(long / knee);
  return Math.min(max, min + (max - min) * grow);
}

/** Builds a story clock from any list of mission times (sorted or not). */
export function createStoryTime(
  times: readonly number[],
  options: StoryTimeOptions = {},
): StoryTime {
  const keys = [...new Set(times.filter((t) => Number.isFinite(t)))].sort((a, b) => a - b);
  const story: number[] = [0];
  for (let i = 1; i < keys.length; i++) {
    story.push(story[i - 1]! + storyIntervalLength(keys[i]! - keys[i - 1]!, options));
  }
  const length = story[story.length - 1] ?? 0;

  function locate(values: number[], x: number): number {
    // Index i with values[i] <= x < values[i + 1], clamped to a valid interval.
    let lo = 0;
    let hi = values.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (values[mid]! <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  return {
    length,
    keyTimes: keys,
    toStory(missionSeconds) {
      if (keys.length < 2) return 0;
      const t = Math.min(keys[keys.length - 1]!, Math.max(keys[0]!, missionSeconds));
      const i = locate(keys, t);
      const u = (t - keys[i]!) / (keys[i + 1]! - keys[i]!);
      return story[i]! + u * (story[i + 1]! - story[i]!);
    },
    toMission(storySeconds) {
      if (keys.length === 0) return 0;
      if (keys.length === 1) return keys[0]!;
      const s = Math.min(length, Math.max(0, storySeconds));
      const i = locate(story, s);
      const u = (s - story[i]!) / (story[i + 1]! - story[i]!);
      return keys[i]! + u * (keys[i + 1]! - keys[i]!);
    },
  };
}
