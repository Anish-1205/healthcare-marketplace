import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { OrderStatus } from '@carebridge/shared';
import { Package } from 'lucide-react';
import { ordersApi } from '@/api/orders';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ORDER_LABELS, orderTime } from '@/lib/order-labels';
import { formatCurrency } from '@/lib/utils';
export function OrdersPage({ pharmacy = false }: { pharmacy?: boolean }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const query = useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => ordersApi.list(page, status || undefined),
    refetchInterval: 15_000,
  });
  return (
    <div className={pharmacy ? '' : 'container py-8'}>
      <PageHeader
        title={pharmacy ? 'Pharmacy orders' : 'My orders'}
        subtitle={
          pharmacy
            ? 'Review prescriptions, prepare medicines and manage fulfillment.'
            : 'Follow your medicines from pharmacy confirmation to your door.'
        }
      />
      <label className="mb-5 block text-sm">
        Order status
        <select
          className="ml-3 rounded-lg border bg-card p-2"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '');
            setPage(1);
          }}
        >
          <option value="">All orders</option>
          {Object.entries(ORDER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {query.isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : query.isError ? (
        <ErrorState message="Couldn't load orders." onRetry={() => query.refetch()} />
      ) : !query.data?.data.length ? (
        <EmptyState icon={Package} title="No orders yet" description="Orders will appear here after checkout." />
      ) : (
        <div className="space-y-3">
          {query.data.data.map((order) => (
            <Link
              key={order.id}
              to={`${pharmacy ? '/pharmacy' : ''}/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-soft interactive-card"
            >
              <div>
                <p className="font-semibold">{order.orderNumber}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pharmacy ? order.patient.name : order.pharmacy.name} · {orderTime(order.placedAt)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {order.items.length} medicine{order.items.length === 1 ? '' : 's'} ·{' '}
                  {order.fulfillmentType === 'PICKUP' ? 'Store pickup' : 'Home delivery'}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <Badge
                  variant={
                    order.status === 'DELIVERED'
                      ? 'success'
                      : order.status === 'REJECTED' || order.status === 'CANCELLED'
                        ? 'destructive'
                        : 'muted'
                  }
                >
                  {ORDER_LABELS[order.status]}
                </Badge>
                <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {query.data && query.data.meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm">
            {page} / {query.data.meta.totalPages}
          </span>
          <Button variant="outline" disabled={page >= query.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
