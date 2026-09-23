import { useEffect, useMemo, useState } from 'react';
import type { ConsultationType, OrganizationScheduleWindowInput } from '@carebridge/shared';
import { Clock3 } from 'lucide-react';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationDoctors, useOrganizationSchedules, useReplaceOrganizationSchedule } from '@/hooks/use-organization-portal';
import { cn } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Draft = { enabled: boolean; startTime: string; endTime: string; slotDurationMinutes: number; consultationTypes: ConsultationType[] };
const blank = (): Draft => ({ enabled: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 20, consultationTypes: ['IN_PERSON'] });

export function OrganizationSchedulesPage() {
  const doctors = useOrganizationDoctors(); const schedules = useOrganizationSchedules(); const save = useReplaceOrganizationSchedule();
  const activeDoctors = useMemo(() => (doctors.data ?? []).filter((doctor) => doctor.isActive), [doctors.data]);
  const [doctorId, setDoctorId] = useState(''); const [drafts, setDrafts] = useState<Record<number, Draft>>({}); const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { if (!doctorId && activeDoctors[0]) setDoctorId(activeDoctors[0].doctorId); }, [activeDoctors, doctorId]);
  useEffect(() => { if (!doctorId || !schedules.data) return; const next: Record<number, Draft> = {}; for (let day = 0; day < 7; day++) { const row = schedules.data.find((item) => item.doctorId === doctorId && item.dayOfWeek === day); next[day] = row ? { enabled: true, startTime: row.startTime, endTime: row.endTime, slotDurationMinutes: row.slotDurationMinutes, consultationTypes: row.consultationTypes } : blank(); } setDrafts(next); setMessage(null); }, [doctorId, schedules.data]);
  function change(day: number, patch: Partial<Draft>) { setDrafts((value) => ({ ...value, [day]: { ...(value[day] ?? blank()), ...patch } })); setMessage(null); }
  async function submit() { const windows: OrganizationScheduleWindowInput[] = Object.entries(drafts).filter(([, value]) => value.enabled).map(([day, value]) => ({ dayOfWeek: Number(day), startTime: value.startTime, endTime: value.endTime, slotDurationMinutes: value.slotDurationMinutes, consultationTypes: value.consultationTypes })); try { await save.mutateAsync({ doctorId, windows }); setMessage('Schedule saved. New patient slots now use these hours.'); } catch (reason) { setMessage(reason instanceof ApiError ? reason.message : 'Could not save this schedule.'); } }
  if (doctors.isLoading || schedules.isLoading) return <Skeleton className="h-96" />;
  if (doctors.isError || schedules.isError) return <ErrorState message="We couldn't load organization schedules." onRetry={() => { doctors.refetch(); schedules.refetch(); }} />;
  return <div><PageHeader title="Schedules" subtitle="Manage each doctor’s recurring hours at this organization." />
    {!activeDoctors.length ? <EmptyState icon={Clock3} title="No active doctors" description="Associate or activate a doctor before creating schedules." /> : <><div className="mb-5 max-w-sm"><Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>{activeDoctors.map((doctor) => <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.name}</option>)}</Select></div><div className="rounded-2xl border bg-card p-5 shadow-sm"><div className="space-y-3">{DAYS.map((label, day) => { const draft = drafts[day] ?? blank(); return <div key={day} className={cn('rounded-xl border p-3', draft.enabled ? 'bg-background' : 'border-transparent bg-muted/50')}><div className="flex flex-wrap items-center gap-3"><label className="flex w-32 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.enabled} onChange={(e) => change(day, { enabled: e.target.checked })} /> {label}</label>{draft.enabled && <><Input type="time" className="h-9 w-28" value={draft.startTime} onChange={(e) => change(day, { startTime: e.target.value })} /><span className="text-sm text-muted-foreground">to</span><Input type="time" className="h-9 w-28" value={draft.endTime} onChange={(e) => change(day, { endTime: e.target.value })} /><Select className="h-9 w-32" value={draft.slotDurationMinutes} onChange={(e) => change(day, { slotDurationMinutes: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value} min</option>)}</Select></>}</div></div>; })}</div>{message && <p className={cn('mt-4 rounded-xl px-3 py-2 text-sm', message.startsWith('Schedule saved') ? 'bg-emerald-50 text-emerald-700' : 'bg-destructive/10 text-destructive')}>{message}</p>}<Button className="mt-5" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving…' : 'Save schedule'}</Button></div></>}
  </div>;
}
