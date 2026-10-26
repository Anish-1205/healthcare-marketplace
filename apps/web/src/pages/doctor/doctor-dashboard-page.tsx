import { CalendarClock, CheckCircle2, ClipboardList, FileWarning, Hourglass, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DoctorAppointmentRow } from '@/components/doctor/doctor-appointment-row';
import { CountUp, Stagger, StaggerItem } from '@/components/motion';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Avatar } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-auth';
import { useDoctorDashboard } from '@/hooks/use-doctor-portal';
import { cn } from '@/lib/utils';

function greeting(): string {
  const hour = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  const h = Number(hour);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type StatTone = 'primary' | 'secondary' | 'accent' | 'warning' | 'destructive' | 'muted';

function StatTile({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: StatTone }) {
  const toneClasses: Record<StatTone, string> = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent text-accent-foreground',
    warning: 'bg-amber-100 text-amber-700',
    destructive: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <StaggerItem>
      <div className="group h-full rounded-2xl border border-border/70 bg-card p-4 shadow-soft interactive-card">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <p className="mt-3 text-2xl font-extrabold tabular-nums text-foreground"><CountUp value={value} /></p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </StaggerItem>
  );
}

export function DoctorDashboardPage() {
  const user = useCurrentUser();
  const { data, isLoading, isError, refetch } = useDoctorDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState message="We couldn't load your dashboard." onRetry={() => refetch()} />;
  }

  const { stats, todaySchedule, upcomingAppointments, recentPatients } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-normal text-foreground sm:text-4xl">
          {greeting()}, Dr. {user?.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile icon={CalendarClock} label="Today's Appointments" value={stats.todayAppointments} tone="primary" />
        <StatTile icon={Hourglass} label="Upcoming" value={stats.upcomingAppointments} tone="secondary" />
        <StatTile icon={Users} label="Waiting Patients" value={stats.waitingPatients} tone="warning" />
        <StatTile icon={CheckCircle2} label="Completed Today" value={stats.completedConsultationsToday} tone="accent" />
        <StatTile icon={ClipboardList} label="Total Patients" value={stats.totalPatients} tone="muted" />
        <StatTile icon={FileWarning} label="Pending Notes" value={stats.pendingNotes} tone="destructive" />
      </Stagger>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Today's Schedule</h2>
            <Link to="/doctor/appointments" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {todaySchedule.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No appointments today" description="Enjoy the quiet — new bookings will show up here." />
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((appointment) => (
                <DoctorAppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Appointments</h2>
          </div>
          {upcomingAppointments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">Nothing else on the books yet.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <DoctorAppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Patients</h2>
            <Link to="/doctor/patients" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">No patients yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPatients.map((patient) => (
                <Link
                  key={patient.patientId}
                  to={`/doctor/patients/${patient.patientId}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft interactive-card"
                >
                  <Avatar firstName={patient.name.split(' ')[0]} lastName={patient.name.split(' ').slice(1).join(' ')} imageUrl={patient.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.totalVisits} visit{patient.totalVisits === 1 ? '' : 's'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link to="/doctor/notifications" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full' })}>
            View notifications
          </Link>
        </div>
      </div>
    </div>
  );
}
