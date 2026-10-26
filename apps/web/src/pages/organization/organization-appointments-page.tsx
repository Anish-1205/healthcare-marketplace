import { useState } from 'react';
import type { AppointmentScope, AppointmentStatus, ConsultationType } from '@carebridge/shared';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentStatusBadge } from '@/components/appointment-status-badge';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointments } from '@/hooks/use-appointments';
import { useOrganizationDoctors } from '@/hooks/use-organization-portal';
import { Input } from '@/components/ui/input';
import { APPOINTMENT_STATUS_LABELS, CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { formatCurrency, formatSlotLabel } from '@/lib/utils';

export function OrganizationAppointmentsPage() {
  const [scope, setScope] = useState<AppointmentScope>('upcoming'); const [status, setStatus] = useState<AppointmentStatus | ''>(''); const [doctorId, setDoctorId] = useState(''); const [patient, setPatient] = useState(''); const [date, setDate] = useState(''); const [consultationType, setConsultationType] = useState<ConsultationType | ''>(''); const [page, setPage] = useState(1);
  const query = useAppointments({ scope, status: status ? [status] : undefined, doctorId: doctorId || undefined, patient: patient.trim() || undefined, date: date || undefined, consultationType: consultationType || undefined, page, pageSize: 15, sort: scope === 'upcoming' ? 'scheduledStart' : '-scheduledStart' });
  const doctorsQuery = useOrganizationDoctors();
  const doctors = doctorsQuery.data ?? [];
  return <div><PageHeader title="Appointments" subtitle="Manage bookings across every doctor and consultation type." resultCount={query.data?.meta.total} />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Select value={scope} onChange={(e) => { setScope(e.target.value as AppointmentScope); setPage(1); }}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All dates</option></Select><Select value={status} onChange={(e) => { setStatus(e.target.value as AppointmentStatus | ''); setPage(1); }}><option value="">All statuses</option>{Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setPage(1); }}><option value="">All doctors</option>{doctors.map((doctor) => <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.name}</option>)}</Select><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} aria-label="Appointment date" /><Select value={consultationType} onChange={(e) => { setConsultationType(e.target.value as ConsultationType | ''); setPage(1); }}><option value="">All consultation types</option>{Object.entries(CONSULTATION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><Input value={patient} onChange={(e) => { setPatient(e.target.value); setPage(1); }} placeholder="Search patient name or phone" /></div>
    {query.isLoading ? <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div> : query.isError ? <ErrorState message="We couldn't load organization appointments." onRetry={() => query.refetch()} /> : !query.data?.data.length ? <EmptyState icon={CalendarDays} title="No appointments match" description="Try changing the date or status filters." /> : <><div className="space-y-3">{query.data.data.map((appointment) => <Link to={`/organization/appointments/${appointment.id}`} key={appointment.id} className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft interactive-card"><Avatar firstName={appointment.patient.name.split(' ')[0]} lastName={appointment.patient.name.split(' ').slice(1).join(' ')} imageUrl={appointment.patient.avatarUrl} /><div className="min-w-[13rem] flex-1"><p className="font-semibold">{appointment.patient.name}</p><p className="text-xs text-muted-foreground">{formatSlotLabel(appointment.scheduledStart)} · {CONSULTATION_TYPE_LABELS[appointment.consultationType]}</p></div><div className="min-w-[12rem]"><p className="text-sm font-medium">{appointment.doctor.name}</p><p className="text-xs text-muted-foreground">{appointment.appointmentNumber}</p></div><span className="text-sm font-semibold">{formatCurrency(appointment.fee)}</span><AppointmentStatusBadge status={appointment.status} /></Link>)}</div><Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={setPage} /></>}
  </div>;
}
