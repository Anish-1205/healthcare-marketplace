import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Notifications" />
        {!!data?.data.some((n) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load your notifications." onRetry={() => refetch()} />
      ) : !data?.data.length ? (
        <EmptyState icon={Bell} title="No notifications yet" description="Appointment activity will show up here." />
      ) : (
        <div className="space-y-2">
          {data.data.map((notification) => (
            <button
              key={notification.id}
              onClick={() => {
                if (!notification.isRead) markRead.mutate(notification.id);
                if (notification.link) navigate(notification.link);
              }}
              className={cn('flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm', notification.isRead ? 'border-border bg-card' : 'border-primary/30 bg-accent/40')}
            >
              {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              <div className={cn(!notification.isRead ? '' : 'pl-5')}>
                <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const DoctorNotificationsPage = NotificationsPage;
