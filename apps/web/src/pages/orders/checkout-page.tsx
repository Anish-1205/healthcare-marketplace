import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { CheckoutPayload, DeliveryAddress } from '@carebridge/shared';
import { ordersApi } from '@/api/orders';
import { api } from '@/api/client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export function CheckoutPage() {
  const query = useQuery({ queryKey: ['checkout'], queryFn: ordersApi.checkout });
  const prescriptions = useQuery({
    queryKey: ['checkout-prescriptions'],
    queryFn: () =>
      api.getPaginated<{ id: string; prescriptionNumber: string }>('/prescriptions', { params: { status: 'ISSUED', pageSize: 100 } }),
  });
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [method, setMethod] = useState<CheckoutPayload['paymentMethod']>('UPI');
  const [savedId, setSavedId] = useState('');
  const [rxId, setRxId] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState<DeliveryAddress>({ recipient: '', phone: '', line1: '', locality: '', city: '', postalCode: '' });
  const client = useQueryClient();
  const navigate = useNavigate();
  const place = useMutation({
    mutationFn: ordersApi.place,
    onSuccess: async (order) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['cart'] }),
        client.invalidateQueries({ queryKey: ['orders'] }),
        client.invalidateQueries({ queryKey: ['checkout'] }),
      ]);
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    },
  });
  if (query.isLoading)
    return (
      <div className="container py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (!query.data) return <ErrorState onRetry={() => query.refetch()} message="We couldn't load checkout." />;
  const { cart, platformFee, addresses } = query.data;
  if (!cart.items.length || !cart.pharmacy)
    return (
      <div className="container py-12">
        <PageHeader title="Your cart is empty" />
        <Link to="/medicines" className={buttonVariants({})}>
          Browse medicines
        </Link>
      </div>
    );
  const pharmacy = cart.pharmacy;
  const mode = !pharmacy.deliveryAvailable ? 'PICKUP' : !pharmacy.pickupAvailable ? 'DELIVERY' : fulfillment;
  const deliveryFee =
    mode === 'PICKUP' || (pharmacy.freeDeliveryAbove !== null && cart.itemTotal >= pharmacy.freeDeliveryAbove)
      ? 0
      : (pharmacy.deliveryFee ?? 0);
  const fields: Array<[keyof DeliveryAddress, string]> = [
    ['recipient', 'Recipient'],
    ['phone', 'Phone'],
    ['line1', 'Address line 1'],
    ['line2', 'Address line 2 (optional)'],
    ['locality', 'Locality'],
    ['city', 'City'],
    ['postalCode', 'Postal code'],
  ];
  return (
    <div className="container py-8">
      <PageHeader title="Checkout" subtitle="Confirm your pharmacy, delivery details and demo payment." />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          place.mutate({
            fulfillmentType: mode,
            paymentMethod: method,
            ...(mode === 'DELIVERY' ? (savedId ? { addressId: savedId } : { address }) : {}),
            prescriptionId: rxId || cart.prescriptionId || undefined,
            patientNotes: notes,
          });
        }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold">Your pharmacy</h2>
            <p className="mt-2 text-lg text-primary">{pharmacy.name}</p>
            <p className="text-sm text-muted-foreground">{pharmacy.locality}</p>
            <div className="mt-4 flex gap-4">
              {(['DELIVERY', 'PICKUP'] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={mode === value}
                    disabled={value === 'DELIVERY' ? !pharmacy.deliveryAvailable : !pharmacy.pickupAvailable}
                    onChange={() => setFulfillment(value)}
                  />
                  {value === 'DELIVERY' ? 'Home delivery' : 'Store pickup'}
                </label>
              ))}
            </div>
          </section>
          {mode === 'DELIVERY' && (
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 font-semibold">Delivery address</h2>
              <label className="block text-sm">
                Saved address
                <select className="mt-1 w-full rounded-lg border p-2" value={savedId} onChange={(e) => setSavedId(e.target.value)}>
                  <option value="">Enter an address</option>
                  {addresses.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.label}: {a.line1}, {a.city}
                    </option>
                  ))}
                </select>
              </label>
              {savedId ? (
                <p className="mt-3 text-sm">
                  {addresses.find((a) => a.id === savedId)?.recipient} · {addresses.find((a) => a.id === savedId)?.phone}
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label]) => (
                    <label key={key} className="text-sm">
                      {label}
                      <Input
                        className="mt-1"
                        required={key !== 'line2'}
                        value={address[key] ?? ''}
                        pattern={key === 'postalCode' ? '[0-9]{6}' : undefined}
                        onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>
          )}
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">Prescription</h2>
            {cart.prescriptionNumber && (
              <Link className="text-sm text-primary underline" to={`/prescriptions/${cart.prescriptionId}`}>
                {cart.prescriptionNumber}
              </Link>
            )}
            <label className="mt-2 block text-sm">
              Attach an issued prescription
              <select
                className="mt-1 w-full rounded-lg border p-2"
                value={rxId || cart.prescriptionId || ''}
                onChange={(e) => setRxId(e.target.value)}
              >
                <option value="">No prescription selected</option>
                {prescriptions.data?.data.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    {rx.prescriptionNumber}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Required for prescription medicines. The pharmacy reviews your prescription before confirming.
            </p>
          </section>
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">Payment method</h2>
            <div className="flex flex-wrap gap-4">
              {(['UPI', 'CARD', 'CASH_ON_DELIVERY'] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={method === value} onChange={() => setMethod(value)} />
                  {value === 'CARD' ? 'Credit / debit card' : value === 'UPI' ? 'UPI' : 'Cash on delivery / pickup'}
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-accent p-3 text-xs">Demo payment only. No card details or money are collected.</p>
            <label className="mt-4 block text-sm">
              Order notes (optional)
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="mt-1" />
            </label>
          </section>
        </div>
        <aside>
          <div className="sticky top-24 space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold">Order summary</h2>
            {cart.items.map((item) => (
              <div key={item.medicineId} className="flex justify-between gap-3 border-b pb-3 text-sm">
                <div>
                  {item.name}
                  <p className="text-xs text-muted-foreground">
                    {item.packSize} · Qty {item.quantity}
                  </p>
                </div>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
            {[
              ['MRP', cart.subtotalMrp],
              ['Discount', -cart.discountTotal],
              ['Delivery fee', deliveryFee],
              ['Platform fee', platformFee],
              ['Total', cart.itemTotal + deliveryFee + platformFee],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span>{label}</span>
                <strong>{formatCurrency(Number(value))}</strong>
              </div>
            ))}
            {cart.hasUnavailableItems && <p className="text-sm text-destructive">Resolve stock issues in your cart first.</p>}
            {place.error && (
              <p role="alert" className="text-sm text-destructive">
                {place.error.message}
              </p>
            )}
            <Button
              className="w-full"
              type="submit"
              disabled={place.isPending || cart.hasUnavailableItems || (!pharmacy.deliveryAvailable && !pharmacy.pickupAvailable)}
            >
              {place.isPending ? 'Placing order…' : 'Place Order'}
            </Button>
            <Link to="/cart" className="block text-center text-sm text-primary">
              Back to cart
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
