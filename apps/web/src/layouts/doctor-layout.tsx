import { UserMenu } from '@/components/layout/user-menu';
import { PageTransition } from '@/components/motion';
import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  User,
  Users,
  UserRound,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/doctor', icon: LayoutDashboard, end: true },
  { label: 'Appointments', href: '/doctor/appointments', icon: CalendarClock },
  { label: 'Patients', href: '/doctor/patients', icon: Users },
  { label: 'Consultations', href: '/doctor/consultations', icon: Stethoscope },
  { label: 'Prescriptions', href: '/doctor/prescriptions', icon: ClipboardList },
  { label: 'Availability', href: '/doctor/availability', icon: CalendarDays },
  { label: 'Profile', href: '/doctor/profile', icon: User },
  { label: 'Notifications', href: '/doctor/notifications', icon: Bell },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 interactive-row',
            )
          }
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ApprovalBanner() {
  const user = useCurrentUser();
  if (!user || user.doctorApprovalStatus === 'APPROVED') return null;

  const rejected = user.doctorApprovalStatus === 'REJECTED';
  return (
    <div className={cn('flex items-start gap-3 border-b px-4 py-3 text-sm sm:px-6', rejected ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-amber-200 bg-amber-50 text-amber-900')}>
      <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
      <p>
        {rejected
          ? 'Your registration was not approved. You can update your profile, but you will not appear in patient search until this is resolved. Contact support for details.'
          : "Your profile is awaiting approval from the CareBridge team. You can set up your availability and profile now, but you won't appear in patient search until you're approved."}
      </p>
    </div>
  );
}

/** Portal shell for signed-in doctors: sidebar navigation, topbar, and the pending-approval banner. */
export function DoctorLayout() {
  const user = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { data: unread } = useUnreadNotificationCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="border-t border-border p-3">
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4.5 w-4.5" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 interactive-pill" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 interactive-pill lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="flex-1 text-sm font-semibold text-foreground">Doctor Portal</p>

          <button onClick={() => navigate('/doctor/notifications')} className="relative rounded-full p-2.5 text-foreground/80 interactive-pill" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {!!unread?.count && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread.count > 9 ? '9+' : unread.count}
              </span>
            )}
          </button>

          {user && (
            <UserMenu
              displayName={`Dr. ${user.lastName}`}
              links={[
                { label: 'My Profile', href: '/doctor/profile', icon: UserRound },
                { label: 'Notifications', href: '/doctor/notifications', icon: Bell },
              ]}
            />
          )}
        </header>

        <ApprovalBanner />

        <main className="flex-1 p-4 sm:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
