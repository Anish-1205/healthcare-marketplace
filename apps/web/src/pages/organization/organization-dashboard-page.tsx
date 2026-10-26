import { BarChart3, CalendarDays, CircleDollarSign, Stethoscope, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentStatusBadge } from '@/components/appointment-status-badge';
import { EmptyState } from '@/components/empty-state';
import { CHART_COLORS, StatCard, TrendAreaChart } from '@/components/charts';
import { Stagger } from '@/components/motion';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationDashboard } from '@/hooks/use-organization-portal';
import { formatCurrency } from '@/lib/utils';

export function OrganizationDashboardPage() {
  const query = useOrganizationDashboard();
  if (query.isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (query.isError || !query.data) return <ErrorState message="We couldn't load the organization dashboard." onRetry={() => query.refetch()} />;
  const data = query.data;
  const stats = [
    ['Today’s appointments', data.stats.todayAppointments, CalendarDays, 'bg-sky-100 text-sky-700'],
    ['Active doctors', data.stats.activeDoctors, Stethoscope, 'bg-teal-100 text-teal-700'],
    ['Total patients', data.stats.totalPatients, UserRound, 'bg-violet-100 text-violet-700'],
    ['Completed visits', data.stats.completedConsultations, BarChart3, 'bg-emerald-100 text-emerald-700'],
    ['Revenue', data.stats.revenue, CircleDollarSign, 'bg-amber-100 text-amber-700', formatCurrency],
  ] as const;
  return <div className="space-y-6">
    <PageHeader title={`Welcome to ${data.organization.name}`} subtitle="A live view of today’s operations and overall performance." />
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{stats.map(([label, value, Icon, colors, format]) => <StatCard key={label} label={label} value={value} icon={Icon} tone={colors} format={format} />)}</Stagger>
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Today’s appointments</CardTitle><p className="mt-1 text-sm text-muted-foreground">Patients expected across your care team</p></div><Link to="/organization/appointments" className="text-sm font-semibold text-primary hover:underline">View all</Link></CardHeader><CardContent>
        {!data.todayAppointments.length ? <EmptyState icon={CalendarDays} title="No appointments today" /> : <div className="divide-y">{data.todayAppointments.map((item) => <Link to={`/organization/appointments/${item.id}`} key={item.id} className="flex flex-wrap items-center gap-3 py-3 interactive-row"><time className="w-20 text-sm font-semibold">{new Date(item.scheduledStart).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })}</time><div className="min-w-[12rem] flex-1"><p className="font-semibold">{item.patientName}</p><p className="text-xs text-muted-foreground">{item.doctorName} · {item.appointmentNumber}</p></div><AppointmentStatusBadge status={item.status} /></Link>)}</div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Doctor availability</CardTitle></CardHeader><CardContent className="space-y-3">{data.doctorAvailability.map((doctor) => <div key={doctor.doctorId} className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{doctor.doctorName}</p><p className="text-xs text-muted-foreground">{doctor.hours ?? 'No clinic hours today'}</p></div><Badge variant={doctor.status === 'AVAILABLE' ? 'success' : 'muted'}>{doctor.status === 'AVAILABLE' ? 'Available' : 'Off duty'}</Badge></div>)}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Appointment trend</CardTitle><p className="text-sm text-muted-foreground">Last seven days</p></CardHeader><CardContent><TrendAreaChart data={data.appointmentTrend} xKey="label" series={[{ key: 'total', label: 'Appointments', color: CHART_COLORS.primary }]} height={220} /></CardContent></Card>
  </div>;
}
