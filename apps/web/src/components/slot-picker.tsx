import { useState } from 'react';
import type { AvailableSlot, ConsultationType } from '@carebridge/shared';
import { Monitor, Phone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TYPE_META: Record<ConsultationType, { label: string; icon: typeof User }> = {
  IN_PERSON: { label: 'In Person', icon: User },
  VIDEO: { label: 'Video', icon: Monitor },
  PHONE: { label: 'Phone', icon: Phone },
};

function nextDays(count: number) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    days.push(date);
  }
  return days;
}

export function SlotPicker({
  consultationTypes,
  selectedDate,
  onSelectDate,
  slots,
  isLoading,
  isError = false,
  onRetry,
  selectedSlot,
  onSelectSlot,
}: {
  consultationTypes: ConsultationType[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  slots: AvailableSlot[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  selectedSlot: AvailableSlot | null;
  onSelectSlot: (slot: AvailableSlot) => void;
}) {
  const [type, setType] = useState<ConsultationType>(consultationTypes[0]);
  const days = nextDays(14);
  const filteredSlots = slots?.filter((slot) => slot.consultationTypes.includes(type));

  return (
    <div>
      {consultationTypes.length > 1 && (
        <div className="mb-4 flex gap-2">
          {consultationTypes.map((t) => {
            const meta = TYPE_META[t];
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium', type === t ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground interactive-row')}
              >
                <meta.icon className="h-4 w-4" /> {meta.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {days.map((date) => {
          const iso = date.toLocaleDateString('en-CA');
          const isSelected = iso === selectedDate;
          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              className={cn('flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2.5', isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border interactive-row')}
            >
              <span className="text-[11px] font-medium uppercase opacity-80">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="text-base font-bold">{date.getDate()}</span>
              <span className="text-[10px] opacity-80">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-center text-sm text-muted-foreground">
          <p>We couldn't load available times.</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      ) : !filteredSlots?.length ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">No available slots on this date. Try another day.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filteredSlots.map((slot) => {
            const time = new Date(slot.start).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
            const isSelected = selectedSlot?.start === slot.start;
            return (
              <button
                key={slot.start}
                onClick={() => onSelectSlot({ ...slot, consultationTypes: [type] })}
                className={cn('rounded-xl border px-2 py-2.5 text-sm font-medium', isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border interactive-row')}
              >
                {time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
