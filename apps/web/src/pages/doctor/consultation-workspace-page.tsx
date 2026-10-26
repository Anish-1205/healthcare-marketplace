import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardList, Droplet, FileText, History, Phone } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { PrescriptionBuilder } from '@/components/doctor/prescription-builder';
import { ErrorState } from '@/components/error-state';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompleteConsultation, useConsultation, useUpdateConsultation } from '@/hooks/use-consultations';
import { CONSULTATION_TYPE_LABELS } from '@/lib/appointment-labels';
import { cn, formatSlotLabel } from '@/lib/utils';

interface ClinicalNotes {
  chiefComplaint: string;
  observations: string;
  diagnosis: string;
  notes: string;
  followUpDate: string;
}

function NoteField({
  id,
  label,
  hint,
  value,
  rows,
  disabled,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  rows: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <textarea
        id={id}
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={cn(
          'w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'opacity-70',
        )}
      />
    </div>
  );
}

/**
 * The consultation screen: patient context on the left, the doctor's own notes and the
 * prescription pad in the middle. Every clinical field is typed by the doctor.
 */
export function ConsultationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: consultation, isLoading, isError, refetch } = useConsultation(id);
  const updateConsultation = useUpdateConsultation();
  const completeConsultation = useCompleteConsultation();

  const [notes, setNotes] = useState<ClinicalNotes>({ chiefComplaint: '', observations: '', diagnosis: '', notes: '', followUpDate: '' });
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);

  useEffect(() => {
    if (!consultation) return;
    setNotes({
      chiefComplaint: consultation.chiefComplaint ?? '',
      observations: consultation.observations ?? '',
      diagnosis: consultation.diagnosis ?? '',
      notes: consultation.notes ?? '',
      followUpDate: consultation.followUpDate ?? '',
    });
  }, [consultation]);

  if (isLoading) return <Skeleton className="h-[32rem] w-full" />;
  if (isError || !consultation) return <ErrorState message="We couldn't open this consultation." onRetry={() => refetch()} />;

  const isComplete = consultation.status === 'COMPLETED';
  const [firstName, ...rest] = consultation.patient.name.split(' ');

  async function saveNotes() {
    if (!consultation || isComplete) return;
    const unchanged =
      notes.chiefComplaint === (consultation.chiefComplaint ?? '') &&
      notes.observations === (consultation.observations ?? '') &&
      notes.diagnosis === (consultation.diagnosis ?? '') &&
      notes.notes === (consultation.notes ?? '') &&
      notes.followUpDate === (consultation.followUpDate ?? '');
    if (unchanged) return;

    setError(null);
    try {
      await updateConsultation.mutateAsync({
        id: id!,
        chiefComplaint: notes.chiefComplaint || null,
        observations: notes.observations || null,
        diagnosis: notes.diagnosis || null,
        notes: notes.notes || null,
        followUpDate: notes.followUpDate || null,
      });
      setSaved(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save your notes.');
    }
  }

  async function handleComplete() {
    setError(null);
    try {
      await saveNotes();
      await completeConsultation.mutateAsync(id!);
      setConfirmComplete(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not complete this consultation.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-normal text-foreground">Consultation</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" /> {formatSlotLabel(consultation.scheduledStart)}
            </span>
            <span>{CONSULTATION_TYPE_LABELS[consultation.consultationType]}</span>
            <Link to={`/doctor/appointments/${consultation.appointmentId}`} className="text-primary hover:underline">
              {consultation.appointment.appointmentNumber}
            </Link>
          </p>
        </div>
        <Badge variant={isComplete ? 'muted' : 'default'}>{isComplete ? 'Completed' : 'In progress'}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <aside className="space-y-4 lg:col-span-1">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar firstName={firstName} lastName={rest.join(' ')} imageUrl={consultation.patient.avatarUrl} size="lg" />
              <div>
                <Link to={`/doctor/patients/${consultation.patient.id}`} className="font-semibold text-foreground hover:text-primary">
                  {consultation.patient.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {consultation.patient.age !== null ? `${consultation.patient.age} yrs` : 'Age unknown'}
                  {consultation.patient.gender ? ` · ${consultation.patient.gender.charAt(0)}${consultation.patient.gender.slice(1).toLowerCase()}` : ''}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              {consultation.patientContact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {consultation.patientContact.phone}
                </div>
              )}
              {consultation.patientContact.bloodGroup && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Droplet className="h-3.5 w-3.5" /> {consultation.patientContact.bloodGroup}
                </div>
              )}
            </dl>

            {(consultation.appointment.reason || consultation.appointment.patientNotes) && (
              <div className="mt-4 rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason for visit</p>
                <p className="mt-1 text-sm text-foreground">{consultation.appointment.reason ?? '—'}</p>
                {consultation.appointment.patientNotes && <p className="mt-2 text-sm text-muted-foreground">{consultation.appointment.patientNotes}</p>}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <History className="h-4 w-4" /> Previous consultations
            </h2>
            {consultation.previousConsultations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No earlier visits on record.</p>
            ) : (
              <ol className="space-y-3">
                {consultation.previousConsultations.map((entry) => (
                  <li key={entry.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-foreground">{entry.diagnosis ?? 'Consultation'}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.doctorName} ·{' '}
                      {new Date(entry.startedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {entry.notes && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{entry.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList className="h-4 w-4" /> Previous prescriptions
            </h2>
            {consultation.previousPrescriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None issued before this visit.</p>
            ) : (
              <ul className="space-y-2">
                {consultation.previousPrescriptions.map((prescription) => (
                  <li key={prescription.id}>
                    <Link to={`/doctor/prescriptions/${prescription.id}`} className="block rounded-xl border border-border p-2.5 interactive-row">
                      <p className="font-mono text-xs text-muted-foreground">{prescription.prescriptionNumber}</p>
                      <p className="text-sm font-medium text-foreground">{prescription.diagnosis ?? 'Prescription'}</p>
                      <p className="text-xs text-muted-foreground">
                        {prescription.itemCount} medicine{prescription.itemCount === 1 ? '' : 's'} ·{' '}
                        {prescription.issuedAt ? new Date(prescription.issuedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : 'Draft'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FileText className="h-4.5 w-4.5" /> Clinical notes
              </h2>
              {saved && <span className="text-xs text-muted-foreground">Saved at {saved}</span>}
            </div>

            <div className="space-y-4">
              <NoteField
                id="chiefComplaint"
                label="Chief complaint"
                value={notes.chiefComplaint}
                rows={2}
                disabled={isComplete}
                onChange={(value) => setNotes((prev) => ({ ...prev, chiefComplaint: value }))}
                onBlur={saveNotes}
              />
              <NoteField
                id="observations"
                label="Observations"
                value={notes.observations}
                rows={3}
                disabled={isComplete}
                onChange={(value) => setNotes((prev) => ({ ...prev, observations: value }))}
                onBlur={saveNotes}
              />
              <NoteField
                id="diagnosis"
                label="Diagnosis"
                hint="Typed by you — CareBridge never suggests a diagnosis."
                value={notes.diagnosis}
                rows={2}
                disabled={isComplete}
                onChange={(value) => setNotes((prev) => ({ ...prev, diagnosis: value }))}
                onBlur={saveNotes}
              />
              <NoteField
                id="notes"
                label="Consultation notes"
                value={notes.notes}
                rows={4}
                disabled={isComplete}
                onChange={(value) => setNotes((prev) => ({ ...prev, notes: value }))}
                onBlur={saveNotes}
              />
              <div className="space-y-1.5">
                <Label htmlFor="followUpDate">Follow-up date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={notes.followUpDate}
                  disabled={isComplete}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setNotes((prev) => ({ ...prev, followUpDate: event.target.value }))}
                  onBlur={saveNotes}
                  className="w-48"
                />
              </div>
            </div>

            {!isComplete && (
              <Button variant="outline" size="sm" className="mt-4" disabled={updateConsultation.isPending} onClick={saveNotes}>
                {updateConsultation.isPending ? 'Saving…' : 'Save notes'}
              </Button>
            )}
          </section>

          <PrescriptionBuilder
            consultationId={consultation.id}
            prescription={consultation.prescription}
            diagnosis={notes.diagnosis || null}
            readOnly={isComplete}
            key={consultation.prescription?.id ?? 'new'}
          />

          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {isComplete ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4.5 w-4.5 text-secondary" />
                Completed on{' '}
                {new Date(consultation.completedAt!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <div className="flex gap-2">
                {consultation.prescription && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/doctor/prescriptions/${consultation.prescription!.id}`)}>
                    View prescription
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/consultations')}>
                  Back to consultations
                </Button>
              </div>
            </div>
          ) : confirmComplete ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Complete this consultation?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The appointment is marked complete and the notes are locked.
                {consultation.prescription?.status === 'DRAFT' && ' The draft prescription will be issued to the patient.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={completeConsultation.isPending} onClick={handleComplete}>
                  {completeConsultation.isPending ? 'Completing…' : 'Yes, complete'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmComplete(false)}>
                  Keep working
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Finished with this patient?</p>
              <Button onClick={() => setConfirmComplete(true)}>
                <CheckCircle2 className="h-4 w-4" /> Complete consultation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
