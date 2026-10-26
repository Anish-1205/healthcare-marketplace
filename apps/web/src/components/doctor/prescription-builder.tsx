import { useState } from 'react';
import type { PrescriptionDetail, PrescriptionItemInput } from '@carebridge/shared';
import { Check, Pill, Plus, Search, Trash2, X } from 'lucide-react';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMedicines } from '@/hooks/use-medicines';
import { useCreatePrescription, useIssuePrescription, useUpdatePrescription } from '@/hooks/use-prescriptions';
import { DURATION_SUGGESTIONS, FREQUENCY_SUGGESTIONS, TIMING_SUGGESTIONS } from '@/lib/prescription-options';
import { cn } from '@/lib/utils';

const emptyLine = (): PrescriptionItemInput => ({
  medicineId: null,
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  timing: '',
  instructions: '',
  quantity: 1,
});

function SuggestionRow({ options, onPick }: { options: string[]; onPick: (value: string) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground interactive-pill"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Search the catalogue, or type a medicine name the catalogue doesn't carry. */
function MedicinePicker({ onSelect }: { onSelect: (medicine: { id: string | null; name: string }) => void }) {
  const [term, setTerm] = useState('');
  const q = useDebouncedValue(term, 300);
  const { data, isLoading } = useMedicines({ q: q || undefined, pageSize: 6 });

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search medicines by name or salt" className="pl-10" autoFocus />
      </div>

      {q.length > 0 && (
        <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)
          ) : !data?.data.length ? (
            <button
              type="button"
              onClick={() => onSelect({ id: null, name: term.trim() })}
              className="w-full rounded-xl border border-dashed border-border p-3 text-left text-sm text-muted-foreground interactive-row"
            >
              Not in the catalogue — add “{term.trim()}” as typed
            </button>
          ) : (
            data.data.map((medicine) => (
              <button
                key={medicine.id}
                type="button"
                onClick={() => onSelect({ id: medicine.id, name: `${medicine.name}${medicine.strength ? ` ${medicine.strength}` : ''}` })}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left interactive-row"
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {medicine.name} {medicine.strength}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {medicine.genericName} · {medicine.dosageForm} · {medicine.packSize}
                  </span>
                </span>
                {medicine.requiresPrescription && <Badge variant="warning">Rx</Badge>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The doctor's prescription pad. Medicines come from the catalogue (or are typed free-hand), and
 * every dosage, frequency, duration, timing and instruction field is filled in by the doctor.
 */
export function PrescriptionBuilder({
  consultationId,
  prescription,
  diagnosis,
  readOnly,
}: {
  consultationId: string;
  prescription: PrescriptionDetail | null;
  /** Pre-fills a new prescription with the diagnosis the doctor typed in their notes. */
  diagnosis: string | null;
  readOnly: boolean;
}) {
  const create = useCreatePrescription();
  const update = useUpdatePrescription();
  const issue = useIssuePrescription();

  const [lines, setLines] = useState<PrescriptionItemInput[]>(() =>
    prescription ? prescription.items.map(({ id: _id, sortOrder: _sortOrder, ...item }) => item) : [],
  );
  const [advice, setAdvice] = useState(prescription?.advice ?? '');
  const [draftLine, setDraftLine] = useState<PrescriptionItemInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const isIssued = prescription?.status === 'ISSUED';
  const locked = readOnly || isIssued;
  const busy = create.isPending || update.isPending || issue.isPending;

  function lineIsComplete(line: PrescriptionItemInput) {
    return Boolean(line.medicineName.trim() && line.dosage.trim() && line.frequency.trim() && line.duration.trim());
  }

  async function persist(nextLines: PrescriptionItemInput[], nextAdvice: string) {
    setError(null);
    try {
      if (prescription) {
        await update.mutateAsync({ id: prescription.id, items: nextLines, advice: nextAdvice || null });
      } else {
        await create.mutateAsync({ consultationId, items: nextLines, advice: nextAdvice || null, diagnosis });
      }
      setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save the prescription.');
    }
  }

  function addLine() {
    if (!draftLine || !lineIsComplete(draftLine)) return;
    const next = [...lines, draftLine];
    setLines(next);
    setDraftLine(null);
    void persist(next, advice);
  }

  function removeLine(index: number) {
    const next = lines.filter((_, i) => i !== index);
    setLines(next);
    // The API requires at least one medicine, so an emptied pad is only saved once a line returns.
    if (next.length) void persist(next, advice);
  }

  async function handleIssue() {
    if (!prescription) return;
    setError(null);
    try {
      await issue.mutateAsync(prescription.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not issue the prescription.');
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Pill className="h-4.5 w-4.5" /> Prescription
        </h2>
        <div className="flex items-center gap-2">
          {prescription && <span className="text-xs text-muted-foreground">{prescription.prescriptionNumber}</span>}
          {isIssued ? (
            <Badge variant="success">Issued</Badge>
          ) : prescription ? (
            <Badge variant="warning">Draft</Badge>
          ) : null}
        </div>
      </div>

      {lines.length === 0 && !draftLine && (
        <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
          {locked ? 'No medicines were prescribed.' : 'No medicines added yet. Search the catalogue to start the prescription.'}
        </p>
      )}

      {lines.length > 0 && (
        <ol className="space-y-2">
          {lines.map((line, index) => (
            <li key={`${line.medicineName}-${index}`} className="rounded-xl border border-border p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {index + 1}. {line.medicineName}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {line.dosage} · {line.frequency} · {line.duration}
                    {line.timing ? ` · ${line.timing}` : ''}
                  </p>
                  {line.instructions && <p className="mt-0.5 text-sm text-muted-foreground">{line.instructions}</p>}
                </div>
                {!locked && (
                  <button onClick={() => removeLine(index)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove medicine">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {!locked && (
        <div className="mt-4">
          {!draftLine ? (
            <Button variant="outline" size="sm" onClick={() => setDraftLine(emptyLine())}>
              <Plus className="h-4 w-4" /> Add medicine
            </Button>
          ) : (
            <div className="rounded-xl border border-primary/30 bg-accent/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">New medicine</p>
                <button onClick={() => setDraftLine(null)} className="rounded-lg p-1 text-muted-foreground interactive-pill" aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!draftLine.medicineName ? (
                <MedicinePicker onSelect={(medicine) => setDraftLine({ ...draftLine, medicineId: medicine.id, medicineName: medicine.name })} />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                    <span className="text-sm font-semibold text-foreground">{draftLine.medicineName}</span>
                    <button onClick={() => setDraftLine({ ...draftLine, medicineId: null, medicineName: '' })} className="text-xs text-primary hover:underline">
                      Change
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="dosage">Dosage</Label>
                      <Input id="dosage" value={draftLine.dosage} onChange={(e) => setDraftLine({ ...draftLine, dosage: e.target.value })} placeholder="e.g. 1 tablet" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="frequency">Frequency</Label>
                      <Input id="frequency" value={draftLine.frequency} onChange={(e) => setDraftLine({ ...draftLine, frequency: e.target.value })} placeholder="e.g. Twice daily" className="mt-1" />
                      <SuggestionRow options={FREQUENCY_SUGGESTIONS} onPick={(value) => setDraftLine({ ...draftLine, frequency: value })} />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Input id="duration" value={draftLine.duration} onChange={(e) => setDraftLine({ ...draftLine, duration: e.target.value })} placeholder="e.g. 5 days" className="mt-1" />
                      <SuggestionRow options={DURATION_SUGGESTIONS} onPick={(value) => setDraftLine({ ...draftLine, duration: value })} />
                    </div>
                    <div>
                      <Label htmlFor="timing">Timing</Label>
                      <Input id="timing" value={draftLine.timing ?? ''} onChange={(e) => setDraftLine({ ...draftLine, timing: e.target.value })} placeholder="e.g. After food" className="mt-1" />
                      <SuggestionRow options={TIMING_SUGGESTIONS} onPick={(value) => setDraftLine({ ...draftLine, timing: value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="instructions">Instructions (optional)</Label>
                      <Input
                        id="instructions"
                        value={draftLine.instructions ?? ''}
                        onChange={(e) => setDraftLine({ ...draftLine, instructions: e.target.value })}
                        placeholder="e.g. Apply only on affected patches"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity / packs</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min={1}
                        max={100}
                        value={draftLine.quantity}
                        onChange={(e) => setDraftLine({ ...draftLine, quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="mt-1 w-28"
                      />
                    </div>
                  </div>

                  <Button size="sm" disabled={!lineIsComplete(draftLine) || busy} onClick={addLine}>
                    <Check className="h-4 w-4" /> Add to prescription
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 space-y-1.5">
        <Label htmlFor="advice">General advice</Label>
        <textarea
          id="advice"
          value={advice}
          onChange={(event) => setAdvice(event.target.value)}
          onBlur={() => lines.length > 0 && advice !== (prescription?.advice ?? '') && void persist(lines, advice)}
          rows={2}
          maxLength={2000}
          disabled={locked}
          placeholder="e.g. Avoid the suspected detergent. Use lukewarm water and pat skin dry."
          className={cn(
            'w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            locked && 'opacity-70',
          )}
        />
      </div>

      {error && <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {!locked && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" disabled={!lines.length || busy} onClick={() => persist(lines, advice)}>
            Save draft
          </Button>
          <Button size="sm" disabled={!prescription || !lines.length || busy} onClick={handleIssue}>
            Issue prescription
          </Button>
          {savedAt && <span className="text-xs text-muted-foreground">Draft saved at {savedAt}</span>}
        </div>
      )}

      {isIssued && (
        <p className="mt-4 rounded-xl bg-secondary/10 px-3 py-2 text-sm text-secondary">
          Issued on {new Date(prescription!.issuedAt!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} — the patient can see it now.
        </p>
      )}
    </section>
  );
}
