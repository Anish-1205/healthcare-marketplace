/**
 * The demo platform operates in India Standard Time (UTC+05:30, no DST).
 * Timestamps are stored in UTC; these helpers build and read IST wall-clock times
 * so behaviour does not depend on the server's local timezone.
 */
export const PLATFORM_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 330 * 60 * 1000;

export interface IstParts {
  year: number;
  month: number; // 0-based
  day: number;
  dayOfWeek: number; // 0 = Sunday
  hours: number;
  minutes: number;
}

export function istParts(date: Date): IstParts {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** Instant for an IST wall-clock time ("HH:mm") `dayOffset` days from `base`'s IST date. */
export function istDateTime(dayOffset: number, time: string, base: Date = new Date()): Date {
  const { year, month, day } = istParts(base);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month, day + dayOffset, hh, mm) - IST_OFFSET_MS);
}

/** Value for a Postgres DATE column representing the IST calendar date `dayOffset` days from `base`. */
export function istDate(dayOffset: number, base: Date = new Date()): Date {
  const { year, month, day } = istParts(base);
  return new Date(Date.UTC(year, month, day + dayOffset));
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
