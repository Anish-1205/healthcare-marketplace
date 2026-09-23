import { useState } from 'react';
import { CalendarDays, Check, Clock3, FlaskConical, Home, MapPin } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CreateLabBookingPayload } from '@carebridge/shared';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-auth';
import { useBookLabTest, useLabBookingContext, useLabTest } from '@/hooks/use-labs';
import { formatCurrency } from '@/lib/utils';

const tomorrow = () => { const value = new Date(); value.setDate(value.getDate() + 1); return value.toISOString().slice(0, 10); };
const blankAddress: NonNullable<CreateLabBookingPayload['address']> = { label: 'Home', recipient: '', phone: '', line1: '', locality: '', city: '', state: '', postalCode: '' };

export function LabTestDetailPage() {
  const { id } = useParams();
  const test = useLabTest(id);
  const user = useCurrentUser();
  const patient = Boolean(user?.roles.includes('PATIENT'));
  const context = useLabBookingContext(patient);
  const book = useBookLabTest();
  const navigate = useNavigate();
  const [date, setDate] = useState(tomorrow());
  const [slot, setSlot] = useState('08:00 - 09:00');
  const [addressId, setAddressId] = useState('');
  const [address, setAddress] = useState(blankAddress);
  const [method, setMethod] = useState<CreateLabBookingPayload['paymentMethod']>('UPI');
  const [notes, setNotes] = useState('');

  if (test.isLoading) return <div className="container py-8"><Skeleton className="h-[32rem]" /></div>;
  if (!test.data) return <ErrorState message="We couldn't load this lab test." onRetry={() => test.refetch()} />;

  const item = test.data;
  const savedAddresses = context.data?.addresses ?? [];
  const chosenAddress = addressId || savedAddresses[0]?.id || '';
  const enteringAddress = context.isSuccess && savedAddresses.length === 0;
  const addressReady = chosenAddress || (address.recipient && address.phone && address.line1 && address.locality && address.city && address.state && /^\d{6}$/.test(address.postalCode));

  return (
    <div className="container py-8">
      <PageHeader title={item.name} subtitle={`${item.code} · ${item.category}`} action={<Link to="/lab-tests" className={buttonVariants({ variant: 'outline' })}>All tests</Link>} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap gap-2"><Badge variant={item.isPackage ? 'accent' : 'muted'}>{item.isPackage ? 'Health package' : item.category}</Badge>{item.homeCollectionAvailable && <Badge variant="success"><Home className="mr-1 h-3 w-3" />Home collection</Badge>}</div>
            <p className="mt-5 text-muted-foreground">{item.description}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info icon={FlaskConical} title={`${item.parametersCount} parameters`} text={`Sample: ${item.sampleType}`} />
              <Info icon={Clock3} title={`${item.turnaroundHours} hours`} text="Estimated demo turnaround" />
              <Info icon={CalendarDays} title={item.fastingRequired ? 'Fasting required' : 'No fasting needed'} text={item.fastingRequired ? 'Follow the collection instructions.' : 'You can eat normally.'} />
              <Info icon={MapPin} title="At your address" text="A demo phlebotomist visit is scheduled." />
            </div>
          </section>
          {item.includedTests.length > 0 && <section className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Tests included</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{item.includedTests.map((included) => <div key={included.id} className="flex gap-2 rounded-xl bg-muted p-3 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" /><span>{included.name}</span></div>)}</div></section>}
        </div>
        <aside className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground"><span className="line-through">{formatCurrency(item.mrp)}</span> package price</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(item.price)}</p>
          {!user ? <div className="mt-6"><p className="mb-3 text-sm text-muted-foreground">Sign in as a patient to choose collection details.</p><Link to="/login" className={buttonVariants({ className: 'w-full' })}>Sign in to book</Link></div> : !patient ? <p className="mt-6 rounded-xl bg-muted p-3 text-sm">Lab booking is available to patient accounts.</p> : (
            <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); book.mutate({ testIds: [item.id], collectionType: 'HOME_COLLECTION', scheduledDate: date, timeSlot: slot, ...(chosenAddress ? { addressId: chosenAddress } : { address }), paymentMethod: method, notes }, { onSuccess: (booking) => navigate(`/lab-bookings/${booking.id}`) }); }}>
              <label className="block text-sm">Collection date<Input className="mt-1" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="block text-sm">Time slot<select className="mt-1 w-full rounded-lg border bg-background p-2.5" value={slot} onChange={(event) => setSlot(event.target.value)}>{context.data?.timeSlots.map((value) => <option key={value}>{value}</option>)}</select></label>
              {!enteringAddress && <label className="block text-sm">Home collection address<select className="mt-1 w-full rounded-lg border bg-background p-2.5" value={chosenAddress} onChange={(event) => setAddressId(event.target.value)}><option value="">Choose an address</option>{savedAddresses.map((saved) => <option key={saved.id} value={saved.id}>{saved.label}: {saved.line1}, {saved.city}</option>)}</select></label>}
              {enteringAddress && <div className="grid gap-3 sm:grid-cols-2"><p className="text-sm font-medium sm:col-span-2">Enter a collection address</p>{([['recipient', 'Recipient'], ['phone', 'Phone'], ['line1', 'Address line'], ['locality', 'Locality'], ['city', 'City'], ['state', 'State'], ['postalCode', '6-digit postal code']] as const).map(([key, label]) => <label key={key} className={key === 'line1' ? 'text-sm sm:col-span-2' : 'text-sm'}>{label}<Input className="mt-1" value={address[key]} pattern={key === 'postalCode' ? '[0-9]{6}' : undefined} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} /></label>)}</div>}
              <label className="block text-sm">Demo payment<select className="mt-1 w-full rounded-lg border bg-background p-2.5" value={method} onChange={(event) => setMethod(event.target.value as CreateLabBookingPayload['paymentMethod'])}><option value="UPI">UPI</option><option value="CARD">Credit / debit card</option></select></label>
              <label className="block text-sm">Notes (optional)<Input className="mt-1" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              {book.error && <p className="text-sm text-destructive">{book.error.message}</p>}
              <Button className="w-full" type="submit" disabled={!date || !addressReady || book.isPending}>{book.isPending ? 'Booking…' : `Book for ${formatCurrency(item.price)}`}</Button>
              <p className="text-center text-xs text-muted-foreground">Simulated booking and payment. No money is collected.</p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

function Info({ icon: Icon, title, text }: { icon: typeof FlaskConical; title: string; text: string }) { return <div className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{text}</p></div></div>; }
