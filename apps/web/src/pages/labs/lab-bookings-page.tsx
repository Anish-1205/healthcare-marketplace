import { useState } from 'react';
import type { LabBookingStatus } from '@carebridge/shared';
import { CalendarClock, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLabBookings } from '@/hooks/use-labs';
import { LAB_STATUS_LABELS } from '@/lib/lab-labels';
import { formatCurrency } from '@/lib/utils';

export function LabBookingsPage() {
  const [page, setPage] = useState(1); const [status, setStatus] = useState<LabBookingStatus | ''>('');
  const query = useLabBookings({ page, pageSize: 10, status: status || undefined });
  return <div className="container py-8"><PageHeader title="My Lab Bookings" subtitle="Track home collections and open demo reports." action={<Link to="/lab-tests" className={buttonVariants({})}>Book a test</Link>} /><label className="mb-5 block text-sm">Status <select className="ml-2 rounded-lg border bg-card p-2" value={status} onChange={(event) => { setStatus(event.target.value as LabBookingStatus | ''); setPage(1); }}><option value="">All bookings</option>{Object.entries(LAB_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{query.isLoading ? <Skeleton className="h-80" /> : query.isError ? <ErrorState message="We couldn't load lab bookings." onRetry={() => query.refetch()} /> : !query.data?.data.length ? <EmptyState icon={FlaskConical} title="No lab bookings" description="Choose a test or package to schedule a demo home collection." action={<Link to="/lab-tests" className={buttonVariants({})}>Browse lab tests</Link>} /> : <><div className="space-y-4">{query.data.data.map((booking) => <Link key={booking.id} to={`/lab-bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm hover:border-primary"><div><p className="font-semibold">{booking.tests.map((test) => test.name).join(' + ')}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{booking.bookingNumber}</p><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4" />{new Date(`${booking.scheduledDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {booking.timeSlot}</p></div><div className="text-right"><Badge variant={booking.status === 'REPORT_READY' ? 'success' : booking.status === 'CANCELLED' ? 'destructive' : 'muted'}>{LAB_STATUS_LABELS[booking.status]}</Badge><p className="mt-2 font-semibold">{formatCurrency(booking.totalAmount)}</p></div></Link>)}</div><Pagination page={query.data.meta.page} totalPages={query.data.meta.totalPages} onChange={setPage} /></>}</div>;
}
