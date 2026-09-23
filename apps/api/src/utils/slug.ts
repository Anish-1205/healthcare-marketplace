import { randomBytes } from 'node:crypto';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `base` if free, otherwise `base-<random>`. The unique index remains the final guard. */
export async function availableSlug(value: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const base = slugify(value) || 'item';
  if (!(await isTaken(base))) return base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${randomBytes(2).toString('hex')}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${base}-${randomBytes(4).toString('hex')}`;
}
