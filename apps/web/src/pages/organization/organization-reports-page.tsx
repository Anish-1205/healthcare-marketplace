import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationReport } from '@/hooks/use-organization-portal';
import { formatCurrency } from '@/lib/utils';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export function OrganizationReportsPage() {
  const now = new Date(); const [from, setFrom] = useState(isoDate(new Date(now.getTime() - 29 * 86_400_000))); const [to, setTo] = useState(isoDate(now)); const query = useOrganizationReport(from, to);
  if (query.isLoading) return <Skeleton className="h-96" />;
  if (query.isError || !query.data) return <ErrorState message="We couldn't generate this report." onRetry={() => query.refetch()} />;
  const data = query.data; const values = [['Appointments', data.totals.appointments], ['Completed', data.totals.completed], ['Cancelled', data.totals.cancelled], ['No-shows', data.totals.noShows], ['Revenue', formatCurrency(data.totals.revenue)]] as const;
  return <div className="space-y-6"><PageHeader title="Reports" subtitle="Appointment activity, revenue, and doctor performance." action={<div className="flex gap-2"><div><Label className="sr-only">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><Label className="sr-only">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{values.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Daily activity</CardTitle></CardHeader><CardContent>{!data.appointmentTrend.length ? <p className="text-sm text-muted-foreground">No appointments in this period.</p> : <div className="space-y-2">{data.appointmentTrend.map((row) => <div key={row.label} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm"><span className="text-muted-foreground">{row.label}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, row.total / Math.max(...data.appointmentTrend.map((item) => item.total)) * 100)}%` }} /></div><span className="font-semibold">{row.total}</span></div>)}</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Doctor performance</CardTitle></CardHeader><CardContent><div className="divide-y">{data.doctorPerformance.map((doctor) => <div key={doctor.doctorId} className="grid grid-cols-[1fr_auto] gap-4 py-3"><div><p className="text-sm font-semibold">{doctor.doctorName}</p><p className="text-xs text-muted-foreground">{doctor.completed} completed of {doctor.appointments}</p></div><p className="text-sm font-semibold text-primary">{formatCurrency(doctor.revenue)}</p></div>)}</div></CardContent></Card></div>
  </div>;
}
