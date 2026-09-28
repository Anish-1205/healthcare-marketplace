import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { OrderDetail, OrderStatusPayload } from '@carebridge/shared';
import { CheckCircle2, Circle, Truck } from 'lucide-react';
import { ordersApi } from '@/api/orders';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state';
import { ORDER_LABELS, DELIVERY_LABELS, DELIVERY_NEXT, orderTime } from '@/lib/order-labels';
import { formatCurrency } from '@/lib/utils';

export function OrderDetailPage({ pharmacy = false }: { pharmacy?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.detail(id!), refetchInterval: 10_000 });
  const [note, setNote] = useState('');
  const [edits, setEdits] = useState<Record<string, { approvedQuantity: number; unitPrice: number }>>({});
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const action = useMutation({
    mutationFn: (fn: () => Promise<OrderDetail>) => fn(),
    onSuccess: async (order) => {
      client.setQueryData(['order', id], order);
      setEdits({});
      setCancelConfirm(false);
      await client.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!query.data) return <ErrorState message="We couldn't load this order." onRetry={() => query.refetch()} />;
  const order = query.data;
  const reviewing = pharmacy && order.allowedStatuses.includes('CONFIRMED');
  const steps = [
    'PENDING',
    ...(order.prescription ? ['PRESCRIPTION_REVIEW'] : []),
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    ...(order.fulfillmentType === 'DELIVERY' ? ['OUT_FOR_DELIVERY'] : []),
    'DELIVERED',
  ] as const;
  const pendingSteps = ['CANCELLED', 'REJECTED'].includes(order.status)
    ? []
    : steps.filter((status) => !order.statusHistory.some((h) => h.toStatus === status));
  function change(status: OrderStatusPayload['status']) {
    action.mutate(() =>
      ordersApi.status(order.id, {
        status,
        note,
        ...(status === 'CONFIRMED'
          ? {
              items: order.items.map((i) => ({
                id: i.id,
                ...(edits[i.id] ?? { approvedQuantity: i.approvedQuantity ?? i.quantity, unitPrice: i.unitPrice }),
              })),
            }
          : {}),
      }),
    );
  }
  return (
    <div className={pharmacy ? '' : 'container py-8'}>
      {!pharmacy && order.status === 'PENDING' && (location.state as { justPlaced?: boolean } | null)?.justPlaced && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-mint p-5 text-mint-foreground">
          <CheckCircle2 />
          <div>
            <h2 className="font-semibold">Thank you! Your order is placed.</h2>
            <p className="text-sm">The pharmacy will review and confirm your medicines.</p>
          </div>
        </div>
      )}
      <PageHeader
        title={order.orderNumber}
        subtitle={`Placed ${orderTime(order.placedAt)} · ${order.fulfillmentType === 'DELIVERY' ? 'Home delivery' : 'Store pickup'}`}
      />
      <Badge className="mb-5" variant={order.status === 'DELIVERED' ? 'success' : 'muted'}>
        {ORDER_LABELS[order.status]}
      </Badge>
      {action.error && (
        <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {action.error.message}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">{order.pharmacy.name}</h2>
            <p className="text-sm text-muted-foreground">
              {order.pharmacy.addressLine1}, {order.pharmacy.city} · {order.pharmacy.phone}
            </p>
            {pharmacy && <p className="mt-2 text-sm">Patient: {order.patient.name}</p>}
            {order.address && (
              <div className="mt-4 border-t pt-3 text-sm">
                <p className="font-medium">Delivery to {order.address.recipient}</p>
                <p>
                  {order.address.line1} {order.address.line2}
                </p>
                <p>
                  {order.address.locality}, {order.address.city} {order.address.postalCode}
                </p>
                <p>{order.address.phone}</p>
              </div>
            )}
            {order.patientNotes && <p className="mt-3 text-sm">Patient notes: {order.patientNotes}</p>}
          </section>
          {order.prescription && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Prescription {order.prescription.prescriptionNumber}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Doctor-entered demo content. Review against the requested medicines.</p>
              {order.prescription.items.map((item, index) => (
                <div key={index} className="mt-3 border-t pt-2 text-sm">
                  <strong>{item.medicineName}</strong>
                  <p>
                    {item.dosage} · {item.frequency} · {item.duration} · Qty {item.quantity}
                  </p>
                </div>
              ))}
            </section>
          )}
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Medicines</h2>
            {reviewing && (
              <p className="mb-4 text-xs text-muted-foreground">
                Stock was reserved at checkout. Confirm available quantities and prices below. You may reduce either, or set quantity to
                zero to omit a line. Reject the order if nothing can be supplied.
              </p>
            )}
            {order.items.map((item) => {
              const edit = edits[item.id] ?? { approvedQuantity: item.approvedQuantity ?? item.quantity, unitPrice: item.unitPrice };
              return (
                <div key={item.id} className="flex flex-wrap justify-between gap-3 border-t py-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.medicineName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.packSize} · Requested {item.quantity}
                      {item.approvedQuantity !== null ? ` · Approved ${item.approvedQuantity}` : ''}
                    </p>
                    {item.requiresPrescription && (
                      <Badge variant="warning" className="mt-1">
                        Prescription required
                      </Badge>
                    )}
                  </div>
                  {reviewing ? (
                    <div className="flex gap-3">
                      <label className="text-xs">
                        Approve quantity
                        <Input
                          className="mt-1 w-24"
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={edit.approvedQuantity}
                          onChange={(e) => setEdits((v) => ({ ...v, [item.id]: { ...edit, approvedQuantity: Number(e.target.value) } }))}
                        />
                      </label>
                      <label className="text-xs">
                        Unit price (₹)
                        <Input
                          className="mt-1 w-28"
                          type="number"
                          min={0}
                          max={item.unitPrice}
                          step="0.01"
                          value={edit.unitPrice}
                          onChange={(e) => setEdits((v) => ({ ...v, [item.id]: { ...edit, unitPrice: Number(e.target.value) } }))}
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold">{formatCurrency(item.lineTotal)}</p>
                  )}
                </div>
              );
            })}
          </section>
          {pharmacy && (
            <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Process order</h2>
              {order.allowedStatuses.length > 0 && (
                <>
                  <label className="block text-sm">
                    Pharmacy notes / rejection reason
                    <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {order.allowedStatuses.map((status) => (
                      <Button
                        key={status}
                        variant={status === 'REJECTED' || status === 'CANCELLED' ? 'outline' : 'default'}
                        disabled={action.isPending || (status === 'REJECTED' && !note.trim())}
                        onClick={() => change(status)}
                      >
                        {status === 'CONFIRMED'
                          ? 'Confirm stock & pricing'
                          : status === 'PRESCRIPTION_REVIEW'
                            ? 'Review prescription'
                            : ORDER_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                </>
              )}
              {order.fulfillmentType === 'DELIVERY' && order.status === 'READY_FOR_PICKUP' && !order.delivery && (
                <Button disabled={action.isPending} onClick={() => action.mutate(() => ordersApi.assign(order.id))}>
                  Assign demo delivery agent
                </Button>
              )}
              {order.delivery && DELIVERY_NEXT[order.delivery.status] && (
                <Button
                  disabled={action.isPending}
                  onClick={() => action.mutate(() => ordersApi.delivery(order.delivery!.id, DELIVERY_NEXT[order.delivery!.status]!))}
                >
                  Mark {DELIVERY_LABELS[DELIVERY_NEXT[order.delivery.status]!]}
                </Button>
              )}
              {!order.allowedStatuses.length &&
                (!order.delivery || !DELIVERY_NEXT[order.delivery.status]) &&
                ['CANCELLED', 'REJECTED', 'DELIVERED'].includes(order.status) && (
                  <p className="text-sm text-muted-foreground">This order is closed.</p>
                )}
            </section>
          )}
          {order.delivery && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold">
                <Truck className="h-5 w-5" /> Simulated delivery
              </h2>
              <p className="mt-3 text-sm">
                {order.delivery.agentName} · {order.delivery.agentPhone}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.delivery.vehicleType} · {order.delivery.vehicleNumber}
              </p>
              {order.delivery.estimatedArrivalAt && (
                <p className="mt-2 text-sm">Estimated arrival: {orderTime(order.delivery.estimatedArrivalAt)}</p>
              )}
              <ol className="mt-4 space-y-3">
                {order.delivery.statusHistory.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 text-sm">
                    <span>{DELIVERY_LABELS[h.status]}</span>
                    <time className="text-muted-foreground">{orderTime(h.createdAt)}</time>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Order tracking</h2>
            <ol>
              {order.statusHistory.map((h, index) => (
                <li key={h.id} className="relative flex gap-3 pb-5">
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 ${index === order.statusHistory.length - 1 ? 'text-primary' : 'text-secondary'}`}
                  />
                  <div>
                    <p className="text-sm font-medium">{ORDER_LABELS[h.toStatus]}</p>
                    <time className="text-xs text-muted-foreground">{orderTime(h.createdAt)}</time>
                    {h.note && <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>}
                  </div>
                </li>
              ))}
              {pendingSteps.map((status) => (
                <li key={status} className="flex gap-3 pb-5 text-muted-foreground">
                  <Circle className="h-5 w-5" />
                  <span className="text-sm">{ORDER_LABELS[status as keyof typeof ORDER_LABELS]}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Payment summary</h2>
            {[
              ['MRP', order.subtotalMrp],
              ['Discount', -order.discountTotal],
              ['Delivery', order.deliveryFee],
              ['Platform fee', order.platformFee],
              ['Total', order.totalAmount],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span>{label}</span>
                <strong>{formatCurrency(Number(value))}</strong>
              </div>
            ))}
            {order.payments.map((p) => (
              <div key={p.id} className="border-t pt-3 text-xs text-muted-foreground">
                <p>
                  {p.method.replaceAll('_', ' ')} · {p.status}
                </p>
                <p>{p.transactionRef}</p>
                <p>Simulated payment · {formatCurrency(p.amount)}</p>
              </div>
            ))}
            {order.pharmacyNotes && <p className="text-sm">Pharmacy notes: {order.pharmacyNotes}</p>}
            {order.rejectionReason && <p className="text-sm text-destructive">{order.rejectionReason}</p>}
          </section>
          {!pharmacy && order.canCancel && (
            <section className="rounded-2xl border bg-card p-5">
              <p className="mb-3 text-xs text-muted-foreground">
                You can cancel before preparation begins. Paid demo payments will be marked refunded.
              </p>
              {cancelConfirm ? (
                <div className="space-y-3">
                  <Input
                    aria-label="Cancellation reason"
                    placeholder="Reason (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button disabled={action.isPending} onClick={() => action.mutate(() => ordersApi.cancel(order.id, note))}>
                    Confirm cancellation
                  </Button>
                  <Button variant="ghost" onClick={() => setCancelConfirm(false)}>
                    Keep order
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setCancelConfirm(true)}>
                  Cancel order
                </Button>
              )}
            </section>
          )}
          <Link to={pharmacy ? '/pharmacy/orders' : '/orders'} className="block text-sm text-primary">
            Back to orders
          </Link>
        </aside>
      </div>
    </div>
  );
}
