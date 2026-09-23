import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes, letting later classes override earlier ones (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDistance(km: number | null): string | null {
  if (km === null) return null;
  return `${km.toFixed(1)} km`;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatSlotLabel(iso: string, referenceNow: Date = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const today = dayKey(referenceNow);
  const tomorrow = dayKey(new Date(referenceNow.getTime() + 86_400_000));
  const target = dayKey(date);

  if (target === today) return `Today, ${time}`;
  if (target === tomorrow) return `Tomorrow, ${time}`;
  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  const dayMonth = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
  return `${weekday}, ${dayMonth}, ${time}`;
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Stable pastel avatar background chosen from a name, so the same person always gets the same color. */
const AVATAR_HUES = [189, 152, 340, 258, 32, 205];
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[hash % AVATAR_HUES.length];
}
