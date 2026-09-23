import { useEffect, useState } from 'react';
import type { ConsultationType, DoctorAvailabilityWindowInput } from '@carebridge/shared';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/api/client';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddBlockedDate, useDoctorAvailability, useDoctorProfile, useRemoveBlockedDate, useReplaceDoctorAvailability } from '@/hooks/use-doctor-portal';
import { CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

interface WindowDraft {
  enabled: boolean;
  startTime: string;
  endTime: string;
  hasBreak: boolean;
  breakStartTime: string;
  breakEndTime: string;
  slotDurationMinutes: number;
  consultationTypes: ConsultationType[];
}

const emptyDraft = (defaults: { slotDurationMinutes: number; consultationTypes: ConsultationType[] }): WindowDraft => ({
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
  hasBreak: false,
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  slotDurationMinutes: defaults.slotDurationMinutes,
  consultationTypes: defaults.consultationTypes,
});

type ScheduleState = Record<string, Record<number, WindowDraft>>;

export function DoctorAvailabilityPage() {
  const profile = useDoctorProfile();
  const availability = useDoctorAvailability();
  const replaceAvailability = useReplaceDoctorAvailability();
  const addBlockedDate = useAddBlockedDate();
  const removeBlockedDate = useRemoveBlockedDate();

  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [activeContext, setActiveContext] = useState<string>('independent');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [blockedError, setBlockedError] = useState<string | null>(null);

  // Seed the editable draft from the server exactly once per fetch, so edits aren't clobbered by refetches.
  useEffect(() => {
    if (!availability.data || !profile.data) return;
    const defaults = { slotDurationMinutes: profile.data.slotDurationMinutes, consultationTypes: profile.data.consultationTypes };
    const next: ScheduleState = {};
    for (const window of availability.data.windows) {
      const key = window.organizationId ?? 'independent';
      next[key] = next[key] ?? {};
      next[key][window.dayOfWeek] = {
        enabled: true,
        startTime: window.startTime,
        endTime: window.endTime,
        hasBreak: Boolean(window.breakStartTime && window.breakEndTime),
        breakStartTime: window.breakStartTime ?? '13:00',
        breakEndTime: window.breakEndTime ?? '14:00',
        slotDurationMinutes: window.slotDurationMinutes,
        consultationTypes: window.consultationTypes,
      };
    }
    setSchedule(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability.data, profile.data]);

  if (profile.isLoading || availability.isLoading) return <Skeleton className="h-96 w-full" />;
  if (profile.isError || availability.isError || !profile.data || !availability.data) {
    return <ErrorState message="We couldn't load your availability." onRetry={() => { profile.refetch(); availability.refetch(); }} />;
  }

  const contexts = [
    { key: 'independent', organizationId: null as string | null, label: 'Independent / Online' },
    ...profile.data.organizations.map((org) => ({ key: org.organizationId, organizationId: org.organizationId, label: org.organizationName })),
  ];

  function draftFor(contextKey: string, dayOfWeek: number): WindowDraft {
    return schedule[contextKey]?.[dayOfWeek] ?? emptyDraft({ slotDurationMinutes: profile.data!.slotDurationMinutes, consultationTypes: profile.data!.consultationTypes });
  }

  function updateDraft(contextKey: string, dayOfWeek: number, patch: Partial<WindowDraft>) {
    setSaved(false);
    setSchedule((prev) => ({
      ...prev,
      [contextKey]: { ...prev[contextKey], [dayOfWeek]: { ...draftFor(contextKey, dayOfWeek), ...patch } },
    }));
  }

  function toggleConsultationType(contextKey: string, dayOfWeek: number, type: ConsultationType) {
    const draft = draftFor(contextKey, dayOfWeek);
    const has = draft.consultationTypes.includes(type);
    if (has && draft.consultationTypes.length === 1) return; // keep at least one type selected
    updateDraft(contextKey, dayOfWeek, { consultationTypes: has ? draft.consultationTypes.filter((t) => t !== type) : [...draft.consultationTypes, type] });
  }

  async function handleSave() {
    setSaveError(null);
    setSaved(false);
    const windows: DoctorAvailabilityWindowInput[] = [];
    for (const context of contexts) {
      const days = schedule[context.key] ?? {};
      for (const [dayOfWeek, draft] of Object.entries(days)) {
        if (!draft.enabled) continue;
        windows.push({
          organizationId: context.organizationId,
          dayOfWeek: Number(dayOfWeek),
          startTime: draft.startTime,
          endTime: draft.endTime,
          breakStartTime: draft.hasBreak ? draft.breakStartTime : null,
          breakEndTime: draft.hasBreak ? draft.breakEndTime : null,
          slotDurationMinutes: draft.slotDurationMinutes,
          consultationTypes: draft.consultationTypes,
        });
      }
    }
    try {
      await replaceAvailability.mutateAsync(windows);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : 'We could not save your availability.');
    }
  }

  async function submitBlockedDate() {
    setBlockedError(null);
    if (!blockedDate) return;
    try {
      await addBlockedDate.mutateAsync({ date: blockedDate, reason: blockedReason.trim() || undefined });
      setBlockedDate('');
      setBlockedReason('');
    } catch (error) {
      setBlockedError(error instanceof ApiError ? error.message : 'We could not block that date.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Availability" subtitle="Set your weekly working hours, breaks and slot length per clinic." />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {contexts.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-4">
            {contexts.map((context) => (
              <button
                key={context.key}
                onClick={() => setActiveContext(context.key)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                  activeContext === context.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {context.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {WEEKDAYS.map((label, dayOfWeek) => {
            const context = contexts.find((c) => c.key === activeContext) ?? contexts[0];
            const draft = draftFor(context.key, dayOfWeek);
            return (
              <div key={dayOfWeek} className={cn('rounded-xl border p-3.5', draft.enabled ? 'border-border bg-background' : 'border-transparent bg-muted/40')}>
                <div className="flex items-center gap-3">
                  <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-semibold text-foreground">
                    <input type="checkbox" checked={draft.enabled} onChange={(e) => updateDraft(context.key, dayOfWeek, { enabled: e.target.checked })} className="h-4 w-4 rounded border-input" />
                    {label}
                  </label>

                  {draft.enabled && (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input type="time" value={draft.startTime} onChange={(e) => updateDraft(context.key, dayOfWeek, { startTime: e.target.value })} className="h-9 w-28" />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input type="time" value={draft.endTime} onChange={(e) => updateDraft(context.key, dayOfWeek, { endTime: e.target.value })} className="h-9 w-28" />

                      <Select value={draft.slotDurationMinutes} onChange={(e) => updateDraft(context.key, dayOfWeek, { slotDurationMinutes: Number(e.target.value) })} className="h-9 w-auto">
                        {SLOT_DURATIONS.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} min slots
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </div>

                {draft.enabled && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 pl-[8.75rem]">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input type="checkbox" checked={draft.hasBreak} onChange={(e) => updateDraft(context.key, dayOfWeek, { hasBreak: e.target.checked })} className="h-3.5 w-3.5 rounded border-input" />
                      Break
                    </label>
                    {draft.hasBreak && (
                      <div className="flex items-center gap-2">
                        <Input type="time" value={draft.breakStartTime} onChange={(e) => updateDraft(context.key, dayOfWeek, { breakStartTime: e.target.value })} className="h-8 w-24 text-xs" />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input type="time" value={draft.breakEndTime} onChange={(e) => updateDraft(context.key, dayOfWeek, { breakEndTime: e.target.value })} className="h-8 w-24 text-xs" />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {profile.data!.consultationTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleConsultationType(context.key, dayOfWeek, type)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs font-medium',
                            draft.consultationTypes.includes(type) ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground',
                          )}
                        >
                          {CONSULTATION_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {saveError && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>}
        {saved && !saveError && <p className="mt-4 rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">Availability saved.</p>}

        <Button className="mt-5" disabled={replaceAvailability.isPending} onClick={handleSave}>
          {replaceAvailability.isPending ? 'Saving…' : 'Save availability'}
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarOff className="h-4.5 w-4.5" /> Blocked dates
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Days you're unavailable — leave, conferences, personal time.</p>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="blocked-date">Date</Label>
            <Input id="blocked-date" type="date" value={blockedDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setBlockedDate(e.target.value)} className="mt-1 w-44" />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <Label htmlFor="blocked-reason">Reason (optional)</Label>
            <Input id="blocked-reason" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="e.g. Medical conference" className="mt-1" />
          </div>
          <Button variant="outline" disabled={!blockedDate || addBlockedDate.isPending} onClick={submitBlockedDate}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {blockedError && <p className="mt-3 text-sm text-destructive">{blockedError}</p>}

        {availability.data.blockedDates.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {availability.data.blockedDates.map((blocked) => (
              <span key={blocked.id} className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-sm">
                {new Date(`${blocked.date}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}
                {blocked.reason && <span className="text-muted-foreground">· {blocked.reason}</span>}
                <button onClick={() => removeBlockedDate.mutate(blocked.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove blocked date">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
