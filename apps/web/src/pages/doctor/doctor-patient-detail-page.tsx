import { CalendarClock, Droplet, Phone } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { DoctorAppointmentRow } from '@/components/doctor/doctor-appointment-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctorPatient } from '@/hooks/use-doctor-portal';

export function DoctorPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading, isError, refetch } = useDoctorPatient(id);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !patient) return <ErrorState message="We couldn't load this patient." onRetry={() => refetch()} />;

  const [firstName, ...rest] = patient.name.split(' ');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={patient.avatarUrl} size="lg" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
            <p className="text-sm text-muted-foreground">
              {patient.age !== null ? `${patient.age} years` : 'Age unknown'}
              {patient.gender ? ` · ${patient.gender.charAt(0)}${patient.gender.slice(1).toLowerCase()}` : ''}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Total visits</dt>
            <dd className="mt-0.5 font-semibold text-foreground">{patient.totalVisits}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last visit</dt>
            <dd className="mt-0.5 font-semibold text-foreground">{patient.lastVisitAt ? new Date(patient.lastVisitAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd>
          </div>
          {patient.phone && (
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-semibold text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {patient.phone}
              </dd>
            </div>
          )}
          {patient.bloodGroup && (
            <div>
              <dt className="text-xs text-muted-foreground">Blood group</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-semibold text-foreground">
                <Droplet className="h-3.5 w-3.5 text-muted-foreground" /> {patient.bloodGroup}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Appointment history</h2>
        {patient.appointments.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No appointments yet" />
        ) : (
          <div className="space-y-3">
            {patient.appointments.map((appointment) => (
              <DoctorAppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
