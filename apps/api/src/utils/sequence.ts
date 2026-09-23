import type { Tx } from '../config/prisma';
import { istParts } from './time';

/**
 * Atomically increments a named counter and returns the new value.
 * The single-statement upsert takes a row lock, so concurrent callers get distinct values.
 */
export async function nextSequenceValue(tx: Tx, key: string): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ value: number }>>`
    INSERT INTO "sequence_counters" ("key", "value", "updatedAt")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET "value" = "sequence_counters"."value" + 1, "updatedAt" = NOW()
    RETURNING "value"
  `;
  return Number(rows[0].value);
}

export const SEQUENCE_FORMATS = {
  prescription: { prefix: 'RX', pad: 5 },
  order: { prefix: 'ORD', pad: 4 },
  appointment: { prefix: 'APT', pad: 5 },
  labBooking: { prefix: 'LAB', pad: 4 },
  transaction: { prefix: 'TXN', pad: 6 },
} as const;

export type SequenceName = keyof typeof SEQUENCE_FORMATS;

export function sequenceKey(name: SequenceName, year: number): string {
  return `${SEQUENCE_FORMATS[name].prefix}-${year}`;
}

export function formatSequence(name: SequenceName, year: number, value: number): string {
  const { prefix, pad } = SEQUENCE_FORMATS[name];
  return `${prefix}-${year}-${String(value).padStart(pad, '0')}`;
}

/** Next human-readable number, e.g. RX-2026-00125. */
export async function nextNumber(tx: Tx, name: SequenceName, now: Date = new Date()): Promise<string> {
  const { year } = istParts(now);
  const value = await nextSequenceValue(tx, sequenceKey(name, year));
  return formatSequence(name, year, value);
}
