import type { AvailableSlot } from '@carebridge/shared';
import { prisma } from '../config/prisma';
import { addMinutes, istDate, istDateTime, istParts } from '../utils/time';

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

interface DoctorScheduleData {
  windows: Array<{
    organizationId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStartTime: string | null;
    breakEndTime: string | null;
    slotDurationMinutes: number;
    consultationTypes: string[];
  }>;
  blockedDates: Set<string>;
  bookedStarts: Set<string>; // `${organizationId ?? 'null'}|${epochMillis}`
  organizationNames: Map<string, string>;
}

/**
 * Loads everything needed to lay out slots for the IST days `fromOffset`..`toOffset`.
 *
 * Blocked dates are DATE values, so they compare against calendar dates; appointments are
 * timestamps, so they need the instants that bound those IST days — using the DATE values for
 * both would collapse a single-day query into one instant and miss every booking.
 */
async function loadSchedule(doctorId: string, fromOffset: number, toOffset: number, now: Date): Promise<DoctorScheduleData> {
  const [availability, blocked, appointments, orgLinks] = await Promise.all([
    prisma.doctorAvailability.findMany({ where: { doctorId, isActive: true } }),
    prisma.doctorBlockedDate.findMany({ where: { doctorId, date: { gte: istDate(fromOffset, now), lte: istDate(toOffset, now) } } }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: { not: 'CANCELLED' },
        scheduledStart: { gte: istDateTime(fromOffset, '00:00', now), lt: istDateTime(toOffset + 1, '00:00', now) },
      },
      select: { scheduledStart: true },
    }),
    prisma.doctorOrganization.findMany({ where: { doctorId, isActive: true }, include: { organization: { select: { id: true, name: true } } } }),
  ]);

  const organizationNames = new Map(orgLinks.map((link) => [link.organizationId, link.organization.name]));

  return {
    windows: availability.map((window) => ({
      organizationId: window.organizationId,
      dayOfWeek: window.dayOfWeek,
      startTime: window.startTime,
      endTime: window.endTime,
      breakStartTime: window.breakStartTime,
      breakEndTime: window.breakEndTime,
      slotDurationMinutes: window.slotDurationMinutes,
      consultationTypes: window.consultationTypes,
    })),
    blockedDates: new Set(blocked.map((b) => dateKey(b.date))),
    bookedStarts: new Set(appointments.map((a) => String(a.scheduledStart.getTime()))),
    organizationNames,
  };
}

function slotsForDay(schedule: DoctorScheduleData, dayOffset: number, now: Date): AvailableSlot[] {
  const dateForOffset = istDate(dayOffset, now);
  if (schedule.blockedDates.has(dateKey(dateForOffset))) return [];

  const { dayOfWeek } = istParts(istDateTime(dayOffset, '12:00', now));
  const slots: AvailableSlot[] = [];

  for (const window of schedule.windows.filter((w) => w.dayOfWeek === dayOfWeek)) {
    const duration = window.slotDurationMinutes;
    const end = toMinutes(window.endTime);
    for (let t = toMinutes(window.startTime); t + duration <= end; t += duration) {
      if (
        window.breakStartTime &&
        window.breakEndTime &&
        t < toMinutes(window.breakEndTime) &&
        t + duration > toMinutes(window.breakStartTime)
      ) {
        continue;
      }
      const start = istDateTime(dayOffset, fromMinutes(t), now);
      if (start.getTime() <= now.getTime()) continue;
      if (schedule.bookedStarts.has(String(start.getTime()))) continue;

      slots.push({
        start: start.toISOString(),
        end: addMinutes(start, duration).toISOString(),
        organizationId: window.organizationId,
        organizationName: window.organizationId ? (schedule.organizationNames.get(window.organizationId) ?? 'Clinic') : 'Online consultation',
        consultationTypes: window.consultationTypes as AvailableSlot['consultationTypes'],
      });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/** Available slots for one calendar day (IST), grouped implicitly by returning a flat, sorted list. */
export async function getSlotsForDate(doctorId: string, date: Date, now: Date = new Date()): Promise<AvailableSlot[]> {
  const dayOffset = Math.round((istDate(0, date).getTime() - istDate(0, now).getTime()) / 86_400_000);
  const schedule = await loadSchedule(doctorId, dayOffset, dayOffset, now);
  return slotsForDay(schedule, dayOffset, now);
}

/** The soonest available slot within the next `withinDays` days, or null if fully booked/blocked. */
export async function getNextAvailableSlot(doctorId: string, withinDays = 14, now: Date = new Date()): Promise<AvailableSlot | null> {
  const schedule = await loadSchedule(doctorId, 0, withinDays, now);
  for (let offset = 0; offset <= withinDays; offset++) {
    const slots = slotsForDay(schedule, offset, now);
    if (slots.length) return slots[0];
  }
  return null;
}

/** Batch version for list pages — one query set per doctor, run concurrently. */
export async function getNextAvailableSlots(doctorIds: string[], withinDays = 14, now: Date = new Date()): Promise<Map<string, AvailableSlot | null>> {
  const entries = await Promise.all(doctorIds.map(async (id) => [id, await getNextAvailableSlot(id, withinDays, now)] as const));
  return new Map(entries);
}
