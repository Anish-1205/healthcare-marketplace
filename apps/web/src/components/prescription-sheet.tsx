import type { PrescriptionDetail } from '@carebridge/shared';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The prescription as the patient and pharmacy see it, and what the browser prints.
 * Wrapped in `.print-sheet` so print styles can isolate it from the rest of the page.
 */
export function PrescriptionSheet({ prescription, className }: { prescription: PrescriptionDetail; className?: string }) {
  const isDraft = prescription.status === 'DRAFT';

  return (
    <article className={cn('print-sheet rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8', className)}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <Logo className="pointer-events-none" />
          <p className="mt-2 text-sm font-semibold text-foreground">{prescription.doctor.name}</p>
          <p className="text-xs text-muted-foreground">
            {prescription.doctor.qualifications} · {prescription.doctor.primarySpecialty}
          </p>
          <p className="text-xs text-muted-foreground">Reg. No. {prescription.doctor.registrationNumber}</p>
          {prescription.organization && <p className="text-xs text-muted-foreground">{prescription.organization.name}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prescription</p>
          <p className="font-mono text-sm font-semibold text-foreground">{prescription.prescriptionNumber}</p>
          <p className="mt-1 text-xs text-muted-foreground">Issued {formatDate(prescription.issuedAt)}</p>
          {prescription.validUntil && <p className="text-xs text-muted-foreground">Valid until {formatDate(prescription.validUntil)}</p>}
          {isDraft && <p className="mt-1 text-xs font-semibold text-amber-700">DRAFT — not yet issued</p>}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-b border-border py-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Patient</dt>
          <dd className="text-sm font-semibold text-foreground">{prescription.patient.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Age / Sex</dt>
          <dd className="text-sm font-semibold text-foreground">
            {prescription.patient.age !== null ? `${prescription.patient.age} yrs` : '—'}
            {prescription.patient.gender ? ` / ${prescription.patient.gender.charAt(0)}` : ''}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Diagnosis</dt>
          <dd className="text-sm font-semibold text-foreground">{prescription.diagnosis ?? '—'}</dd>
        </div>
      </dl>

      <div className="py-5">
        <p className="mb-3 font-serif text-2xl font-bold text-foreground">℞</p>
        {prescription.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines on this prescription.</p>
        ) : (
          <ol className="space-y-3">
            {prescription.items.map((item, index) => (
              <li key={item.id} className="flex gap-3 border-b border-dashed border-border pb-3 last:border-0 last:pb-0">
                <span className="text-sm font-semibold text-muted-foreground">{index + 1}.</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.medicineName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.dosage} · {item.frequency} · {item.duration}
                    {item.timing ? ` · ${item.timing}` : ''}
                  </p>
                  {item.instructions && <p className="text-sm italic text-muted-foreground">{item.instructions}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {prescription.advice && (
        <div className="border-t border-border py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Advice</p>
          <p className="mt-1 text-sm text-foreground">{prescription.advice}</p>
        </div>
      )}

      <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          Demonstration document. This prescription is sample data generated for a product demo and must not be used for
          medical decisions or dispensing.
        </p>
        <div className="text-right">
          <p className="border-t border-border pt-1 text-xs text-muted-foreground">{prescription.doctor.name}</p>
        </div>
      </footer>
    </article>
  );
}
